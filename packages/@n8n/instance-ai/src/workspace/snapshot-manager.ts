/**
 * Prepares and caches a Daytona Image descriptor with config files,
 * node_modules, and runtime skills pre-installed, and resolves a versioned
 * named snapshot (`n8n/instance-ai:<n8nVersion>`) for sandbox creation.
 *
 * `snapshotName` derives the versioned snapshot name for the running n8n
 * version. CI is the producer of snapshots
 * (see `scripts/build-snapshot.cjs`); the sandbox-create request validates
 * existence and falls back to the declarative image when missing.
 *
 * The node-types catalog is NOT baked into the image (too large for API body limit).
 * It's written to each sandbox after creation via the filesystem API.
 */

import type { Daytona, DaytonaError as TDaytonaError, Image } from '@daytona/sdk';
import type { RuntimeSkillSource } from '@n8n/agents';
import { DAYTONA_WORKSPACE_ROOT, loadDaytona } from '@n8n/agents/sandbox';
import { sleep } from '@n8n/utils/sleep';

import {
	buildKnowledgeBaseWorkspaceBundle,
	type KnowledgeBaseWorkspaceBundle,
} from '../knowledge-base/materialize-knowledge-base';
import type { Logger } from '../logger';
import {
	BuilderTemplatesService,
	builderTemplatesOptionsFromEnv,
} from './builder-templates-service';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS, NPM_INSTALL_FLAGS } from './sandbox-setup';
import { stageWorkspaceFilesForImage } from './snapshot-image-context';
import { buildRuntimeSkillWorkspaceBundle } from '../skills/materialize-runtime-skills';
import { loadInstanceAiRuntimeSkillSource } from '../skills/runtime-skills';

export interface CreateSnapshotOptions {
	timeout?: number;
	onLogs?: (chunk: string) => void;
	/**
	 * Hard cap on versioned snapshots per organization (quota backstop). When
	 * the count exceeds this after age pruning, the least-recently-used
	 * snapshots are deleted until the cap is met. Unset disables the cap.
	 */
	retention?: number;
	/**
	 * Delete versioned snapshots not used within this many days
	 * (`lastUsedAt`, falling back to `createdAt`). Snapshots still in use by
	 * older n8n versions keep a fresh `lastUsedAt` and survive regardless of
	 * release cadence. Unset disables age pruning.
	 */
	maxAgeDays?: number;
}

type DaytonaSnapshot = Awaited<ReturnType<Daytona['snapshot']['get']>>;

const DAYTONA_WORKSPACE_BAKE_ROOT = '/tmp/n8n-workspace-bake';
const SNAPSHOT_WORKSPACE_LAYOUT_DIRS = ['src', 'chunks', 'node-types'] as const;
const SNAPSHOT_BUILDING_STATES = new Set(['building', 'pending', 'pulling']);
const SNAPSHOT_VERIFY_POLL_MS = 5_000;
const DEFAULT_SNAPSHOT_VERIFY_TIMEOUT_S = 1_800;
const SNAPSHOT_NAME_PREFIX = 'n8n/instance-ai:';
const MAX_TRANSIENT_CREATE_RETRIES = 3;
const TRANSIENT_CREATE_RETRY_BACKOFF_MS = 5_000;
/**
 * Times a failed (`error`/`build_failed`) record for the target version is deleted and
 * the create retried before giving up. Automates the manual "delete the broken snapshot
 * in the Daytona UI and re-run" remediation.
 */
