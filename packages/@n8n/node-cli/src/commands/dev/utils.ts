/* eslint-disable no-control-regex */
import { type ChildProcess, spawn } from 'child_process';
import { jsonParse } from 'n8n-workflow';
import fs from 'node:fs/promises';
import type { Formatter } from 'picocolors/types';

export function commands() {
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

	async function runCommand(
		cmd: string,
		args: string[],
		opts: {
			cwd?: string;
			env?: NodeJS.ProcessEnv;
		} = {},
	): Promise<void> {
		return await new Promise((resolve, reject) => {
			const child = spawn(cmd, args, {
				cwd: opts.cwd,
				env: { ...process.env, ...opts.env },
				stdio: ['inherit', 'pipe', 'pipe'],
			});

			child.on('error', (error) => {
				reject(error);
			});

			child.on('close', (code) => {
				if (code === 0) resolve();
				else reject(new Error(`${cmd} exited with code ${code}`));
			});

			registerChild(child);
		});
	}

	function runPersistentCommand(
		cmd: string,
		args: string[],
		opts: { cwd?: string; env?: NodeJS.ProcessEnv; name?: string; color?: Formatter } = {},
	): void {
		const child = spawn(cmd, args, {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
			stdio: ['inherit', 'pipe', 'pipe'],
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

	async function isN8nInstalled(): Promise<boolean> {
		try {
			await runCommand('n8n', ['--version'], {});
			return true;
		} catch {
			return false;
		}
	}

	return {
		isN8nInstalled,
		runCommand,
		runPersistentCommand,
	};
}

export async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson).name);
}
