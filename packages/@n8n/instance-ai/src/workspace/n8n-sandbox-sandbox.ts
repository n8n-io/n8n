import { MastraSandbox } from '@mastra/core/workspace';
import type {
	CommandResult,
	ExecuteCommandOptions,
	ProviderStatus,
	SandboxInfo,
} from '@mastra/core/workspace';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { N8nSandboxClient, type DockerfileStepsBuilder } from './n8n-sandbox-client';

export interface N8nSandboxServiceSandboxOptions {
	id?: string;
	apiKey?: string;
	serviceUrl?: string;
	timeout?: number;
	dockerfile?: DockerfileStepsBuilder;
}

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[] = []): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}

/** Mastra sandbox adapter backed by the n8n sandbox service HTTP API. */
export class N8nSandboxServiceSandbox extends MastraSandbox {
	readonly name = 'N8nSandboxServiceSandbox';

	readonly provider = 'n8n-sandbox';

	status: ProviderStatus = 'pending';

	private readonly instanceId = `n8n-sandbox-${randomUUID()}`;

	private readonly client: N8nSandboxClient;

	private sandboxId?: string;

	constructor(private readonly options: N8nSandboxServiceSandboxOptions) {
		super({ name: 'N8nSandboxServiceSandbox' });
		this.client = new N8nSandboxClient({
			apiKey: options.apiKey,
			baseUrl: options.serviceUrl,
		});
		this.sandboxId = options.id;
	}

	get id(): string {
		return this.sandboxId ?? this.instanceId;
	}

	override async start(): Promise<void> {
		if (this.sandboxId) {
			await this.client.getSandbox(this.sandboxId);
			return;
		}

		const sandbox = await this.client.createSandbox({
			dockerfile: this.options.dockerfile,
		});
		this.sandboxId = sandbox.id;
	}

	override async destroy(): Promise<void> {
		if (!this.sandboxId) return;
		await this.client.deleteSandbox(this.sandboxId);
	}

	override async getInfo(): Promise<SandboxInfo> {
		await this.ensureRunning();
		const sandbox = await this.client.getSandbox(this.requireSandboxId());
		return {
			id: sandbox.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
			createdAt: new Date(sandbox.createdAt * 1000),
			lastUsedAt: new Date(sandbox.lastActiveAt * 1000),
			metadata: {
				remoteStatus: sandbox.status,
				imageId: sandbox.imageId,
				remoteProvider: sandbox.provider,
			},
		};
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		const result = await this.client.exec(this.requireSandboxId(), {
			command: toShellCommand(command, args),
			env: options?.env,
			workdir: options?.cwd,
			timeoutMs: options?.timeout ?? this.options.timeout,
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

	getClient(): N8nSandboxClient {
		return this.client;
	}

	private requireSandboxId(): string {
		assert(this.sandboxId, 'Sandbox has not been created yet');
		return this.sandboxId;
	}
}
