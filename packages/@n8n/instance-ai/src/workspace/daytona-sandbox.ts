import type {
	CreateSandboxBaseParams,
	CreateSandboxFromImageParams,
	CreateSandboxFromSnapshotParams,
	Daytona,
	DaytonaConfig,
	Resources,
	Sandbox,
	SandboxState,
	VolumeMount,
} from '@daytonaio/sdk';
import {
	BaseSandbox,
	type CommandResult,
	type ExecuteCommandOptions,
	type ProviderStatus,
	type SandboxInfo,
} from '@n8n/agents';
import { randomUUID } from 'node:crypto';

import { loadDaytona } from './lazy-daytona';

const SANDBOX_STATE_STARTED = 'started';
const SANDBOX_STATE_DESTROYED = 'destroyed';
const SANDBOX_STATE_DESTROYING = 'destroying';
const SANDBOX_STATE_ERROR = 'error';
const SANDBOX_STATE_BUILD_FAILED = 'build_failed';

export interface DaytonaSandboxOptions {
	id?: string;
	apiKey?: string;
	apiUrl?: string;
	target?: string;
	timeout?: number;
	createTimeoutSeconds?: number;
	language?: 'typescript' | 'javascript' | 'python';
	resources?: Resources;
	env?: Record<string, string>;
	labels?: Record<string, string>;
	snapshot?: string;
	image?: string;
	ephemeral?: boolean;
	autoStopInterval?: number;
	autoArchiveInterval?: number;
	autoDeleteInterval?: number;
	volumes?: VolumeMount[];
	name?: string;
	user?: string;
	public?: boolean;
	networkBlockAll?: boolean;
	networkAllowList?: string;
}

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[]): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}

function isAuthError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	return error instanceof DaytonaError && (error.statusCode === 401 || error.statusCode === 403);
}

export class DaytonaSandbox extends BaseSandbox {
	private static readonly DEAD_STATES: ReadonlySet<SandboxState> = new Set([
		SANDBOX_STATE_DESTROYED,
		SANDBOX_STATE_DESTROYING,
		SANDBOX_STATE_ERROR,
		SANDBOX_STATE_BUILD_FAILED,
	]) as ReadonlySet<SandboxState>;

	readonly id: string;
	readonly name = 'DaytonaSandbox';
	readonly provider = 'daytona';
	status: ProviderStatus = 'pending';

	private readonly timeout: number;
	private readonly language: 'typescript' | 'javascript' | 'python';
	private readonly createdAt = new Date();
	private readonly connection: DaytonaConfig;
	private readonly sandboxName: string;
	private daytonaClient?: Daytona;
	private sandbox?: Sandbox;
	private workingDirectory?: string;

	constructor(private readonly options: DaytonaSandboxOptions = {}) {
		super();
		this.id = options.id ?? `daytona-sandbox-${randomUUID()}`;
		this.timeout = options.timeout ?? 300_000;
		this.language = options.language ?? 'typescript';
		this.sandboxName = options.name ?? this.id;
		this.connection = {};
		if (options.apiKey !== undefined) this.connection.apiKey = options.apiKey;
		if (options.apiUrl !== undefined) this.connection.apiUrl = options.apiUrl;
		if (options.target !== undefined) this.connection.target = options.target;
	}

	get instance(): Sandbox {
		if (!this.sandbox) {
			throw new Error(`Daytona sandbox "${this.id}" is not running`);
		}
		return this.sandbox;
	}

	override async start(): Promise<void> {
		if (this.sandbox) return;

		const client = this.getDaytona();
		const existing = await this.findExistingSandbox(client);
		if (existing) {
			this.sandbox = existing;
			await this.detectWorkingDirectory();
			return;
		}

		const params = this.createSandboxParams();
		this.sandbox = this.options.createTimeoutSeconds
			? await client.create(params, { timeout: this.options.createTimeoutSeconds })
			: await client.create(params);
		await this.detectWorkingDirectory();
	}

	override async stop(): Promise<void> {
		if (!this.sandbox) return;
		await this.sandbox.stop(Math.ceil(this.timeout / 1000));
		this.sandbox = undefined;
	}

