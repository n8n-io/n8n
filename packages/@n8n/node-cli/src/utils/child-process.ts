import { spawn, type StdioOptions } from 'node:child_process';

import { detectPackageManager } from './package-manager';

export class ChildProcessError extends Error {
	constructor(
		message: string,
		public code: number | null,
		public signal: NodeJS.Signals | null,
	) {
		super(message);
	}
}

export async function runWithDependencies(
	cmd: string,
	args: string[] = [],
	opts: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
		stdio?: StdioOptions;
	} = {},
): Promise<void> {
	const packageManager = (await detectPackageManager()) ?? 'npm';

	return await new Promise((resolve, reject) => {
		const child = spawn(packageManager, ['exec', '--', cmd, ...args], {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
			stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
		});

		const stdoutBuffers: Buffer[] = [];
		const stderrBuffers: Buffer[] = [];

		child.stdout?.on('data', (data: Buffer) => {
			stdoutBuffers.push(data);
		});
		child.stderr?.on('data', (data: Buffer) => {
			stderrBuffers.push(data);
		});

		function printOutput() {
			for (const buffer of stdoutBuffers) {
				process.stdout.write(buffer);
			}
			for (const buffer of stderrBuffers) {
				process.stderr.write(buffer);
			}
		}

		child.on('error', (error) => {
			printOutput();
			reject(new ChildProcessError(error.message, null, null));
		});

		child.on('close', (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				printOutput();
				reject(
					new ChildProcessError(
						`${cmd} exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`,
						code,
						signal,
					),
				);
			}
		});
	});
}
