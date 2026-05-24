import type {
	CommandResult,
	ExecuteCommandOptions,
	ProviderStatus,
	SandboxInfo,
} from '@n8n/agents';
import { BaseSandbox } from '@n8n/agents';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface LocalSandboxOptions {
	id?: string;
	workingDirectory?: string;
	env?: NodeJS.ProcessEnv;
	timeout?: number;
	instructions?: string;
}

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[] = []): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}

export class LocalSandbox extends BaseSandbox {
	readonly id: string;
	readonly name = 'LocalSandbox';
	readonly provider = 'local';
	status: ProviderStatus = 'pending';
	readonly workingDirectory: string;

	private readonly env?: NodeJS.ProcessEnv;
	private readonly timeout?: number;
	private readonly instructions?: string;
	private readonly createdAt = new Date();

	constructor(options: LocalSandboxOptions = {}) {
		super();
		this.id = options.id ?? `local-sandbox-${randomUUID()}`;
		this.workingDirectory = resolve(options.workingDirectory ?? './workspace');
		this.env = options.env;
		this.timeout = options.timeout;
		this.instructions = options.instructions;
	}

	override async start(): Promise<void> {
		await mkdir(this.workingDirectory, { recursive: true });
	}

	override async stop(): Promise<void> {}

	override async destroy(): Promise<void> {}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		return await this.runCommand(toShellCommand(command, args), options);
	}

	getInfo(): SandboxInfo {
		return {
			id: this.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
			createdAt: this.createdAt,
			metadata: {
				workingDirectory: this.workingDirectory,
			},
		};
	}

	override getInstructions(): string {
		return (
			this.instructions ??
			`Local sandbox executing host commands in ${this.workingDirectory}. This provider is for development only.`
		);
	}

	private async runCommand(
		command: string,
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		const startedAt = Date.now();
		const cwd = options?.cwd ?? this.workingDirectory;
		const env: NodeJS.ProcessEnv = {
			PATH: process.env.PATH,
			...this.env,
			...options?.env,
		};

		return await new Promise<CommandResult>((resolveResult, reject) => {
			const child = spawn(command, {
				shell: true,
				cwd,
				env,
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			let stdout = '';
			let stderr = '';
			let timedOut = false;
			let killed = false;

			const timeoutMs = options?.timeout ?? this.timeout;
			const timeoutHandle =
				timeoutMs === undefined
					? undefined
					: setTimeout(() => {
							timedOut = true;
							killed = child.kill('SIGTERM');
						}, timeoutMs);

			const abort = () => {
				killed = child.kill('SIGTERM');
			};
			options?.abortSignal?.addEventListener('abort', abort, { once: true });

			child.stdout.on('data', (chunk: Buffer) => {
				const text = chunk.toString('utf-8');
				stdout += text;
				options?.onStdout?.(text);
			});

			child.stderr.on('data', (chunk: Buffer) => {
				const text = chunk.toString('utf-8');
				stderr += text;
				options?.onStderr?.(text);
			});

			child.on('error', reject);

			child.on('close', (code) => {
				if (timeoutHandle) clearTimeout(timeoutHandle);
				options?.abortSignal?.removeEventListener('abort', abort);
				const exitCode = code ?? (timedOut ? 124 : 1);
				resolveResult({
					command,
					success: exitCode === 0 && !timedOut,
					exitCode,
					stdout,
					stderr,
					executionTimeMs: Date.now() - startedAt,
					timedOut,
					killed,
				});
			});
		});
	}
}
