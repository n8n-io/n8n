import type {
	CreateSandboxBaseParams,
	CreateSandboxFromImageParams,
	CreateSandboxFromSnapshotParams,
	Daytona,
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

import { DaytonaAuthManager } from './daytona-auth-manager';
import { loadDaytona } from './lazy-daytona';
import type { ErrorReporter, Logger } from '../logger';

const SANDBOX_STATE_STARTED = 'started';
const SANDBOX_STATE_DESTROYED = 'destroyed';
const SANDBOX_STATE_DESTROYING = 'destroying';
const SANDBOX_STATE_ERROR = 'error';
const SANDBOX_STATE_BUILD_FAILED = 'build_failed';

export interface DaytonaSandboxOptions {
	id?: string;
	/** Static Daytona API key (direct mode). Mutually exclusive with `getAuthToken`. */
	apiKey?: string;
	/**
	 * Per-call token resolver for proxy mode (short-lived JWT).
	 * Called proactively before token expiry to mint a fresh client.
	 * Mutually exclusive with `apiKey`.
	 */
	getAuthToken?: () => Promise<string>;
	/**
	 * Skew (ms) applied to JWT expiry. Overrides the default 5-minute refresh
	 * window. Only meaningful in proxy mode (with `getAuthToken`).
	 */
	refreshSkewMs?: number;
	/** Optional logger — token-refresh events are emitted at debug level. */
	logger?: Logger;
	apiUrl?: string;
	target?: string;
	timeout?: number;
	createTimeoutSeconds?: number;
	language?: 'typescript' | 'javascript' | 'python';
	resources?: Resources;
	env?: Record<string, string>;
	labels?: Record<string, string>;
	snapshot?: string;
	image?: CreateSandboxFromImageParams['image'];
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
	errorReporter?: ErrorReporter;
	createStrategyMode?: 'direct' | 'proxy';
}

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[]): string {
	if (args.length === 0) return command;
	return [command, ...args.map((arg) => shellEscape(arg))].join(' ');
}

function isDaytonaAuthError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	return error instanceof DaytonaError && (error.statusCode === 401 || error.statusCode === 403);
}

