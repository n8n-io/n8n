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
import { SandboxAcquisitionError, SandboxNameConflictError, SandboxNotReadyError } from './errors';
import { loadDaytona } from './lazy-daytona';
import type { ErrorReporter, Logger } from './logger';
import { toShellCommand } from './shell-command';

const SANDBOX_STATE_STARTED = 'started';
const SANDBOX_STATE_STOPPED = 'stopped';
const SANDBOX_STATE_PAUSED = 'paused';
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
const SANDBOX_STATE_PAUSING = 'pausing';
const SANDBOX_STATE_ARCHIVING = 'archiving';
const SANDBOX_STATE_DESTROYED = 'destroyed';
const SANDBOX_STATE_DESTROYING = 'destroying';
const SANDBOX_STATE_ERROR = 'error';
const SANDBOX_STATE_BUILD_FAILED = 'build_failed';
const MAX_ACQUISITION_RETRY_BACKOFF_MS = 5_000;
/** Extra attempts (beyond the first) for a control-plane call that failed transiently. */
const MAX_TRANSIENT_ACQUISITION_RETRIES = 2;
/**
 * Consecutive create-conflict → lookup-absent cycles tolerated before concluding the
 * conflicting sandbox is invisible to this client and no amount of retrying will help.
 */
const MAX_CONSECUTIVE_ABSENT_CONFLICTS = 3;
/** Floor for a single wait on a sandbox state transition, regardless of remaining budget. */
const MIN_STATE_WAIT_SECONDS = 30;
const TRANSIENT_HTTP_STATUS_CODES = new Set([408, 429]);
const SNAPSHOT_ACTIVATION_POLL_MS = 5_000;

/**
 * States a failed operation may recover from by resuming the sandbox: an idle sandbox that
 * Daytona auto-stopped, auto-paused, or auto-archived. `start()` brings each back to
 * 'started'. Deliberately narrow — it excludes:
 *  - transient states (creating/starting/stopping/pausing/resizing/pending_build): a reset+restart
 *    would race the in-flight transition;
 *  - failed states (error/build_failed): those can be silently deleted and recreated, which
 *    we don't want to trigger off an unrelated operation failure.
 * Deletion is handled separately as a `DaytonaNotFoundError` fast-path.
 */
const RECOVERABLE_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_STOPPED,
	SANDBOX_STATE_PAUSED,
	SANDBOX_STATE_ARCHIVED,
]);

/**
 * Transitional states of a sandbox being provisioned for the first time. No user workspace
 * state exists yet, so one that never becomes ready can be safely deleted and recreated.
 */
const PROVISIONING_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_CREATING,
	SANDBOX_STATE_PENDING_BUILD,
	SANDBOX_STATE_PULLING_SNAPSHOT,
	SANDBOX_STATE_BUILDING_SNAPSHOT,
]);

/**
 * Transitional states of a sandbox that already carries workspace state (resuming from
 * stopped, restoring from archive, resizing, snapshotting, forking). Never deleted on a
 * wait timeout — losing the wait must not lose the thread's files.
 */
const STATEFUL_TRANSITION_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_RESTORING,
	SANDBOX_STATE_STARTING,
	SANDBOX_STATE_FORKING,
	SANDBOX_STATE_RESIZING,
	SANDBOX_STATE_SNAPSHOTTING,
]);

const WAIT_FOR_RECOVERABLE_SANDBOX_STATES = new Set<SandboxState>([
	SANDBOX_STATE_STOPPING,
	SANDBOX_STATE_PAUSING,
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

type ConflictLookupResult = ExistingSandboxLookup | { status: 'timeout' };

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

/**
 * Whether a Daytona control-plane failure is worth retrying during acquisition: server/gateway
 * errors, request timeouts, rate limits, and dropped connections. Auth (401/403), validation
 * (400), not-found (404), and conflict (409) are deterministic — retrying can't change them.
 */
function isTransientAcquisitionError(error: unknown): boolean {
	const { DaytonaError, DaytonaNotFoundError, DaytonaConnectionError, DaytonaTimeoutError } =
		loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error instanceof DaytonaNotFoundError) return false;
	if (error instanceof DaytonaConnectionError || error instanceof DaytonaTimeoutError) {
		return true;
	}
	return (
		error.statusCode !== undefined &&
		(error.statusCode >= 500 || TRANSIENT_HTTP_STATUS_CODES.has(error.statusCode))
	);
}

/**
 * Daytona auto-deactivates snapshots after a period of non-use and rejects creates
 * that reference them with a validation error. The message is the only signal —
 * there is no dedicated error class or code.
 */
function isInactiveSnapshotError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	return error instanceof DaytonaError && /snapshot .+ is inactive/i.test(error.message);
}

