#!/usr/bin/env node

var path = require('path'); // tslint:disable-line:no-var-keyword

// Make sure that it also find the config folder when it
// did get started from another folder that the root one.
process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || path.join(__dirname, 'config');

// Check if version should be displayed
var versionFlags = [ // tslint:disable-line:no-var-keyword
	'-v',
	'-V',
	'--version'
];
if (versionFlags.includes(process.argv.slice(-1)[0])) {
	console.log(require('../package').version);
	process.exit(0);
}

if (process.argv.length === 2) {
	// When no command is given choose by default start
	process.argv.push('start');
}

var command = process.argv[2]; // tslint:disable-line:no-var-keyword

// Check if the command the user did enter is supported else stop
var supportedCommands = [ // tslint:disable-line:no-var-keyword
	'execute',
	'help',
	'start',
];

if (!supportedCommands.includes(command)) {
	console.log('\nThe command "' + command + '" is not known!\n');
	process.argv.pop();
	process.argv.push('--help');
}

if (parseInt(process.versions.node.split('.')[0], 10) < 10) {
	console.log('\nThe Node.js version is too old to run n8n. Please use version 10 or later!\n');
	process.exit(0);
}

require('@oclif/command').run()
.then(require('@oclif/command/flush'))
.catch(require('@oclif/errors/handle'));
