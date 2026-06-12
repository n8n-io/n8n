import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BaseSandbox, shellQuote } from './base-sandbox';
import type { CommandResult, ExecuteCommandOptions, LocalSandboxOptions } from '../types';

/**
 * Runs commands directly on the host via `child_process`, in a working directory.
 * No container — intended for trusted single-user setups (e.g. the desktop app)
 * where a Docker-backed sandbox service isn't available. It trades isolation for
 * zero infrastructure, so it must never be the default in a multi-tenant deployment.
 */
export class LocalSandbox extends BaseSandbox {
	readonly name = 'LocalSandbox';

	readonly provider = 'local';

	readonly id: string;

	private readonly timeout: number;

	private readonly env?: NodeJS.ProcessEnv;

	/** Resolved up-front so the paired filesystem can read it before `start()` runs. */
	private readonly workingDirectory: string;

	/** Only directories we created get removed on destroy. */
	private readonly ownsWorkingDirectory: boolean;

	constructor(options: LocalSandboxOptions = {}) {
		super();
		this.id = options.id ?? 'local-sandbox';
		this.timeout = options.timeout ?? 300_000;
		this.env = options.env;
		this.ownsWorkingDirectory = !options.workingDirectory;
		this.workingDirectory =
			options.workingDirectory ?? join(tmpdir(), `n8n-local-sandbox-${randomUUID()}`);
	}

	/** The base directory commands run in — also the filesystem root. */
	getWorkingDirectory(): string {
		return this.workingDirectory;
	}

	override async start(): Promise<void> {
		await mkdir(this.workingDirectory, { recursive: true });
	}

	override async stop(): Promise<void> {
		// Nothing to tear down between runs — the working directory persists until destroy.
	}

	override async destroy(): Promise<void> {
		if (this.ownsWorkingDirectory) {
			await rm(this.workingDirectory, { recursive: true, force: true });
		}
	}

	override getInstructions(): string {
		return [
			'Local sandbox: commands run directly on the host (no container).',
			`Default working directory: ${this.workingDirectory ?? '(pending)'}.`,
			`Command timeout: ${Math.ceil(this.timeout / 1000)}s.`,
		].join(' ');
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		const fullCommand = args.length > 0 ? `${command} ${args.map(shellQuote).join(' ')}` : command;
		const start = Date.now();

		return await new Promise<CommandResult>((resolve) => {
			const child = execFile(
				fullCommand,
				{
					shell: true,
					cwd: options?.cwd ?? this.workingDirectory,
					env: { ...process.env, ...this.env, ...options?.env },
					timeout: options?.timeout ?? this.timeout,
					signal: options?.abortSignal,
					maxBuffer: 64 * 1024 * 1024,
				},
				(error, stdout, stderr) => {
					const timedOut = Boolean(error && 'killed' in error && error.killed);
					const exitCode = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
					resolve({
						command,
						args,
						success: !error,
						exitCode,
						stdout,
						stderr,
						executionTimeMs: Date.now() - start,
						timedOut,
						killed: timedOut,
					});
				},
			);
			child.stdout?.on('data', (data: Buffer) => options?.onStdout?.(data.toString()));
			child.stderr?.on('data', (data: Buffer) => options?.onStderr?.(data.toString()));
		});
	}
}
