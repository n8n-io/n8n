#!/usr/bin/env node

import Vorpal = require('vorpal');

if (process.argv.length === 2) {
	// When no command is given choose by default help
	process.argv.push('help');
}

const command = process.argv[2];

// Check if the command the user did enter is supported else stop
const supportedCommands = [
	'build',
	'help',
	'new',
];

if (!supportedCommands.includes(command)) {
	console.log(`The command "${command}" is not known!`);
	process.argv.push('help');
}

const vorpal = new Vorpal();
vorpal
	.use(require('./commands/build.js'))
	.use(require('./commands/new.js'))
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