	override async destroy(): Promise<void> {
		if (this.sandbox) {
			await this.sandbox.delete(Math.ceil(this.timeout / 1000));
			this.sandbox = undefined;
			return;
		}

		try {
			const existing = await this.getDaytona().get(this.sandboxName);
			await existing.delete(Math.ceil(this.timeout / 1000));
		} catch (error) {
			const { DaytonaNotFoundError } = loadDaytona();
			if (error instanceof DaytonaNotFoundError) return;
			throw error;
		}
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		const startedAt = Date.now();
		const fullCommand = toShellCommand(command, args);
		const result = await this.instance.process.executeCommand(
			fullCommand,
			options?.cwd,
			this.compactEnv(options?.env),
			Math.ceil((options?.timeout ?? this.timeout) / 1000),
		);
		const stdout = result.artifacts?.stdout ?? result.result ?? '';
		if (stdout) options?.onStdout?.(stdout);

		return {
			command,
			args,
			success: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout,
			stderr: '',
			executionTimeMs: Date.now() - startedAt,
		};
	}

	getInfo(): SandboxInfo {
		return {
			id: this.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
			createdAt: this.createdAt,
			resources: this.sandbox
				? {
						cpuCores: this.sandbox.cpu,
						memoryMB: this.sandbox.memory * 1024,
					}
				: undefined,
			metadata: {
				language: this.language,
				workingDirectory: this.workingDirectory,
				target: this.sandbox?.target,
				remoteSandboxId: this.sandbox?.id,
			},
		};
	}

	override getInstructions(): string {
		const parts = [`Cloud sandbox with isolated execution (${this.language} runtime).`];
		if (this.workingDirectory) {
			parts.push(`Default working directory: ${this.workingDirectory}.`);
		}
		parts.push(`Command timeout: ${Math.ceil(this.timeout / 1000)}s.`);
		return parts.join(' ');
	}

	private getDaytona(): Daytona {
		if (!this.daytonaClient) {
			const { Daytona } = loadDaytona();
			this.daytonaClient = new Daytona(this.connection);
		}
		return this.daytonaClient;
	}

	private async findExistingSandbox(client: Daytona): Promise<Sandbox | null> {
		try {
			const sandbox = await client.get(this.sandboxName);
			if (sandbox.state && this.isDeadState(sandbox.state)) {
				await sandbox.delete(Math.ceil(this.timeout / 1000));
				return null;
			}
			if (sandbox.state !== SANDBOX_STATE_STARTED) {
				await sandbox.start(Math.ceil(this.timeout / 1000));
			}
			return sandbox;
		} catch (error) {
			const { DaytonaNotFoundError } = loadDaytona();
			if (error instanceof DaytonaNotFoundError) return null;
			if (isAuthError(error)) throw error;
			return null;
		}
	}

	private createSandboxParams(): CreateSandboxFromImageParams | CreateSandboxFromSnapshotParams {
		const base: CreateSandboxBaseParams = {
			language: this.language,
			labels: {
				...this.options.labels,
				'n8n-instance-ai-sandbox-id': this.id,
			},
			autoStopInterval: this.options.autoStopInterval ?? 15,
			name: this.sandboxName,
		};
		if (this.options.ephemeral !== undefined) base.ephemeral = this.options.ephemeral;
		if (this.options.autoArchiveInterval !== undefined) {
			base.autoArchiveInterval = this.options.autoArchiveInterval;
		}
		if (this.options.autoDeleteInterval !== undefined) {
			base.autoDeleteInterval = this.options.autoDeleteInterval;
		}
		if (this.options.volumes !== undefined) base.volumes = this.options.volumes;
		if (this.options.user !== undefined) base.user = this.options.user;
		if (this.options.public !== undefined) base.public = this.options.public;
		if (this.options.networkBlockAll !== undefined) {
			base.networkBlockAll = this.options.networkBlockAll;
		}
		if (this.options.networkAllowList !== undefined) {
			base.networkAllowList = this.options.networkAllowList;
		}
		if (this.options.env !== undefined) base.envVars = this.options.env;

		if (this.options.image && !this.options.snapshot) {
			return {
				...base,
				image: this.options.image,
				resources: this.options.resources,
			};
		}

		return {
			...base,
			snapshot: this.options.snapshot,
		};
	}

	private async detectWorkingDirectory(): Promise<void> {
		try {
			this.workingDirectory = await this.instance.getWorkDir();
		} catch {
			this.workingDirectory = undefined;
		}
	}

	private isDeadState(state: SandboxState): boolean {
		return DaytonaSandbox.DEAD_STATES.has(state);
	}

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
}