function acquisitionFailureClass(error: unknown): string {
	if (!(error instanceof Error)) return typeof error;
	const { DaytonaError } = loadDaytona();
	if (error instanceof DaytonaError && error.statusCode !== undefined) {
		return `${error.constructor.name}:${error.statusCode}`;
	}
	return error.constructor.name;
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
	/**
	 * Whether this instance ever successfully created or attached to the remote sandbox.
	 * Gates the by-name delete in {@link destroy}: a failed start() must not delete a
	 * same-named sandbox another process owns.
	 */
	private remoteAcquired = false;

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

		// One budget for the entire acquisition (lookup, waits, creates, conflict reconcile),
		// so no single stuck operation can consume the whole turn.
		const deadline = Date.now() + this.timeout;
		try {
			const client = await this.getDaytona();
			const existing = await this.findExistingSandbox(client, deadline);
			this.sandbox = existing ?? (await this.createSandboxOrReattach(client, deadline));
			this.remoteAcquired = true;
		} catch (error) {
			throw this.toAcquisitionError(error);
		}
		await this.detectWorkingDirectory();
	}

	/**
	 * Wrap Daytona SDK failures so acquisition surfaces one classified error type instead of
	 * raw SDK errors. Aborts, already-classified errors, and non-SDK errors pass through.
	 */
	private toAcquisitionError(error: unknown): unknown {
		if (isAbortError(error) || error instanceof SandboxAcquisitionError) return error;
		const { DaytonaError } = loadDaytona();
		if (!(error instanceof DaytonaError)) return error;
		const failureClass = acquisitionFailureClass(error);
		this.options.logger?.warn('Daytona sandbox acquisition failed', {
			sandboxName: this.sandboxName,
			failureClass,
			error: error.message,
		});
		return new SandboxAcquisitionError(
			`Failed to acquire Daytona sandbox: ${error.message}`,
			failureClass,
			{ cause: error },
		);
	}

	/**
	 * Create the remote sandbox, reattaching by name on a name conflict — the sandbox
	 * exists even though the initial lookup missed it due to a concurrent create from
	 * another main. Deterministic names make reattach safe.
	 */
	private async createSandboxOrReattach(client: Daytona, deadline: number): Promise<Sandbox> {
		let conflictError: unknown;
		let attempt = 0;
		let consecutiveAbsent = 0;

		do {
			try {
				return await this.createSandbox(client, deadline);
			} catch (error) {
				if (!isSandboxNameConflictError(error)) throw error;
				conflictError = error;

				const existing = await this.findExistingSandboxAfterConflict(client, deadline);
				if (existing.status === 'ready') {
					this.options.logger?.info('Sandbox name already exists; reattached to existing sandbox', {
						sandboxName: this.sandboxName,
						remoteSandboxId: existing.sandbox.id,
					});
					return existing.sandbox;
				}
				if (existing.status === 'absent') {
					// Create keeps conflicting while the lookup keeps missing: the conflicting
					// sandbox is invisible to this client (e.g. ownership-scoped in proxy mode).
					// That cannot resolve itself, so fail fast instead of burning the budget.
					consecutiveAbsent++;
					if (consecutiveAbsent >= MAX_CONSECUTIVE_ABSENT_CONFLICTS) {
						throw new SandboxNameConflictError(
							`Sandbox name "${this.sandboxName}" conflicts with a sandbox this client cannot see (${consecutiveAbsent} consecutive attempts)`,
							{ cause: conflictError },
						);
					}
				} else {
					consecutiveAbsent = 0;
				}

				if (Date.now() >= deadline) break;
				await this.waitBeforeAcquisitionRetry(attempt++, deadline);
			}
		} while (Date.now() < deadline);

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
			} else if (this.remoteAcquired) {
				// Handle lost after a stop()/recovery reset, but the remote was acquired by
				// this instance — resolve by name and delete it.
				await this.deleteRemoteByName();
			}
			// Never acquired: skip the by-name delete. Cleanup after a failed start() must
			// not destroy a live sandbox this instance never owned but shares a name with.
		} catch (error) {
			if (!isSandboxGone(error)) throw error;
			// Remote already gone — destroy is idempotent.
		}
		this.sandbox = undefined;
	}

	/**
	 * Delete the remote sandbox carrying this instance's name, whether or not this instance
	 * created it. For explicit teardown paths (thread/agent deletion); lifecycle cleanup goes
	 * through {@link destroy}, which only deletes a remote this instance acquired.
	 */
	override async deleteRemote(): Promise<void> {
		try {
			if (this.sandbox) {
				await this.ensureAuthFresh();
				await this.sandbox.delete(Math.ceil(this.timeout / 1000));
			} else {
				await this.deleteRemoteByName();
			}
		} catch (error) {
			if (!isSandboxGone(error)) throw error;
		}
		this.sandbox = undefined;
	}

	private async deleteRemoteByName(): Promise<void> {
		const client = await this.getDaytona();
		const existing = await client.get(this.sandboxName);
		await existing.delete(Math.ceil(this.timeout / 1000));
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
	 * state ({@link RECOVERABLE_SANDBOX_STATES}: stopped/paused/archived). Any other state
	 * (running, a transient transition, or a failed build) propagates the original error so we
	 * neither mask real failures nor recreate a sandbox off an unrelated error.
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
	 * Run a sandbox operation, recovering once if the remote was stopped, paused, archived, or
	 * deleted out from under us. On a recoverable failure the sandbox is resumed (or recreated if
	 * gone) and the operation is retried exactly once; a second failure propagates.
	 *
	 * Replaying the operation is safe because recovery only triggers when the probe confirms
	 * the remote was NOT running (stopped/paused/archived/gone — see {@link isRecoverable}). In those
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

	private async findExistingSandbox(client: Daytona, deadline: number): Promise<Sandbox | null> {
		const result = await this.lookupExistingSandbox(client, deadline);
		return result.status === 'ready' ? result.sandbox : null;
	}

	private async lookupExistingSandbox(
		client: Daytona,
		deadline: number,
	): Promise<ExistingSandboxLookup> {
		try {
			const sandbox = await this.withTransientRetry(
				'lookup',
				deadline,
				async () => await client.get(this.sandboxName),
			);
			const state = sandbox.state;
			if (state === undefined) return { status: 'pending' };
			if (FAILED_SANDBOX_STATES.has(state)) {
				await sandbox.delete(this.operationTimeoutSeconds(deadline));
				return { status: 'pending' };
			}
			if (REMOVING_SANDBOX_STATES.has(state)) return { status: 'pending' };
			if (
				RECOVERABLE_SANDBOX_STATES.has(state) ||
				PROVISIONING_SANDBOX_STATES.has(state) ||
				STATEFUL_TRANSITION_SANDBOX_STATES.has(state)
			) {
				if (!(await this.bringToStarted(sandbox, state, deadline))) return { status: 'pending' };
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

	/**
	 * Drive an existing sandbox toward 'started': resume a stopped, paused, or archived one, or wait
	 * out a transitional state. A single wait is capped at half the remaining acquisition budget so
	 * a sandbox that never becomes ready can't consume the whole timeout. On a wait timeout:
	 *  - a provisioning sandbox ({@link PROVISIONING_SANDBOX_STATES}: no workspace state yet)
	 *    is treated as wedged and deleted so the caller can create a fresh one with the rest
	 *    of the budget;
	 *  - a sandbox that carries workspace state (resuming, or one of
	 *    {@link STATEFUL_TRANSITION_SANDBOX_STATES}) is kept and the acquisition fails with a
	 *    classified error instead — deleting it would lose the thread's files.
	 */
	private async bringToStarted(
		sandbox: Sandbox,
		state: SandboxState,
		deadline: number,
	): Promise<boolean> {
		const remainingSeconds = this.operationTimeoutSeconds(deadline);
		const waitSeconds = Math.max(
			remainingSeconds / 2,
			Math.min(remainingSeconds, MIN_STATE_WAIT_SECONDS),
		);
		const resuming = RECOVERABLE_SANDBOX_STATES.has(state);
		try {
			if (resuming) {
				await sandbox.start(waitSeconds);
			} else {
				await sandbox.waitUntilStarted(waitSeconds);
			}
			return true;
		} catch (error) {
			const { DaytonaTimeoutError } = loadDaytona();
			if (!(error instanceof DaytonaTimeoutError)) throw error;
			if (PROVISIONING_SANDBOX_STATES.has(state)) {
				this.options.logger?.warn(
					'Daytona sandbox is stuck in a transitional state; deleting it so a fresh one can be created',
					{ sandboxName: this.sandboxName, state, waitSeconds },
				);
				await sandbox.delete(this.operationTimeoutSeconds(deadline));
				return false;
			}
			this.options.logger?.warn(
				'Daytona sandbox did not become ready in time; keeping it and failing the acquisition',
				{ sandboxName: this.sandboxName, state, waitSeconds },
			);
			throw new SandboxNotReadyError(
				`Daytona sandbox "${this.sandboxName}" did not become ready within the acquisition budget (state: ${state})`,
				{ cause: error },
			);
		}
	}

	private async findExistingSandboxAfterConflict(
		client: Daytona,
		deadline: number,
	): Promise<ConflictLookupResult> {
		for (let attempt = 0; Date.now() < deadline; attempt++) {
			const result = await this.lookupExistingSandbox(client, deadline);
			if (result.status !== 'pending') return result;
			await this.waitBeforeAcquisitionRetry(attempt, deadline);
		}
		return { status: 'timeout' };
	}

	/**
	 * Run a Daytona control-plane call, retrying a bounded number of times on transient
	 * failures (5xx, 408, 429, connection drops, request timeouts) with capped backoff.
	 */
	private async withTransientRetry<T>(
		opName: 'lookup' | 'create',
		deadline: number,
		op: () => Promise<T>,
	): Promise<T> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await op();
			} catch (error) {
				const retriable =
					attempt < MAX_TRANSIENT_ACQUISITION_RETRIES &&
					isTransientAcquisitionError(error) &&
					Date.now() < deadline;
				if (!retriable) throw error;
				this.options.logger?.warn(`Retrying Daytona sandbox ${opName} after a transient error`, {
					sandboxName: this.sandboxName,
					failureClass: acquisitionFailureClass(error),
					attempt: attempt + 1,
				});
				await this.waitBeforeAcquisitionRetry(attempt, deadline);
				// Backoff may have consumed the budget — don't start an attempt we can't finish.
				if (Date.now() >= deadline) throw error;
			}
		}
	}

	private async createSandbox(client: Daytona, deadline: number): Promise<Sandbox> {
		const candidates = this.createSandboxParams();
		let lastError: unknown;

		for (const candidate of candidates) {
			let activatedSnapshot = false;
			for (;;) {
				try {
					return await this.withTransientRetry(
						'create',
						deadline,
						async () =>
							await client.create(candidate.params, {
								timeout: this.createTimeoutSeconds(deadline),
							}),
					);
				} catch (error) {
					// A name conflict is strategy-independent; let the caller reattach by name.
					if (isSandboxNameConflictError(error)) throw error;
					// Daytona deactivated the referenced snapshot while it sat idle. It still
					// exists, so reactivate it and retry — otherwise every run pinned to this
					// version stays down until someone reactivates it manually.
					if (
						candidate.strategy === 'snapshot' &&
						!activatedSnapshot &&
						isInactiveSnapshotError(error) &&
						(await this.activateSnapshotAndWait(client, deadline))
					) {
						activatedSnapshot = true;
						continue;
					}
					lastError = error;
					this.reportCreateError(error, candidate.strategy);
					if (
						candidate.strategy === 'snapshot' &&
						candidates.some(({ strategy }) => strategy === 'image')
					) {
						this.options.logger?.warn(
							'Sandbox create from snapshot failed; falling back to image',
							{
								snapshotName: this.options.snapshot,
								mode: this.options.createStrategyMode,
								error: error instanceof Error ? error.message : String(error),
							},
						);
						break;
					}
					throw error;
				}
			}
		}

		throw lastError instanceof Error ? lastError : new Error('Failed to create Daytona sandbox');
	}

	/**
	 * Reactivate this sandbox's inactive snapshot and wait — bounded by the acquisition
	 * deadline — for it to become active again. Best-effort: in proxy mode the snapshot
	 * endpoints may not be allowed through, so any failure returns false and the original
	 * create error propagates unchanged.
	 */
	private async activateSnapshotAndWait(client: Daytona, deadline: number): Promise<boolean> {
		const snapshotName = this.options.snapshot;
		if (!snapshotName) return false;
		this.options.logger?.warn('Daytona snapshot is inactive; requesting activation', {
			snapshotName,
		});
		try {
			const snapshot = await client.snapshot.get(snapshotName);
			if (snapshot.state === 'inactive') await client.snapshot.activate(snapshot);
			for (;;) {
				const current = await client.snapshot.get(snapshotName);
				if (current.state === 'active') {
					this.options.logger?.info('Daytona snapshot reactivated', { snapshotName });
					return true;
				}
				if (current.state === 'error' || current.state === 'build_failed') {
					this.options.logger?.warn('Daytona snapshot is unusable after activation request', {
						snapshotName,
						state: current.state,
					});
					return false;
				}
				if (Date.now() + SNAPSHOT_ACTIVATION_POLL_MS >= deadline) {
					this.options.logger?.warn('Timed out waiting for Daytona snapshot activation', {
						snapshotName,
						state: current.state,
					});
					return false;
				}
				await new Promise((resolve) => setTimeout(resolve, SNAPSHOT_ACTIVATION_POLL_MS));
			}
		} catch (error) {
			this.options.logger?.warn(
				'Daytona snapshot activation failed; surfacing the original create error',
				{
					snapshotName,
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return false;
		}
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

	/** Configured create timeout, capped by the remaining acquisition budget. */
	private createTimeoutSeconds(deadline: number): number {
		const remaining = this.operationTimeoutSeconds(deadline);
		const configured = this.options.createTimeoutSeconds;
		return configured ? Math.min(configured, remaining) : remaining;
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
