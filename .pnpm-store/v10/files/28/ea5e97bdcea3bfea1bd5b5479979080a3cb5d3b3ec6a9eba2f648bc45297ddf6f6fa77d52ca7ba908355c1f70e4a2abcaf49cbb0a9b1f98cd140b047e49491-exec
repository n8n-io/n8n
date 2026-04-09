#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import * as ci from './ci.js';

const {
	values: options,
	positionals: [subcommand, ...args],
} = parseArgs({
	options: {
		help: { short: 'h', type: 'boolean', default: false },
	},
	allowPositionals: true,
});

if (options.help || !subcommand) {
	console.log(`Usage:
zci [-h | --help]     Show this help message
zci init              Create checks in a queued state
zci cleanup           Mark all remaining checks are completed with a neutral status
zci run <name> <cmd>  Run a command and use its exit code as the completion status
zci list              List checks`);
	process.exit();
}

switch (subcommand) {
	case 'init':
		for (const [id, name] of Object.entries(ci.checkNames)) {
			await ci.createCheck(id, name);
		}
		break;
	case 'list': {
		const max = Math.max(...Object.keys(ci.checkNames).map(id => id.length)) + 1;
		for (const [id, name] of Object.entries(ci.checkNames)) {
			console.log(id.padEnd(max), name);
		}
		break;
	}
	case 'run': {
		const [name, ...command] = args;

		await ci.startCheck(name);

		const { status } = spawnSync(command.join(' '), { shell: true, stdio: 'inherit' });

		await ci.completeCheck(name, status ? 'failure' : 'success');

		process.exit(status);
	}
	case 'cleanup': {
		for (const id of Object.keys(ci.checkNames)) {
			await ci.completeCheck(id, 'neutral');
		}
		break;
	}
	default:
		console.error('Unknown subcommand:', subcommand);
		process.exit(1);
}
