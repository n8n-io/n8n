/* eslint-disable no-control-regex */
import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import type { Formatter } from 'picocolors/types';

import { jsonParse } from '../../utils/json';

export function commands() {
	const childProcesses: ChildProcess[] = [];
	let isShuttingDown = false;

	const registerChild = (child: ChildProcess): void => {
		childProcesses.push(child);
	};

	const killChild = (child: ChildProcess, signal: NodeJS.Signals): void => {
		if (!child.killed) {
			child.kill(signal);
		}
	};

	const forceKillAllChildren = (): void => {
		childProcesses.forEach((child) => killChild(child, 'SIGKILL'));
		process.exit(1);
	};

	const gracefulShutdown = (signal: 'SIGINT' | 'SIGTERM'): void => {
		if (childProcesses.length === 0) {
			process.exit();
			return;
		}

		let exitedCount = 0;
		const totalChildren = childProcesses.length;

		const forceExitTimer = setTimeout(forceKillAllChildren, 5000);

		const onChildExit = () => {
			exitedCount++;
			if (exitedCount === totalChildren) {
				clearTimeout(forceExitTimer);
				process.exit();
			}
		};

		childProcesses.forEach((child) => {
			if (!child.killed) {
				child.once('exit', onChildExit);
				killChild(child, signal);

				// Escalate to SIGKILL after 5 seconds
				setTimeout(() => killChild(child, 'SIGKILL'), 5000);
			} else {
				onChildExit(); // Process already dead
			}
		});
	};

	const handleSignal = (signal: 'SIGINT' | 'SIGTERM'): void => {
		if (isShuttingDown) {
			// Second signal - force kill immediately
			console.log('\nForce killing processes...');
			forceKillAllChildren();
			return;
		}

		isShuttingDown = true;
		if (signal === 'SIGINT') {
			console.log('\nShutting down gracefully... (press Ctrl+C again to force quit)');
		}
		gracefulShutdown(signal);
	};

	process.on('SIGINT', () => handleSignal('SIGINT'));
	process.on('SIGTERM', () => handleSignal('SIGTERM'));

	const stripAnsiCodes = (input: string): string =>
		input
			.replace(/\x1Bc/g, '') // Full reset
			.replace(/\x1B\[2J/g, '') // Clear screen
			.replace(/\x1B\[3J/g, '') // Clear scrollback
			.replace(/\x1B\[H/g, '') // Move cursor to top-left
			.replace(/\x1B\[0?m/g, ''); // Reset colors

	const createLogger =
		(name?: string, color?: Formatter, allowOutput?: (line: string) => boolean) =>
		(text: string): void => {
			if (allowOutput && !allowOutput(text)) return;

			const prefix = name ? (color ? color(`[${name}]`) : `[${name}]`) : '';
			console.log(prefix ? `${prefix} ${text}` : text);
		};

	const processOutput = (data: Buffer, logger: (text: string) => void): void => {
		data
			.toString()
			.split('\n')
			.map((line) => stripAnsiCodes(line).trim())
			.filter(Boolean)
			.forEach(logger);
	};

	const runPersistentCommand = (
		cmd: string,
		args: string[],
		opts: {
			cwd?: string;
			env?: NodeJS.ProcessEnv;
			name?: string;
			color?: Formatter;
			allowOutput?: (line: string) => boolean;
		} = {},
	): ChildProcess => {
		const child = spawn(cmd, args, {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
			stdio: ['inherit', 'pipe', 'pipe'],
			shell: process.platform === 'win32',
		});

		registerChild(child);

		const logger = createLogger(opts.name, opts.color, opts.allowOutput);
		const handleOutput = (data: Buffer) => processOutput(data, logger);

		child.stdout?.on('data', handleOutput);
		child.stderr?.on('data', handleOutput);

		child.on('close', (code) => {
			if (!isShuttingDown) {
				console.log(`${opts.name ?? cmd} exited with code ${code}`);
				process.exit(code ?? 0);
			}
		});

		return child;
	};

	return {
		runPersistentCommand,
	};
}

export async function readPackageName(): Promise<string> {
	return await fs
		.readFile('package.json', 'utf-8')
		.then((packageJson) => jsonParse<{ name: string }>(packageJson)?.name ?? 'unknown');
}
