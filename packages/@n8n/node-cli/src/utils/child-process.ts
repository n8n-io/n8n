import { spawn, type SpawnOptions, type StdioOptions } from 'node:child_process';

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

export async function runCommand(
	cmd: string,
	args: string[] = [],
	opts: {
		cwd?: string;
		env?: NodeJS.ProcessEnv;
		stdio?: StdioOptions;
		context?: 'local' | 'global';
		printOutput?: (options: { stdout: Buffer[]; stderr: Buffer[] }) => void;
	} = {},
): Promise<void> {
	const packageManager = (await detectPackageManager()) ?? 'npm';

	return await new Promise((resolve, reject) => {
		const options: SpawnOptions = {
			cwd: opts.cwd,
			env: { ...process.env, ...opts.env },
			stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
			shell: process.platform === 'win32',
		};
		const child =
			opts.context === 'local'
				? spawn(packageManager, ['exec', '--', cmd, ...args], options)
				: spawn(cmd, args, options);

		const stdoutBuffers: Buffer[] = [];
		const stderrBuffers: Buffer[] = [];

		child.stdout?.on('data', (data: Buffer) => {
			stdoutBuffers.push(data);
		});
		child.stderr?.on('data', (data: Buffer) => {
			stderrBuffers.push(data);
		});

		function printOutput() {
			if (opts.printOutput) {
				opts.printOutput({ stdout: stdoutBuffers, stderr: stderrBuffers });
				return;
			}
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
			printOutput();
			if (code === 0) {
				resolve();
			} else {
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
