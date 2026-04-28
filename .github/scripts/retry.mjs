#!/usr/bin/env node
/**
 * Retry a shell command with configurable attempts and delay.
 *
 * Usage: node retry.mjs [--attempts N] [--delay N] '<command>'
 *
 * Options:
 *   --attempts N   Maximum number of attempts (default: 4)
 *   --delay N      Seconds to wait between retries (default: 15)
 *
 * The command is executed via shell, so pipes and env-var expansion work.
 * Exits 0 on first success, 1 if all attempts fail.
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);

function getFlag(name, defaultValue) {
	const index = args.indexOf(`--${name}`);
	if (index === -1 || !args[index + 1]) return defaultValue;
	const value = parseInt(args[index + 1], 10);
	if (Number.isNaN(value) || value <= 0) {
		console.error(`Error: --${name} must be a positive integer`);
		process.exit(1);
	}
	return value;
}

const attempts = getFlag('attempts', 4);
const delay = getFlag('delay', 15);

// Command is the last positional arg (skip flags and their values)
const command = args
	.filter((a, i) => {
		if (a.startsWith('--')) return false;
		if (i > 0 && args[i - 1].startsWith('--')) return false;
		return true;
	})
	.pop();

if (!command) {
	console.error("Usage: node retry.mjs [--attempts N] [--delay N] '<command>'");
	process.exit(1);
}

for (let i = 1; i <= attempts; i++) {
	try {
		execSync(command, { shell: true, stdio: 'inherit' });
		process.exit(0);
	} catch {
		if (i < attempts) {
			console.error(`Attempt ${i}/${attempts} failed, retrying in ${delay}s...`);
			execSync(`sleep ${delay}`);
		} else {
			console.error(`Attempt ${i}/${attempts} failed, no more retries.`);
		}
	}
}

process.exit(1);
