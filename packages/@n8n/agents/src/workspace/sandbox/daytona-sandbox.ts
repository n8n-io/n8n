import type {
	CreateSandboxBaseParams,
	CreateSandboxFromImageParams,
	CreateSandboxFromSnapshotParams,
	Daytona,
	Resources,
	Sandbox,
	SandboxState,
	VolumeMount,
} from '@daytona/sdk';
import { randomUUID } from 'node:crypto';

import { isAbortError, raceWithAbort } from '../../sdk/abort';
import type {
	AbortableOptions,
	CommandResult,
	ExecuteCommandOptions,
	ProviderStatus,
	SandboxInfo,
} from '../types';
import { BaseSandbox } from './base-sandbox';
import { DaytonaAuthManager } from './daytona-auth-manager';
import { loadDaytona } from './lazy-daytona';
import type { ErrorReporter, Logger } from './logger';

const SANDBOX_STATE_STARTED = 'started';
const SANDBOX_STATE_STOPPED = 'stopped';
const SANDBOX_STATE_ARCHIVED = 'archived';
const SANDBOX_STATE_CREATING = 'creating';
const SANDBOX_STATE_RESTORING = 'restoring';
const SANDBOX_STATE_STARTING = 'starting';
const SANDBOX_STATE_PENDING_BUILD = 'pending_build';
const SANDBOX_STATE_PULLING_SNAPSHOT = 'pulling_snapshot';
const SANDBOX_STATE_FORKING = 'forking';
const SANDBOX_STATE_RESIZING = 'resizing';
const SANDBOX_STATE_SNAPSHOTTING = 'snapshotting';
const SANDBOX_STATE_BUILDING_SNAPSHOT = 'building_snapshot';
const SANDBOX_STATE_STOPPING = 'stopping';
const SANDBOX_STATE_ARCHIVING = 'archiving';
const SANDBOX_STATE_DESTROYED = 'destroyed';
const SANDBOX_STATE_DESTROYING = 'destroying';
const SANDBOX_STATE_ERROR = 'error';
const SANDBOX_STATE_BUILD_FAILED = 'build_failed';
const MAX_ACQUISITION_RETRY_BACKOFF_MS = 5_000;

/**
 * States a failed operation may recover from by resuming the sandbox: an idle sandbox that
 * Daytona auto-stopped, or one that was auto-archived. `start()` brings both back to
 * 'started'. Deliberately narrow — it excludes:
 *  - transient states (creating/starting/stopping/resizing/pending_build): a reset+restart
 *    would race the in-flight transition;
 *  - failed states (error/build_failed): those can be silently deleted and recreated, which
 *    we don't want to trigger off an unrelated operation failure.
 * Deletion is handled separately as a `DaytonaNotFoundError` fast-path.
 */
const RECOVERABLE_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_STOPPED,
	SANDBOX_STATE_ARCHIVED,
]);

const WAIT_FOR_STARTED_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_CREATING,
	SANDBOX_STATE_RESTORING,
	SANDBOX_STATE_STARTING,
	SANDBOX_STATE_PENDING_BUILD,
	SANDBOX_STATE_PULLING_SNAPSHOT,
	SANDBOX_STATE_FORKING,
	SANDBOX_STATE_RESIZING,
	SANDBOX_STATE_SNAPSHOTTING,
	SANDBOX_STATE_BUILDING_SNAPSHOT,
]);

const WAIT_FOR_RECOVERABLE_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_STOPPING,
	SANDBOX_STATE_ARCHIVING,
]);

const FAILED_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_ERROR,
	SANDBOX_STATE_BUILD_FAILED,
]);

const REMOVING_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_DESTROYED,
	SANDBOX_STATE_DESTROYING,
]);

type ExistingSandboxLookup =
	| { status: 'ready'; sandbox: Sandbox }
	| { status: 'absent' | 'pending' };

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
	/** Base backoff for sandbox acquisition retries. Defaults to 1s. */
	createRetryBackoffBaseMs?: number;
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

function isSandboxGone(error: unknown): boolean {
	const { DaytonaNotFoundError } = loadDaytona();
	return error instanceof DaytonaNotFoundError;
}

function isSandboxNameConflictError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const { DaytonaError } = loadDaytona();
	if (error instanceof DaytonaError && error.statusCode === 409) return true;
	return /sandbox with name .+ already exists/i.test(error.message);
}
export class DaytonaSandbox extends BaseSandbox {
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
	private recoveryPromise?: Promise<void>;

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