function isSandboxGone(error: unknown): boolean {
	const { DaytonaNotFoundError } = loadDaytona();
	return error instanceof DaytonaNotFoundError;
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
	private readonly auth: DaytonaAuthManager;
	private readonly sandboxName: string;
	private lastClientGeneration = -1;
	private sandbox?: Sandbox;
	private workingDirectory?: string;

	constructor(private readonly options: DaytonaSandboxOptions = {}) {
		super();
		this.id = options.id ?? `daytona-sandbox-${randomUUID()}`;
		this.timeout = options.timeout ?? 300_000;
		this.language = options.language ?? 'typescript';
		this.sandboxName = options.name ?? this.id;
		this.auth = new DaytonaAuthManager({
			apiUrl: options.apiUrl,
			target: options.target,
			staticApiKey: options.apiKey,
			getAuthToken: options.getAuthToken,
			refreshSkewMs: options.refreshSkewMs,
			logger: options.logger,
			sandboxName: this.sandboxName,
		});
	}

	get instance(): Sandbox {
		if (!this.sandbox) {
			throw new Error(`Daytona sandbox "${this.id}" is not running`);
		}
		return this.sandbox;
	}

	override async start(): Promise<void> {
		if (this.sandbox) return;

		const client = await this.getDaytona();
		const existing = await this.findExistingSandbox(client);
		if (existing) {
			this.sandbox = existing;
			await this.detectWorkingDirectory();
			return;
		}

		this.sandbox = await this.createSandbox(client);
		await this.detectWorkingDirectory();
	}

	override async stop(): Promise<void> {
		if (!this.sandbox) return;
		try {
			await this.ensureAuthFresh();
			await this.sandbox.stop(Math.ceil(this.timeout / 1000));
		} catch (error) {
			if (!isSandboxGone(error)) throw error;
			// Remote already gone — stop is idempotent.
		}
		this.sandbox = undefined;
	}

	override async destroy(): Promise<void> {
		try {
			if (this.sandbox) {
				await this.ensureAuthFresh();
				await this.sandbox.delete(Math.ceil(this.timeout / 1000));
			} else {
				const client = await this.getDaytona();
				const existing = await client.get(this.sandboxName);
				await existing.delete(Math.ceil(this.timeout / 1000));
			}
		} catch (error) {
			if (!isSandboxGone(error)) throw error;
			// Remote already gone — destroy is idempotent.
		}
		this.sandbox = undefined;
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		await this.ensureAuthFresh();
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

	/**
	 * Ensure the cached Daytona client + bound `Sandbox` object hold a fresh
	 * auth token. Callers that touch `this.sandbox.instance.fs`/`.process`
	 * directly (e.g. `DaytonaFilesystem`) should await this first so the bound
	 * accessors aren't stale.
	 */
	async ensureAuthFresh(): Promise<void> {
		await this.getDaytona();
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

	/**
	 * Returns the current Daytona client, refreshing the JWT proactively if needed.
	 *
	 * When the auth manager rotates the underlying client (token refresh), the cached
	 * `Sandbox` object's `.fs` / `.process` accessors are still bound to the OLD
	 * client. Refetch via `client.get()` so subsequent operations use fresh auth.
	 *
	 * Throws `DaytonaNotFoundError` if the previously cached sandbox is gone from Daytona.
	 */
	private async getDaytona(): Promise<Daytona> {
		const client = await this.auth.getClient();
		const generation = this.auth.getGeneration();
		if (this.sandbox && generation !== this.lastClientGeneration) {
			this.sandbox = await client.get(this.sandboxName);
		}
		this.lastClientGeneration = generation;
		return client;
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
			if (isDaytonaAuthError(error)) throw error;
			return null;
		}
	}

	private async createSandbox(client: Daytona): Promise<Sandbox> {
		const candidates = this.createSandboxParams();
		let lastError: unknown;

		for (const candidate of candidates) {
			try {
				return this.options.createTimeoutSeconds
					? await client.create(candidate.params, { timeout: this.options.createTimeoutSeconds })
					: await client.create(candidate.params);
			} catch (error) {
				lastError = error;
				this.reportCreateError(error, candidate.strategy);
				if (
					candidate.strategy === 'snapshot' &&
					candidates.some(({ strategy }) => strategy === 'image')
				) {
					this.options.logger?.warn('Sandbox create from snapshot failed; falling back to image', {
						snapshotName: this.options.snapshot,
						mode: this.options.createStrategyMode,
						error: error instanceof Error ? error.message : String(error),
					});
					continue;
				}
				throw error;
			}
		}

		throw lastError instanceof Error ? lastError : new Error('Failed to create Daytona sandbox');
	}

	private createSandboxParams(): Array<{
		strategy: 'snapshot' | 'image';
		params: CreateSandboxFromImageParams | CreateSandboxFromSnapshotParams;
	}> {
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

		const candidates: Array<{
			strategy: 'snapshot' | 'image';
			params: CreateSandboxFromImageParams | CreateSandboxFromSnapshotParams;
		}> = [];

		if (this.options.snapshot) {
			candidates.push({
				strategy: 'snapshot',
				params: {
					...base,
					snapshot: this.options.snapshot,
				},
			});
		}

		if (this.options.image) {
			candidates.push({
				strategy: 'image',
				params: {
					...base,
					image: this.options.image,
					resources: this.options.resources,
				},
			});
		}

		if (candidates.length > 0) return candidates;

		return [{ strategy: 'snapshot', params: { ...base, snapshot: this.options.snapshot } }];
	}

	private reportCreateError(error: unknown, strategy: 'snapshot' | 'image'): void {
		this.options.errorReporter?.error(error, {
			tags: {
				component: 'builder-sandbox-factory',
				strategy,
				...(this.options.createStrategyMode ? { mode: this.options.createStrategyMode } : {}),
			},
			extra: {
				sandboxId: this.id,
				sandboxName: this.sandboxName,
				snapshotName: this.options.snapshot,
			},
		});
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
