#!/usr/bin/env node
/**
 * Retry a shell command with configurable attempts and delay.
 *
 * Usage (safe):   node retry.mjs [--attempts N] [--delay N] -- <cmd> [args...]
 * Usage (legacy): node retry.mjs [--attempts N] [--delay N] '<shell command>'
 *
 * Options:
 *   --attempts N   Maximum number of attempts (default: 4)
 *   --delay N      Seconds to wait between retries (default: 15)
 *
 * The -- form passes args directly to the process (no shell, safe for untrusted input).
 * The legacy form executes via shell, so pipes and env-var expansion work but injection is possible.
 * Exits 0 on first success, 1 if all attempts fail.
 */
import { execSync, spawnSync } from 'node:child_process';

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

// Preferred form: -- cmd arg1 arg2 ...  (no shell, safe for untrusted input)
// Legacy form:    '<shell command string>'  (uses shell; kept for backwards compat)
const separatorIndex = args.indexOf('--');

let command;
let commandArgs = [];

const isSafeRetry = separatorIndex !== -1;

if (isSafeRetry) {
	[command, ...commandArgs] = args.slice(separatorIndex + 1);
} else {
	command = args
		.filter((a, i) => {
			if (a.startsWith('--')) return false;
			if (i > 0 && args[i - 1].startsWith('--')) return false;
			return true;
		})
		.pop();
}

if (!command) {
	console.error('Usage: node retry.mjs [--attempts N] [--delay N] -- <cmd> [args...]');
	process.exit(1);
}

for (let i = 1; i <= attempts; i++) {
	try {
		if (isSafeRetry) {
			const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
			if (result.status !== 0) throw new Error(`Exit code ${result.status}`);
		} else {
			execSync(command, { shell: true, stdio: 'inherit' });
		}
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
