var myId = 0;
var myTeam;

var land;
var flagzoneTop;
var flagzoneBottom;
var shadow;
var team;
var tank;
var player;
var tanksList;
var logo;
var cursors;
var ready = false;
var move = false;
var left = false;
var right = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();

	eurecaClient.ready(function (proxy) {
		eurecaServer = proxy;
	});


	//methods defined under "exports" namespace become available in the server side

	eurecaClient.exports.setId = function(id, team)
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
        myTeam = team;
		create();
		eurecaServer.handshake();
		ready = true;
	}

	eurecaClient.exports.kill = function(id)
	{
		if (tanksList[id]) {
			tanksList[id].kill();
			console.log('killing ', id, tanksList[id]);
		}
	}

	eurecaClient.exports.spawnEnemy = function(i, x, y, team)
	{
		if (i == myId) return; //this is me
		console.log('Spawn %s %s %s', i, x, y);
		var tnk = new Tank(i, game, tank, team);
        tnk.tank.x = x;
        tnk.tank.y = y;
		tanksList[i] = tnk;
	}

	eurecaClient.exports.updateState = function(id, state)
	{
        if(id == myId){
            tanksList[id].cursor = state;
			tanksList[id].update();
            return;
        }
		if (tanksList[id])  {
			tanksList[id].cursor = state;
			tanksList[id].tank.x = state.x;
			tanksList[id].tank.y = state.y;
			tanksList[id].tank.angle = state.angle;
			tanksList[id].update();
		}
	}
}


Tank = function (index, game, player, team) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
	}

	this.input = {
		left:false,
		right:false,
		up:false
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.player = player;
    this.team = team;

    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy');

    if(this.team){
        this.tank.tint = 0x0000ff;
    }else{
        this.tank.tint = 0xff0000;
    }

    this.tank.scale.setTo(0.3,0.3);
    this.shadow.scale.setTo(0.7,0.7);

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);

    this.tank.id = index;
    game.physics.arcade.enable(this.tank);
    this.tank.body.drag.set(1000);
    //this.tank.body.angulardrag = 500;
    this.tank.body.maxVelocity.set(300);
    this.tank.body.collideWorldBounds = true;

    this.tank.angle = 0;
};

Tank.prototype.update = function() {

	var inputChanged = (
		this.cursor.left != this.input.left ||
		this.cursor.right != this.input.right ||
		this.cursor.up != this.input.up
	);

	if (inputChanged)
	{
		//Handle input change here
		//send new values to the server
		if (this.tank.id == myId)
		{
			// send latest valid state to the server
			this.input.x = this.tank.x;
			this.input.y = this.tank.y;
			this.input.angle = this.tank.angle;

			eurecaServer.handleKeys(this.input);
		}
	}

	//cursor value is now updated by eurecaClient.exports.updateState method

    if (this.cursor.left)
    {
        this.tank.angle -= 3;
        //game.physics.arcade.accelerationFromRotation(this.tank.rotation, this.tank.body.speed, this.tank.body.velocity);
    }
    else if (this.cursor.right)
    {
        this.tank.angle += 3;
        //game.physics.arcade.accelerationFromRotation(this.tank.rotation, this.tank.body.speed, this.tank.body.velocity);
    }

    if (this.cursor.up)
    {
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 1000, this.tank.body.acceleration);
    } else{
        game.physics.arcade.accelerationFromRotation(this.tank.rotation, 0, this.tank.body.acceleration);
    }

    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;
};

Tank.prototype.kill = function() {
	this.alive = false;
	this.tank.kill();
	this.shadow.kill();
};

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {
    //game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    //game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('enemy', 'assets/RD2.png');
    game.load.image('shadow', 'assets/shadow.png')
    //game.load.image('logo', 'assets/logo.png');
    game.load.image('earth', 'assets/dark_grass.png');
    game.load.image('flagzone', 'assets/scorched_earth.png')
    game.load.spritesheet('buttonfire', 'assets/button-round.png',96,96);
    game.load.spritesheet('buttonhorizontal', 'assets/button-horizontal.png',96,64);
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
}

function create () {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);
	game.stage.disableVisibilityChange  = true;

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 800, 600, 'earth');
    flagzoneTop = game.add.tileSprite(-1000,-1000,2000,200,'flagzone');
    flagzoneBottom = game.add.tileSprite(-1000,800,2000,200,'flagzone');

    land.fixedToCamera = true;

    tanksList = {};

	player = new Tank(myId, game, tank, myTeam);
	tanksList[myId] = player;
	tank = player.tank;
	tank.x = 0;
	tank.y = 0;
    tank.team = myTeam;
	shadow = player.shadow;

    tank.bringToTop();

    // Virtual Joystick
    buttonfire = game.add.button(670, 470, 'buttonfire', null, this, 0, 1, 0, 1);
    buttonfire.fixedToCamera = true;
    buttonfire.events.onInputOut.add(function(){player.move=false;});
    buttonfire.events.onInputDown.add(function(){player.move=true;});
    buttonfire.events.onInputUp.add(function(){player.move=false;});

    buttonleft = game.add.button(20, 490, 'buttonhorizontal', null, this, 0, 1, 0, 1);
    buttonleft.fixedToCamera = true;
    buttonleft.events.onInputOut.add(function(){player.left=false;});
    buttonleft.events.onInputDown.add(function(){player.left=true;});
    buttonleft.events.onInputUp.add(function(){player.left=false;});

    buttonright = game.add.button(140, 490, 'buttonhorizontal', null, this, 0, 1, 0, 1);
    buttonright.fixedToCamera = true;
    buttonright.events.onInputOut.add(function(){player.right=false;});
    buttonright.events.onInputDown.add(function(){player.right=true;});
    buttonright.events.onInputUp.add(function(){player.right=false;});

    //logo = game.add.sprite(0, 200, 'logo');
    //logo.fixedToCamera = true;

    //game.input.onDown.add(removeLogo, this);

    game.camera.follow(tank);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();

	//setTimeout(removeLogo, 1000);
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;

	player.input.left = cursors.left.isDown || player.left;
	player.input.right = cursors.right.isDown || player.right;
	player.input.up = cursors.up.isDown || player.move;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    for (var i in tanksList){
        var curTank = tanksList[i];
        if(curTank.id == myId) continue;
        if(curTank.alive){
            game.physics.arcade.collide(player.tank, curTank.tank);
            curTank.update();
        }
    }
}

function render () {}
