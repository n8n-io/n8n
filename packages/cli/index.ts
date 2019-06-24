#!/usr/bin/env node

import { join as pathJoin } from 'path';

// Make sure that it also find the config folder when it
// did get started from another folder that the root one.
process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || pathJoin(__dirname, 'config');

import Vorpal = require('vorpal');
import { GenericHelpers } from './src';

// Check if version should be displayed
const versionFlags = [
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

const command = process.argv[2];

// Check if the command the user did enter is supported else stop
const supportedCommands = [
	'execute',
	'help',
	'start',
];

if (!supportedCommands.includes(command)) {
	GenericHelpers.logOutput(`The command "${command}" is not known!`);
	process.argv.push('help');
}

const vorpal = new Vorpal();
vorpal
	.use(require('./commands/execute.js'))
	.use(require('./commands/start.js'))
	.delimiter('')
	.show()
	.parse(process.argv);


process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});
