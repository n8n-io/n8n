import { intro } from '@clack/prompts';
import { Command } from '@oclif/core';
import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { detectPackageManager } from '../utils';

export default class Dev extends Command {
	static override description = 'Build an n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Dev);

		intro('n8n-node dev');

		const packageManager = detectPackageManager();

		// Check n8n is installed
		const installed = await isN8nInstalled();
		if (!installed) {
			console.error('❌ n8n is not installed or not in PATH.');
			process.exit(1);
		}

		await runCommand(packageManager, ['link']);

		const customPath = path.join(os.homedir(), '.n8n/custom');

		await ensureFolder(customPath);

		await runCommand(packageManager, ['link', await readPackageName()], { cwd: customPath });

		// Run n8n with reload enabled
		runPersistentCommand('n8n', [], {
			cwd: customPath,
			env: { N8N_DEV_RELOAD: 'true' },
			name: 'n8n',
		});
		// Run `tsc --watch` in background
		runPersistentCommand('tsc', ['--watch'], {
			name: 'tsc --watch',
		});
	}
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
			stdio: 'inherit',
			shell: true,
		});

		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} exited with code ${code}`));
		});
	});
}

function runPersistentCommand(
	cmd: string,
	args: string[],
	opts: { cwd?: string; env?: NodeJS.ProcessEnv; name?: string } = {},
): void {
	const child = spawn(cmd, args, {
		cwd: opts.cwd,
		env: { ...process.env, ...opts.env },
		stdio: 'inherit',
		shell: true,
	});

	child.on('close', (code) => {
		console.log(`${opts.name ?? cmd} exited with code ${code}`);
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
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		.then((packageJson) => (JSON.parse(packageJson) as { name: string }).name);
}
