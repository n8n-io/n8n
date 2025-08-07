/* eslint-disable no-control-regex */
import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import { jsonParse } from 'n8n-workflow';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';
import type { Formatter } from 'picocolors/types';

import { copyStaticFiles } from './build';
import { detectPackageManager } from '../utils/package-manager';

export default class Dev extends Command {
	static override description = 'Develop your n8n node with live preview directly in the browser.';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {
		'external-n8n': Flags.boolean({
			default: false,
			description:
				'By default n8n-node dev will run n8n in a sub process. Enable this option if you would like to run n8n elsewhere.',
		}),
		'custom-nodes-dir': Flags.directory({
			default: path.join(os.homedir(), '.n8n/custom'),
			description:
				'Where to link your custom node. By default it will link to ~/.n8n/custom. You probably want to enable this option if you run n8n with a custom N8N_CUSTOM_EXTENSIONS env variable.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		const packageManager = detectPackageManager() ?? 'npm';

		const installed = await isN8nInstalled();
		if (!installed && !flags['external-n8n']) {
			console.error(
				'❌ n8n is not installed or not in PATH. Learn how to install n8n here: https://docs.n8n.io/hosting/installation/npm',
			);
			process.exit(1);
		}

		await copyStaticFiles();

		await runCommand(packageManager, ['link']);

		const customPath = flags['custom-nodes-dir'];

		await ensureFolder(customPath);

		await runCommand(packageManager, ['link', await readPackageName()], { cwd: customPath });

		if (!flags['external-n8n']) {
			// Run n8n with reload enabled
			runPersistentCommand('n8n', [], {
				cwd: customPath,
				env: { N8N_DEV_RELOAD: 'true' },
				name: 'n8n',
				color: picocolors.green,
			});
		}

		// Run `tsc --watch` in background
		runPersistentCommand('tsc', ['--watch'], {
			name: 'build',
			color: picocolors.cyan,
		});
	}
}

const childProcesses: ChildProcess[] = [];

function registerChild(child: ChildProcess) {
	childProcesses.push(child);
}

function cleanup(signal: 'SIGINT' | 'SIGTERM') {
	for (const child of childProcesses) {
		child.kill(signal);
	}
	process.exit();
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

function runPersistentCommand(
	cmd: string,
	args: string[],
	opts: { cwd?: string; env?: NodeJS.ProcessEnv; name?: string; color?: Formatter } = {},
): void {
	const child = spawn(cmd, args, {
		cwd: opts.cwd,
		env: { ...process.env, ...opts.env },
		stdio: ['inherit', 'pipe', 'pipe'],
		shell: true,
	});

	registerChild(child);

	function stripClearCodes(input: string): string {
		// Remove clear screen/reset ANSI codes
		return input
			.replace(/\x1Bc/g, '') // Full reset
			.replace(/\x1B\[2J/g, '') // Clear screen
			.replace(/\x1B\[3J/g, '') // Clear scrollback
			.replace(/\x1B\[H/g, '') // Move cursor to top-left
			.replace(/\x1B\[0?m/g, ''); // Reset colors
	}

	const log = (text: string) => {
		if (opts.name) {
			const rawPrefix = `[${opts.name}]`;
			const prefix = opts.color ? opts.color(rawPrefix) : rawPrefix;
			console.log(`${prefix} ${text}`);
		} else {
			console.log(text);
		}
	};

	const handleOutput = (data: Buffer): void => {
		data
			.toString()
			.split('\n')
			.map((line) => stripClearCodes(line).trim())
			.filter(Boolean)
			.forEach((line) => log(line));
	};

	child.stdout.on('data', handleOutput);
	child.stderr.on('data', handleOutput);

	child.on('close', (code) => {
		console.log(`${opts.name ?? cmd} exited with code ${code}`);
		process.exit(code);
	});
}

async function runCommand(
	cmd: string,
	args: string[],
	opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
	return await new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
			stdio: ['inherit', 'pipe', 'pipe'],
			shell: true,
		});

		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} exited with code ${code}`));
		});
	});
}

async function isN8nInstalled(): Promise<boolean> {
	try {
		await runCommand('n8n', ['--version'], {});
		return true;
	} catch {
		return false;
	}
}

async function ensureFolder(dir: string) {
	return await fs.mkdir(dir, { recursive: true });
}

async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson).name);
}
