import { intro } from '@clack/prompts';
import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { detectPackageManager } from '../utils';

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

		intro('n8n-node dev');

		const packageManager = detectPackageManager() ?? 'npm';

		// Check n8n is installed
		const installed = await isN8nInstalled();
		if (!installed && !flags['external-n8n']) {
			console.error('❌ n8n is not installed or not in PATH.');
			process.exit(1);
		}

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
			});
		}

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