		this.sandbox = await this.createSandboxOrReattach(client);
		await this.detectWorkingDirectory();
	}

	/**
	 * Create the remote sandbox, reattaching by name on a name conflict — the sandbox
	 * exists even though the initial lookup missed it due to a concurrent create from
	 * another main. Deterministic names make reattach safe.
	 */
	private async createSandboxOrReattach(client: Daytona): Promise<Sandbox> {
		let conflictDeadline: number | undefined;
		let conflictError: unknown;
		let attempt = 0;

		while (conflictDeadline === undefined || Date.now() < conflictDeadline) {
			try {
				return await this.createSandbox(client);
			} catch (error) {
				if (!isSandboxNameConflictError(error)) throw error;
				conflictError = error;
				conflictDeadline ??= Date.now() + this.timeout;

				const existing = await this.findExistingSandboxAfterConflict(client, conflictDeadline);
				if (existing) {
					this.options.logger?.info('Sandbox name already exists; reattached to existing sandbox', {
						sandboxName: this.sandboxName,
						remoteSandboxId: existing.id,
					});
					return existing;
				}

				if (Date.now() >= conflictDeadline) break;
				await this.waitBeforeAcquisitionRetry(attempt++, conflictDeadline);
			}
		}

		throw conflictError instanceof Error
			? conflictError
			: new Error('Failed to reconcile Daytona sandbox name conflict');
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
		return await raceWithAbort(async () => {
			return await this.recoverAndRetry(async () => {
				await this.ensureRunning({ abortSignal: options?.abortSignal });
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
			});
		}, options?.abortSignal);
	}

	/**
	 * Run a filesystem operation against the live Daytona FileSystem handle, ensuring the
	 * sandbox is running with fresh auth first, and recovering once if the remote was
	 * stopped/deleted while idle. Lets `DaytonaFilesystem` reuse the same recovery as
	 * `executeCommand` without reaching into private state.
	 */
	async withFilesystem<T>(
		op: (fs: Sandbox['fs']) => Promise<T>,
		options?: AbortableOptions,
	): Promise<T> {
		return await raceWithAbort(async () => {
			return await this.recoverAndRetry(async () => {
				await this.ensureRunning({ abortSignal: options?.abortSignal });
				await this.ensureAuthFresh();
				return await op(this.instance.fs);
			});
		}, options?.abortSignal);
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

	/**
	 * Drop the in-memory handle so the next `ensureRunning()`/`start()` re-resolves the
	 * remote (resume if stopped, recreate if gone). The stale `status: 'running'` is the
	 * reason a resume is otherwise skipped after a long idle.
	 */
	private resetLocalHandle(): void {
		this.sandbox = undefined;
		this.lastClientGeneration = -1;
		this.workingDirectory = undefined;
		this.markNeedsStart();
	}

	/**
	 * Whether a failed operation can be recovered by re-resolving the remote.
	 *
	 * We don't infer "sandbox unusable" from the failed op's error code, because the code
	 * isn't a reliable signal: a stopped container returns a 400 from the toolbox, a deleted
	 * one is 404, auth is 401/403, and transport/proxy conditions vary. Instead we consult
	 * the authoritative state via the management API — which responds even when the container
	 * is stopped — and recover only when the sandbox is gone, or in an explicitly recoverable
	 * state ({@link RECOVERABLE_SANDBOX_STATES}: stopped/archived). Any other state (running,
	 * a transient transition, or a failed build) propagates the original error so we neither
	 * mask real failures nor recreate a sandbox off an unrelated error.
	 *
	 * A genuine auth failure is handled implicitly: the probe's own `get()` fails too (it
	 * uses the same credentials), so we fall through to `false` and never recreate.
	 */
	private async isRecoverable(error: unknown): Promise<boolean> {
		if (isSandboxGone(error)) return true;
		try {
			const client = await this.auth.getClient();
			const remote = await client.get(this.sandboxName);
			return remote.state !== undefined && RECOVERABLE_SANDBOX_STATES.has(remote.state);
		} catch (probeError) {
			// Gone entirely → recreate; anything else (incl. auth) → don't mask the original.
			return isSandboxGone(probeError);
		}
	}

	/**
	 * Run a sandbox operation, recovering once if the remote was stopped/archived/deleted out
	 * from under us. On a recoverable failure the sandbox is resumed (or recreated if gone) and
	 * the operation is retried exactly once; a second failure propagates.
	 *
	 * Replaying the operation is safe because recovery only triggers when the probe confirms
	 * the remote was NOT running (stopped/archived/gone — see {@link isRecoverable}). In those
	 * states the toolbox/exec request never reached a live container, so it could not have
	 * partially executed. Operations on a running sandbox are never retried — their error
	 * propagates untouched.
	 */
	private async recoverAndRetry<T>(op: () => Promise<T>): Promise<T> {
		try {
			return await op();
		} catch (error) {
			if (isAbortError(error)) throw error;
			if (!(await this.isRecoverable(error))) throw error;
			await this.recover();
			return await op();
		}
	}

	/**
	 * Reset the stale handle and bring the sandbox back to 'started'. Serialized via
	 * {@link recoveryPromise} so concurrent failed operations share a single resume/recreate
	 * rather than racing multiple start flows.
	 */
	private async recover(): Promise<void> {
		this.recoveryPromise ??= (async () => {
			this.resetLocalHandle();
			await this.ensureRunning();
		})().finally(() => {
			this.recoveryPromise = undefined;
		});
		await this.recoveryPromise;
	}

	private async findExistingSandbox(client: Daytona): Promise<Sandbox | null> {
		const result = await this.lookupExistingSandbox(client);
		return result.status === 'ready' ? result.sandbox : null;
	}

	private async lookupExistingSandbox(
		client: Daytona,
		deadline?: number,
	): Promise<ExistingSandboxLookup> {
		try {
			const sandbox = await client.get(this.sandboxName);
			const state = sandbox.state;
			if (state === undefined) return { status: 'pending' };
			if (FAILED_SANDBOX_STATES.has(state)) {
				await sandbox.delete(this.operationTimeoutSeconds(deadline));
				return { status: 'pending' };
			}
			if (REMOVING_SANDBOX_STATES.has(state)) return { status: 'pending' };
			if (RECOVERABLE_SANDBOX_STATES.has(state)) {
				await sandbox.start(this.operationTimeoutSeconds(deadline));
			} else if (WAIT_FOR_STARTED_SANDBOX_STATES.has(state)) {
				await sandbox.waitUntilStarted(this.operationTimeoutSeconds(deadline));
			} else if (
				WAIT_FOR_RECOVERABLE_SANDBOX_STATES.has(state) ||
				state !== SANDBOX_STATE_STARTED
			) {
				return { status: 'pending' };
			}
			return { status: 'ready', sandbox };
		} catch (error) {
			const { DaytonaNotFoundError } = loadDaytona();
			if (error instanceof DaytonaNotFoundError) return { status: 'absent' };
			throw error;
		}
	}

	private async findExistingSandboxAfterConflict(
		client: Daytona,
		deadline: number,
	): Promise<Sandbox | null> {
		for (let attempt = 0; Date.now() < deadline; attempt++) {
			const result = await this.lookupExistingSandbox(client, deadline);
			if (result.status === 'ready') return result.sandbox;
			if (result.status === 'absent') return null;
			await this.waitBeforeAcquisitionRetry(attempt, deadline);
		}
		return null;
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
				// A name conflict is strategy-independent; let the caller reattach by name.
				if (isSandboxNameConflictError(error)) throw error;
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

	private async waitBeforeAcquisitionRetry(attempt: number, deadline: number): Promise<void> {
		const baseDelayMs = this.options.createRetryBackoffBaseMs ?? 1_000;
		const delayMs = Math.min(
			baseDelayMs * 2 ** attempt,
			MAX_ACQUISITION_RETRY_BACKOFF_MS,
			Math.max(0, deadline - Date.now()),
		);
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
	}

	private operationTimeoutSeconds(deadline?: number): number {
		if (deadline === undefined) return Math.ceil(this.timeout / 1000);
		return Math.max(0.001, (deadline - Date.now()) / 1000);
	}

	private createSandboxParams(): Array<{
		strategy: 'snapshot' | 'image';
		params: CreateSandboxFromImageParams | CreateSandboxFromSnapshotParams;
	}> {
		const base: CreateSandboxBaseParams = {
			language: this.language,
			autoStopInterval: this.options.autoStopInterval ?? 15,
			name: this.sandboxName,
		};
		if (this.options.labels !== undefined) base.labels = this.options.labels;
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