const MAX_FAILED_SNAPSHOT_CLEANUPS = 2;
const SNAPSHOT_LIST_PAGE_SIZE = 100;
const MAX_SNAPSHOT_LIST_PAGES = 20;
// Bound for the post-publish prune: it runs after the snapshot is verified, so
// a hung Daytona call must not stall a release (the SDK has no sane default
// HTTP timeout).
const SNAPSHOT_PRUNE_TIMEOUT_MS = 5 * 60_000;
// Deleted snapshots pass through `removing` before their quota slot frees up.
const SNAPSHOT_REMOVAL_WAIT_MS = 60_000;
const SNAPSHOT_REMOVAL_POLL_MS = 2_000;
const MAX_ACTIVATION_ATTEMPTS = 3;
// Polls (5s apart) to let an activation request settle before re-requesting.
const ACTIVATION_SETTLE_POLLS = 6;
// States a snapshot can be safely deleted from. Never delete in-progress
// builds (a concurrent release job may own them) or already-removing ones.
const SNAPSHOT_DELETABLE_STATES = new Set(['active', 'inactive', 'error', 'build_failed']);
const SNAPSHOT_FAILED_STATES = new Set(['error', 'build_failed']);
// Rollback insurance: the newest versions are never age- or count-pruned even
// when idle (e.g. a quiet dev org where nothing was used for weeks).
const MIN_KEEP_NEWEST_VERSIONS = 3;

function isAlreadyExistsError(error: unknown): error is TDaytonaError {
	const { DaytonaError } = loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error.statusCode === 409) return true;
	return /already exists/i.test(error.message);
}

/**
 * The SDK's `snapshot.create` polls the new record and synthesizes this error (no
 * statusCode) when the record lands in `error`/`build_failed` — e.g. "Reason: An
 * operation is already in progress for this resource" when concurrent publishes race.
 * The failed record persists under the version's name and blocks every retry until
 * it is deleted.
 */
function isCreateFailedStateError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	return error instanceof DaytonaError && /^failed to create snapshot\b/i.test(error.message);
}

/**
 * Internal signal from {@link SnapshotManager.verifySnapshot}: the record exists in a
 * state that can never become active. Carries the state so the publish loop can decide
 * whether deleting and rebuilding is worthwhile (failed states only).
 */
class SnapshotUnusableError extends Error {
	constructor(
		message: string,
		readonly snapshotState: string,
	) {
		super(message);
	}
}

/**
 * Gateway/availability errors worth retrying: 5xx/408/429 responses, plus the
 * SDK's connection/timeout errors (matched by name — they carry no statusCode).
 */
function isTransientDaytonaError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error.name === 'DaytonaConnectionError' || error.name === 'DaytonaTimeoutError') return true;
	const status = error.statusCode;
	return status !== undefined && (status >= 500 || status === 408 || status === 429);
}

// The SDK has no dedicated error class or status mapping for quota rejections;
// the message (e.g. "Snapshot quota exceeded. Maximum allowed: 30") is the only
// signal. Deliberately narrow: a rewording degrades to the pre-existing
// hard-fail rather than triggering pruning on unrelated quota-flavored errors.
function isQuotaExceededError(error: unknown): boolean {
	const { DaytonaError } = loadDaytona();
	return error instanceof DaytonaError && /snapshot quota exceeded/i.test(error.message);
}

/**
 * Order snapshots newest-version-first by the version in their name.
 * A suffixed version (`2.23.0-<hash>`) sorts older than its plain release;
 * names whose version segment is unparseable sort oldest.
 */
function compareSnapshotVersionsDesc(a: DaytonaSnapshot, b: DaytonaSnapshot): number {
	return parseSnapshotVersionRank(b.name) - parseSnapshotVersionRank(a.name);
}

function parseSnapshotVersionRank(name: string): number {
	const version = name.slice(SNAPSHOT_NAME_PREFIX.length);
	const match = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(version);
	if (!match) return Number.NEGATIVE_INFINITY;
	const [, major, minor, patch, suffix] = match;
	// Scale leaves room for four-digit minor/patch; -0.5 ranks suffixed builds
	// below their plain release.
	return (
		Number(major) * 1e8 + Number(minor) * 1e4 + Number(patch) + (suffix !== undefined ? -0.5 : 0)
	);
}

// Plain release versions only — suffixed builds (`2.23.0-<hash>`) and failed
// snapshots must not consume rollback-floor slots.
function isPlainVersionName(name: string): boolean {
	return /^\d+\.\d+\.\d+$/.test(name.slice(SNAPSHOT_NAME_PREFIX.length));
}

