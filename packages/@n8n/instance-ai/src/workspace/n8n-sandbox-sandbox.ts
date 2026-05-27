import type {
	CommandResult,
	ExecuteCommandOptions,
	ProviderStatus,
	SandboxInfo,
} from '@n8n/agents';
import { BaseSandbox } from '@n8n/agents';
import { SandboxClient, SandboxServiceError, type SandboxRecord } from '@n8n/sandbox-client';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export interface N8nSandboxServiceSandboxOptions {
	id?: string;
	apiKey?: string;
	serviceUrl?: string;
	timeout?: number;
	env?: Record<string, string>;
}

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[] = []): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}

/** Native agents sandbox adapter backed by the n8n sandbox service HTTP API. */
export class N8nSandboxServiceSandbox extends BaseSandbox {
	readonly name = 'N8nSandboxServiceSandbox';

	readonly provider = 'n8n-sandbox';

	status: ProviderStatus = 'pending';

	private readonly instanceId = `n8n-sandbox-${randomUUID()}`;

	private readonly client: SandboxClient;

	private readonly timeout: number;

	private static readonly HOME_DIR = '/home/user';

	private static readonly WORKSPACE_DIR = `${N8nSandboxServiceSandbox.HOME_DIR}/workspace`;

	private sandboxId?: string;

	private createdAt?: Date;

	constructor(private readonly options: N8nSandboxServiceSandboxOptions) {
		super();
		this.client = new SandboxClient({
			apiKey: options.apiKey,
			baseUrl: options.serviceUrl,
		});
		this.sandboxId = options.id;
		this.timeout = options.timeout ?? 300_000;
	}

	get id(): string {
		return this.sandboxId ?? this.instanceId;
	}

	override async start(): Promise<void> {
		if (this.sandboxId) {
			const existing = await this.tryGetExistingSandbox(this.sandboxId);
			if (existing) {
				this.createdAt = new Date(existing.createdAt * 1000);
				return;
			}
		}

		const sandbox = await this.client.createSandbox();
		this.sandboxId = sandbox.id;
		this.createdAt = new Date();
	}

	override async destroy(): Promise<void> {
		if (!this.sandboxId) return;
		try {
			await this.client.deleteSandbox(this.sandboxId);
		} catch (error) {
			if (error instanceof SandboxServiceError && error.status === 404) return;
			throw error;
		}
	}

	override async stop(): Promise<void> {
		// The remote service only supports create/delete today. Keep stop as a
		// local lifecycle transition so BaseSandbox can manage status correctly.
	}

	async getInfo(): Promise<SandboxInfo> {
		await this.ensureRunning();
		const sandbox = await this.client.getSandbox(this.requireSandboxId());
		return {
			id: sandbox.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
			createdAt: this.createdAt ?? new Date(sandbox.createdAt * 1000),
			metadata: {
				lastActiveAt: new Date(sandbox.lastActiveAt * 1000).toISOString(),
				remoteStatus: sandbox.status,
				workingDirectory: N8nSandboxServiceSandbox.WORKSPACE_DIR,
			},
		};
	}

	override getInstructions(): string {
		return [
			'Cloud sandbox with isolated execution (TypeScript runtime).',
			`Default working directory: ${N8nSandboxServiceSandbox.WORKSPACE_DIR}.`,
			`Command timeout: ${Math.ceil(this.timeout / 1000)}s.`,
		].join(' ');
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		const result = await this.client.exec(this.requireSandboxId(), {
			command: toShellCommand(command, args),
			env: this.compactEnv(options?.env),
			workdir: options?.cwd,
			timeoutMs: options?.timeout ?? this.timeout,
			abortSignal: options?.abortSignal,
			onStdout: options?.onStdout,
			onStderr: options?.onStderr,
		});

		return {
			command,
			args,
			success: result.success,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			executionTimeMs: result.executionTimeMs,
			timedOut: result.timedOut,
			killed: result.killed,
		};
	}

	getClient(): SandboxClient {
		return this.client;
	}

	/** Returns the remote sandbox record, or `null` if it no longer exists (404). */
	private async tryGetExistingSandbox(sandboxId: string): Promise<SandboxRecord | null> {
		try {
			return await this.client.getSandbox(sandboxId);
		} catch (error) {
			if (error instanceof SandboxServiceError && error.status === 404) return null;
			throw error;
		}
	}

	/** Merges constructor-level env with per-command env, filtering out undefined values. */
	private compactEnv(env: NodeJS.ProcessEnv | undefined): Record<string, string> | undefined {
		const merged = {
			...this.options.env,
			...env,
		};
		const entries = Object.entries(merged).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		);
		return entries.length > 0 ? Object.fromEntries(entries) : undefined;
	}

	private requireSandboxId(): string {
		assert(this.sandboxId, 'Sandbox has not been created yet');
		return this.sandboxId;
	}
}