/**
 * When a snapshot was last used, for LRU pruning. `lastUsedAt` is bumped by
 * sandbox creation (verified against real org data); `createdAt` covers
 * never-used snapshots. Unparseable timestamps count as just-used so bad data
 * never causes a deletion.
 */
function lastUsedTime(snapshot: DaytonaSnapshot): number {
	const time = new Date(snapshot.lastUsedAt ?? snapshot.createdAt).getTime();
	return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export class SnapshotManager {
	private cachedImage: Promise<Image> | null = null;

	private runtimeSkillBundlePromise: ReturnType<typeof buildRuntimeSkillWorkspaceBundle> | null =
		null;

	private knowledgeBaseBundlePromise: Promise<KnowledgeBaseWorkspaceBundle> | null = null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly logger: Logger,
		private readonly n8nVersion: string | undefined,
		private readonly runtimeSkillSource?: RuntimeSkillSource,
		private readonly templatesService?: BuilderTemplatesService,
	) {}

	/** Get or prepare the image descriptor. */
	async ensureImage(): Promise<Image> {
		this.cachedImage ??= this.prepareImage();
		return await this.cachedImage;
	}

	private async prepareImage(): Promise<Image> {
		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';
		const runtimeSkillBundle = await this.runtimeSkillBundle();
		const knowledgeBaseBundle = await this.knowledgeBaseBundle();
		const cacheKey =
			this.n8nVersion ?? `${runtimeSkillBundle?.skillsHash}-${knowledgeBaseBundle.contentHash}`;

		const workspaceFiles = new Map<string, string>([
			...(runtimeSkillBundle?.files ?? []),
			...(knowledgeBaseBundle?.files ?? []),
		]);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/package.json`, PACKAGE_JSON);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/tsconfig.json`, TSCONFIG_JSON);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/build.mjs`, BUILD_MJS);

		const { stagingDir } = await stageWorkspaceFilesForImage(
			workspaceFiles,
			DAYTONA_WORKSPACE_ROOT,
			cacheKey,
		);

		const { Image } = loadDaytona();
		const layoutDirs = SNAPSHOT_WORKSPACE_LAYOUT_DIRS.map(
			(dir) => `${DAYTONA_WORKSPACE_ROOT}/${dir}`,
		).join(' ');
		const image = Image.base(base)
			.addLocalDir(stagingDir, DAYTONA_WORKSPACE_BAKE_ROOT)
			.runCommands(
				`cp -a ${DAYTONA_WORKSPACE_BAKE_ROOT}/. ${DAYTONA_WORKSPACE_ROOT}/ && mkdir -p ${layoutDirs} && cd ${DAYTONA_WORKSPACE_ROOT} && npm install ${NPM_INSTALL_FLAGS}`,
			);

		this.logger.info('Builder image descriptor prepared', {
			base,
			dockerfileLength: image.dockerfile.length,
			runtimeSkillsHash: runtimeSkillBundle?.skillsHash,
			runtimeSkillFiles: runtimeSkillBundle?.files.size ?? 0,
			knowledgeBaseHash: knowledgeBaseBundle.contentHash,
			knowledgeBaseFiles: knowledgeBaseBundle.files.size,
			stagingDir,
		});

		return image;
	}

	/**
	 * Create the versioned Daytona snapshot for the configured n8n version.
	 * Treats 409 / "already exists" as success — re-runs against the same
	 * version are idempotent. Retries transient gateway errors, prunes old
	 * versioned snapshots on quota exhaustion (when `retention` is set), and
	 * reactivates an existing-but-inactive snapshot instead of failing.
	 *
	 * Single source of truth for snapshot creation in the CI release pipeline
	 * (`scripts/build-snapshot.cjs`). Runtime never calls this.
	 */
	async createSnapshot(daytona: Daytona, options?: CreateSnapshotOptions): Promise<string> {
		const name = this.snapshotName();
		if (!name) {
			throw new Error('SnapshotManager: n8nVersion is required to derive a snapshot name');
		}

		// The SDK treats `timeout: 0` as "no timeout"; here it means the default
		// total budget rather than an instantly-expired deadline.
		const timeoutS =
			options?.timeout !== undefined && options.timeout > 0
				? options.timeout
				: DEFAULT_SNAPSHOT_VERIFY_TIMEOUT_S;
		const deadline = Date.now() + timeoutS * 1000;

		// One rebuild when the published record turns out unusable: a build that
		// finished in a failed state (e.g. broken by a concurrent operation) blocks
		// this version until its record is deleted, so delete it and publish again.
		for (let rebuilds = 0; ; rebuilds++) {
			await this.createWithRecovery(daytona, name, deadline, options);
			try {
				await this.verifySnapshot(daytona, name, deadline);
				break;
			} catch (error) {
				const rebuildable =
					error instanceof SnapshotUnusableError &&
					SNAPSHOT_FAILED_STATES.has(error.snapshotState) &&
					rebuilds < 1 &&
					Date.now() < deadline;
				if (!rebuildable) throw error;
				this.logger.warn('Published Daytona snapshot is unusable; deleting it and rebuilding', {
					name,
					state: error.snapshotState,
				});
				await this.reconcileFailedSnapshotRecord(daytona, name, deadline);
			}
		}
		try {
			// Best-effort and time-boxed: neither a prune failure nor a hung
			// Daytona call may fail a release that just published a healthy
			// snapshot.
			await this.withDeadline(
				this.pruneSnapshots(daytona, name, options),
				Date.now() + SNAPSHOT_PRUNE_TIMEOUT_MS,
				'Timed out pruning Daytona snapshots',
			);
		} catch (error) {
			this.logger.warn('Snapshot pruning did not complete', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return name;
	}

	/**
	 * Run `snapshot.create` with recovery for the two failure modes CI has hit:
	 * quota exhaustion (prune old versions once, then retry) and transient
	 * gateway errors (bounded retries; a re-create after the first request
	 * registered lands on the idempotent 409 path).
	 *
	 * The SDK's `timeout` option only bounds the initial POST — its status
	 * polling loop is unbounded — so each attempt is raced against `deadline`.
	 */
	private async createWithRecovery(
		daytona: Daytona,
		name: string,
		deadline: number,
		options?: CreateSnapshotOptions,
	): Promise<void> {
		const createOptions = { timeout: options?.timeout, onLogs: options?.onLogs };
		let transientRetries = 0;
		let failedCleanups = 0;
		let prunedForQuota = false;
		for (;;) {
			try {
				const image = await this.withDeadline(
					this.ensureImage(),
					deadline,
					`Timed out preparing the image for Daytona snapshot "${name}"`,
				);
				await this.withDeadline(
					daytona.snapshot.create({ name, image }, createOptions),
					deadline,
					`Timed out creating Daytona snapshot "${name}"`,
				);
				this.logger.info('Created versioned Daytona snapshot; verifying it is usable', { name });
				return;
			} catch (error) {
				if (isCreateFailedStateError(error)) {
					// The build landed in `error`/`build_failed` (e.g. broken by a concurrent
					// operation on the same name). The failed record blocks every retry of
					// this version, so delete it and retry instead of requiring a manual
					// deletion in the Daytona UI.
					if (failedCleanups < MAX_FAILED_SNAPSHOT_CLEANUPS) {
						const record = await this.reconcileFailedSnapshotRecord(daytona, name, deadline);
						if (record !== 'usable') {
							failedCleanups++;
							await sleep(
								Math.min(TRANSIENT_CREATE_RETRY_BACKOFF_MS * failedCleanups, deadline - Date.now()),
							);
							if (Date.now() >= deadline) throw error;
							continue;
						}
					}
					throw error;
				}
				if (isAlreadyExistsError(error)) {
					// A pre-existing failed record is handled by the verify + rebuild loop.
					this.logger.info('Versioned Daytona snapshot already exists; verifying it is usable', {
						name,
					});
					return;
				}
				const canPrune = (options?.retention ?? 0) > 0 || (options?.maxAgeDays ?? 0) > 0;
				if (isQuotaExceededError(error) && !prunedForQuota && canPrune) {
					prunedForQuota = true;
					this.logger.warn('Snapshot quota exceeded; pruning old versioned snapshots', { name });
					// Quota may be held below the retention window (e.g. by foreign
					// snapshots in the org), so force at least one LRU eviction.
					const deleted = await this.withDeadline(
						this.pruneSnapshots(daytona, name, options, { ensureAtLeastOne: true }),
						deadline,
						'Timed out pruning Daytona snapshots',
					).catch((): DaytonaSnapshot[] => []);
					if (deleted.length === 0) throw error;
					// Deletion is asynchronous server-side (snapshots pass through
					// `removing`); the quota slot only frees once they are gone.
					await this.waitForSnapshotRemoval(daytona, deleted, deadline);
					continue;
				}
				if (
					isTransientDaytonaError(error) &&
					transientRetries < MAX_TRANSIENT_CREATE_RETRIES &&
					Date.now() < deadline
				) {
					transientRetries++;
					this.logger.warn('Transient Daytona error during snapshot create; retrying', {
						name,
						attempt: transientRetries,
						error: error instanceof Error ? error.message : String(error),
					});
					await sleep(
						Math.min(TRANSIENT_CREATE_RETRY_BACKOFF_MS * transientRetries, deadline - Date.now()),
					);
					// The backoff may have consumed the remaining budget; surface the
					// real error instead of a confusing deadline timeout.
					if (Date.now() >= deadline) throw error;
					continue;
				}
				throw error;
			}
		}
	}

	/**
	 * Look up the record for `name` and, when it sits in a failed state, delete it and
	 * wait for the removal — a failed record permanently blocks republishing the version.
	 * Returns 'cleaned' when a failed record was deleted, 'absent' when no record exists
	 * (create can be retried directly), and 'usable' when the record is in any live state.
	 */
	private async reconcileFailedSnapshotRecord(
		daytona: Daytona,
		name: string,
		deadline: number,
	): Promise<'cleaned' | 'absent' | 'usable'> {
		const { DaytonaNotFoundError } = loadDaytona();
		let snapshot: DaytonaSnapshot;
		try {
			snapshot = await this.withDeadline(
				daytona.snapshot.get(name),
				deadline,
				`Timed out fetching state of Daytona snapshot "${name}"`,
			);
		} catch (error) {
			if (error instanceof DaytonaNotFoundError) return 'absent';
			throw error;
		}
		if (!SNAPSHOT_FAILED_STATES.has(snapshot.state)) return 'usable';
		this.logger.warn('Versioned Daytona snapshot is in a failed state; deleting it to retry', {
			name,
			state: snapshot.state,
			...(snapshot.errorReason ? { reason: snapshot.errorReason } : {}),
		});
		await this.withDeadline(
			daytona.snapshot.delete(snapshot),
			deadline,
			`Timed out deleting failed Daytona snapshot "${name}"`,
		);
		await this.waitForSnapshotRemoval(daytona, [snapshot], deadline);
		return 'cleaned';
	}

	/**
	 * Wait until pruned snapshots are actually gone (a 404 on lookup). Bounded
	 * and best-effort: on timeout or an unexpected lookup result the create is
	 * retried anyway and surfaces whatever is still wrong.
	 */
	private async waitForSnapshotRemoval(
		daytona: Daytona,
		snapshots: DaytonaSnapshot[],
		deadline: number,
	): Promise<void> {
		const { DaytonaNotFoundError } = loadDaytona();
		const waitDeadline = Math.min(deadline, Date.now() + SNAPSHOT_REMOVAL_WAIT_MS);
		for (const snapshot of snapshots) {
			for (;;) {
				try {
					// Race the lookup itself against the wait budget — the SDK's transport
					// timeout is effectively unbounded, so a stalled request would
					// otherwise hang past the deadline.
					await this.withDeadline(
						daytona.snapshot.get(snapshot.name),
						waitDeadline,
						`Timed out waiting for Daytona snapshot "${snapshot.name}" to be removed`,
					);
				} catch (error) {
					if (!(error instanceof DaytonaNotFoundError)) {
						this.logger.warn('Unexpected error while waiting for snapshot removal', {
							name: snapshot.name,
							error: error instanceof Error ? error.message : String(error),
						});
					}
					break;
				}
				if (Date.now() >= waitDeadline) {
					this.logger.warn('Timed out waiting for pruned snapshots to be removed', {
						name: snapshot.name,
					});
					return;
				}
				await sleep(SNAPSHOT_REMOVAL_POLL_MS);
			}
		}
	}

	/**
	 * Verify that the snapshot is actually usable. A snapshot build can finish in
	 * `error`/`build_failed` state; returning before it is active would let a release
	 * ship without a working snapshot. Waits out in-progress builds, reactivates an
	 * `inactive` snapshot (Daytona deactivates idle ones), tolerates transient poll
	 * errors, and throws on any unusable state.
	 */
	private async verifySnapshot(daytona: Daytona, name: string, deadline: number): Promise<void> {
		let activationAttempts = 0;
		// Start at the threshold so the first `inactive` poll requests activation
		// immediately.
		let pollsSinceActivation = ACTIVATION_SETTLE_POLLS;
		for (;;) {
			let snapshot: DaytonaSnapshot;
			try {
				// Race every request against the deadline — the SDK's transport
				// timeout is effectively unbounded, so a stalled request would
				// otherwise hang the job past the budget.
				snapshot = await this.withDeadline(
					daytona.snapshot.get(name),
					deadline,
					`Timed out fetching state of Daytona snapshot "${name}"`,
				);
			} catch (error) {
				if (!isTransientDaytonaError(error) || Date.now() >= deadline) throw error;
				this.logger.warn('Transient Daytona error while polling snapshot state; retrying', {
					name,
					error: error instanceof Error ? error.message : String(error),
				});
				await sleep(SNAPSHOT_VERIFY_POLL_MS);
				continue;
			}
			if (snapshot.state === 'active') {
				this.logger.info('Versioned Daytona snapshot is active', { name });
				return;
			}
			if (snapshot.state === 'inactive') {
				// Re-request activation every settle window; transient failures
				// retry on the next window instead of failing the release.
				if (pollsSinceActivation >= ACTIVATION_SETTLE_POLLS) {
					if (activationAttempts >= MAX_ACTIVATION_ATTEMPTS) {
						throw new Error(
							`Versioned Daytona snapshot "${name}" remained inactive after ${MAX_ACTIVATION_ATTEMPTS} activation requests`,
						);
					}
					activationAttempts++;
					pollsSinceActivation = 0;
					this.logger.info('Versioned Daytona snapshot is inactive; requesting activation', {
						name,
						attempt: activationAttempts,
					});
					try {
						await this.withDeadline(
							daytona.snapshot.activate(snapshot),
							deadline,
							`Timed out requesting activation of Daytona snapshot "${name}"`,
						);
					} catch (error) {
						if (!isTransientDaytonaError(error)) throw error;
						this.logger.warn('Transient Daytona error during snapshot activation; will retry', {
							name,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				} else {
					pollsSinceActivation++;
				}
				if (Date.now() >= deadline) {
					throw new Error(
						`Timed out waiting for existing Daytona snapshot "${name}" to become active (state: ${snapshot.state})`,
					);
				}
				await sleep(SNAPSHOT_VERIFY_POLL_MS);
				continue;
			}
			if (!SNAPSHOT_BUILDING_STATES.has(snapshot.state)) {
				const reason = snapshot.errorReason ? `, reason: ${snapshot.errorReason}` : '';
				throw new SnapshotUnusableError(
					`Versioned Daytona snapshot "${name}" exists but is unusable (state: ${snapshot.state}${reason})`,
					snapshot.state,
				);
			}
			if (Date.now() >= deadline) {
				throw new Error(
					`Timed out waiting for existing Daytona snapshot "${name}" to become active (state: ${snapshot.state})`,
				);
			}
			this.logger.info('Waiting for existing Daytona snapshot to become active', {
				name,
				state: snapshot.state,
			});
			await sleep(SNAPSHOT_VERIFY_POLL_MS);
		}
	}

	/**
	 * Prune versioned snapshots. Age-based pruning (`maxAgeDays`, keyed on
	 * `lastUsedAt`) is the primary policy; the `retention` count is a quota
	 * backstop that evicts least-recently-used snapshots when the total still
	 * exceeds it. Failed snapshots are always deleted. Only touches
	 * `n8n/instance-ai:*` names, never the snapshot being published, never
	 * in-progress states, and never the newest `MIN_KEEP_NEWEST_VERSIONS`
	 * versions. Never throws: returns the snapshots actually deleted.
	 */
	private async pruneSnapshots(
		daytona: Daytona,
		protectedName: string,
		options?: Pick<CreateSnapshotOptions, 'retention' | 'maxAgeDays'>,
		{ ensureAtLeastOne = false }: { ensureAtLeastOne?: boolean } = {},
	): Promise<DaytonaSnapshot[]> {
		const retention = options?.retention;
		const maxAgeDays = options?.maxAgeDays;
		if (!retention && !maxAgeDays) return [];

		let matching: DaytonaSnapshot[];
		try {
			matching = await this.listVersionedSnapshots(daytona);
		} catch (error) {
			this.logger.warn('Failed to list Daytona snapshots for pruning; skipping', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}

		// Floor slots must go to usable release versions — failed and suffixed
		// snapshots don't count as rollback targets.
		const newestVersionNames = new Set(
			matching
				.filter(
					(snapshot) =>
						!SNAPSHOT_FAILED_STATES.has(snapshot.state) && isPlainVersionName(snapshot.name),
				)
				.sort(compareSnapshotVersionsDesc)
				.slice(0, MIN_KEEP_NEWEST_VERSIONS)
				.map((snapshot) => snapshot.name),
		);
		const isDeletable = (snapshot: DaytonaSnapshot) =>
			snapshot.name !== protectedName && SNAPSHOT_DELETABLE_STATES.has(snapshot.state);
		const isPrunable = (snapshot: DaytonaSnapshot) =>
			isDeletable(snapshot) && !newestVersionNames.has(snapshot.name);

		const toDelete: DaytonaSnapshot[] = [];
		const selected = new Set<string>();
		const select = (snapshot: DaytonaSnapshot) => {
			if (selected.has(snapshot.name)) return;
			selected.add(snapshot.name);
			toDelete.push(snapshot);
		};

		// Failed snapshots are quota dead weight; the newest-versions floor
		// does not protect them (they are unusable anyway).
		for (const snapshot of matching) {
			if (SNAPSHOT_FAILED_STATES.has(snapshot.state) && isDeletable(snapshot)) select(snapshot);
		}

		if (maxAgeDays) {
			const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
			for (const snapshot of matching) {
				if (!selected.has(snapshot.name) && isPrunable(snapshot) && lastUsedTime(snapshot) < cutoff)
					select(snapshot);
			}
		}

		if (retention) {
			const remaining = matching.filter((snapshot) => !selected.has(snapshot.name));
			let excess = remaining.length - retention;
			const evictable = remaining
				.filter(isPrunable)
				.sort((a, b) => lastUsedTime(a) - lastUsedTime(b));
			for (const snapshot of evictable) {
				if (excess <= 0) break;
				select(snapshot);
				excess--;
			}
		}

		// Under quota pressure the publish needs a free slot even when our own
		// snapshots are within policy (e.g. foreign snapshots hold the quota):
		// evict the least-recently-used prunable one.
		if (ensureAtLeastOne && toDelete.length === 0) {
			const lruCandidate = matching
				.filter(isPrunable)
				.sort((a, b) => lastUsedTime(a) - lastUsedTime(b))[0];
			if (lruCandidate) {
				this.logger.warn(
					'Quota pressure: evicting least-recently-used snapshot despite retention policy',
					{ name: lruCandidate.name },
				);
				select(lruCandidate);
			}
		}

		const deleted: DaytonaSnapshot[] = [];
		for (const snapshot of toDelete) {
			try {
				await daytona.snapshot.delete(snapshot);
				deleted.push(snapshot);
				this.logger.info('Pruned versioned Daytona snapshot', {
					name: snapshot.name,
					state: snapshot.state,
					lastUsedAt: snapshot.lastUsedAt ?? null,
				});
			} catch (error) {
				this.logger.warn('Failed to delete Daytona snapshot during pruning', {
					name: snapshot.name,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return deleted;
	}

	private async listVersionedSnapshots(daytona: Daytona): Promise<DaytonaSnapshot[]> {
		const matching: DaytonaSnapshot[] = [];
		let page = 1;
		for (let fetched = 0; fetched < MAX_SNAPSHOT_LIST_PAGES; fetched++) {
			const result = await daytona.snapshot.list(page, SNAPSHOT_LIST_PAGE_SIZE);
			matching.push(...result.items.filter((item) => item.name.startsWith(SNAPSHOT_NAME_PREFIX)));
			if (result.items.length === 0 || result.page >= result.totalPages) break;
			page = result.page + 1;
		}
		return matching;
	}

	private async withDeadline<T>(
		promise: Promise<T>,
		deadline: number,
		timeoutMessage: string,
	): Promise<T> {
		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race([
				promise,
				new Promise<never>((_, reject) => {
					timer = setTimeout(
						() => reject(new Error(timeoutMessage)),
						Math.max(deadline - Date.now(), 0),
					);
				}),
			]);
		} finally {
			clearTimeout(timer);
			// The losing promise keeps running; swallow its eventual rejection.
			promise.catch(() => {});
		}
	}

	/**
	 * Derive the versioned snapshot name for the running n8n version, or null
	 * when no version is configured. Existence is validated implicitly by the
	 * subsequent `daytona.create({ snapshot })`.
	 */
	snapshotName(): string | null {
		if (!this.n8nVersion) return null;
		return `n8n/instance-ai:${this.n8nVersion}`;
	}

	private async runtimeSkillBundle(): ReturnType<typeof buildRuntimeSkillWorkspaceBundle> {
		this.runtimeSkillBundlePromise ??= buildRuntimeSkillWorkspaceBundle({
			source: this.runtimeSkillSource ?? loadInstanceAiRuntimeSkillSource(),
			root: DAYTONA_WORKSPACE_ROOT,
			logger: this.logger,
		});

		return await this.runtimeSkillBundlePromise;
	}

	private async knowledgeBaseBundle(): Promise<KnowledgeBaseWorkspaceBundle> {
		this.knowledgeBaseBundlePromise ??= this.buildKnowledgeBaseBundle();
		return await this.knowledgeBaseBundlePromise;
	}

	private async buildKnowledgeBaseBundle(): Promise<KnowledgeBaseWorkspaceBundle> {
		const templatesService =
			this.templatesService ??
			new BuilderTemplatesService(builderTemplatesOptionsFromEnv({ logger: this.logger }));
		const templatesBundle = await templatesService.getBundle();

		return await buildKnowledgeBaseWorkspaceBundle({
			root: DAYTONA_WORKSPACE_ROOT,
			templatesArchive: templatesBundle.archive,
			logger: this.logger,
		});
	}

	/**
	 * Invalidate the in-memory image/bundle caches. The shared staging dir is owned
	 * by the per-key cache in `stageWorkspaceFilesForImage` and intentionally not
	 * removed here (in-flight creations may still be reading it).
	 */
	invalidate(): void {
		this.cachedImage = null;
		this.runtimeSkillBundlePromise = null;
		this.knowledgeBaseBundlePromise = null;
	}
}
