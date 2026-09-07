import type {
	CreateEvaluationCollectionPayload,
	EvalVersionEntry,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	EvaluationCollectionRunSummary,
	MetricScale,
	UpdateEvaluationCollectionPayload,
} from '@n8n/api-types';
import { metricScalesFromConfig, normalizeMetricScore } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { EvaluationConfig, TestRun, User } from '@n8n/db';
import {
	DbLock,
	DbLockService,
	EvaluationCollectionRepository,
	EvaluationConfigRepository,
	TestRunRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { OperationalError, type IDataObject } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { resolveConfigMetricScales, runMetricScales } from './metric-scales';

/**
 * Maps a collection id to the int32 `subKey` that scopes its re-run advisory
 * lock (Postgres two-int lock form / SQLite mutex key), so different collections
 * don't serialize against each other. A hash collision only over-serializes two
 * collections — harmless — so a 32-bit key is sufficient.
 */
function advisoryLockSubKey(collectionId: string): number {
	let hash = 0;
	for (let i = 0; i < collectionId.length; i++) {
		hash = (Math.imul(31, hash) + collectionId.charCodeAt(i)) | 0;
	}
	return hash;
}

/**
 * Structural (not the full entity class) so callers can pass plain-object
 * spreads from `EvaluationCollectionListItem`.
 */
type CollectionFields = {
	id: string;
	name: string;
	description: string | null;
	workflowId: string;
	evaluationConfigId: string;
	createdById: string | null;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Orchestrates the eval-collection lifecycle. The runner stays unaware of
 * collections — collection metadata is passed through
 * `TestRunnerService.startTestRun()` as opaque options.
 */
@Service()
export class EvaluationCollectionService {
	constructor(
		private readonly collectionRepo: EvaluationCollectionRepository,
		private readonly testRunRepo: TestRunRepository,
		private readonly evalConfigRepo: EvaluationConfigRepository,
		private readonly workflowHistoryRepo: WorkflowHistoryRepository,
		private readonly publishedVersionRepo: WorkflowPublishedVersionRepository,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly testRunnerService: TestRunnerService,
		private readonly telemetry: Telemetry,
		private readonly logger: Logger,
		private readonly dbLockService: DbLockService,
	) {}

	async createCollection(
		user: User,
		workflowId: string,
		input: CreateEvaluationCollectionPayload,
	): Promise<{ record: EvaluationCollectionRecord; runsStartedIds: string[] }> {
		// Validate the config belongs to this workflow, else a caller with access
		// to two workflows could attach config A to workflow B's collection.
		const config = await this.evalConfigRepo.findByIdAndWorkflowId(
			input.evaluationConfigId,
			workflowId,
		);
		if (!config) {
			throw new NotFoundError('EvaluationConfig not found for this workflow');
		}

		// Validate version + reused-run IDs up front, so we reject before any side
		// effect (collection row, snapshot, runner kickoff) rather than part-way.
		for (const [index, v] of input.versions.entries()) {
			if (v.workflowVersionId) {
				const exists = await this.workflowHistoryService.findVersion(
					workflowId,
					v.workflowVersionId,
				);
				if (!exists) {
					throw new BadRequestError(
						`versions[${index}]: workflow version "${v.workflowVersionId}" not found`,
					);
				}
			}
			if (v.existingTestRunId) {
				const run = await this.testRunRepo.findOneBy({ id: v.existingTestRunId });
				if (
					!run ||
					run.workflowId !== workflowId ||
					run.evaluationConfigId !== input.evaluationConfigId
				) {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" is not compatible with this collection`,
					);
				}
				// A run pinned to a different version than requested would
				// silently attach that version instead — reject the mismatch.
				if (v.workflowVersionId && run.workflowVersionId !== v.workflowVersionId) {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" was executed against version "${
							run.workflowVersionId ?? '(unpinned)'
						}", not the requested "${v.workflowVersionId}"`,
					);
				}
				// Unpinned legacy runs break the comparability promise — they
				// could have executed against any historical workflow state.
				if (!run.workflowVersionId) {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" has no pinned workflow version and cannot be reused in a collection`,
					);
				}
				// Only a completed run has comparable scores; reusing a
				// failed/cancelled/running one would seed a broken version.
				if (run.status !== 'completed') {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" has status "${run.status}" and is not a completed result; omit it to run a fresh evaluation`,
					);
				}
			}
		}

		// Persist before kicking off runs so each run can be tagged with
		// `collectionId` at creation time.
		const collection = await this.collectionRepo.createCollection({
			id: nanoid(),
			name: input.name,
			description: input.description ?? null,
			workflowId,
			evaluationConfigId: input.evaluationConfigId,
			createdById: user.id,
		});

		// Attach the runs the user wants to reuse.
		const existingRunIds = input.versions
			.filter((v) => v.existingTestRunId)
			.map((v) => v.existingTestRunId!);
		if (existingRunIds.length > 0) {
			await this.collectionRepo.addRunsToCollection(collection.id, existingRunIds);
		}

		// Kick off runs for unmatched versions. "Current draft" entries snapshot a
		// `WorkflowHistory` row first so the run pins an immutable version, and the
		// config is frozen too — later edits must not change what a run evaluated.
		const configSnapshot = this.freezeConfigSnapshot(config);

		const runsStartedIds: string[] = [];
		for (const v of input.versions) {
			if (v.existingTestRunId) continue;

			const versionId =
				v.workflowVersionId ??
				(await this.workflowHistoryService.snapshotCurrent(workflowId)).versionId;

			runsStartedIds.push(
				await this.startCollectionRun(user, workflowId, {
					collectionId: collection.id,
					workflowVersionId: versionId,
					evaluationConfigId: input.evaluationConfigId,
					configSnapshot,
					concurrency: input.concurrency ?? 1,
				}),
			);
		}

		this.telemetry.track('Eval collection created', {
			user_id: user.id,
			workflow_id: workflowId,
			collection_id: collection.id,
			evaluation_config_id: input.evaluationConfigId,
			version_count: input.versions.length,
			existing_run_count: existingRunIds.length,
			new_run_count: runsStartedIds.length,
			dataset_id: this.extractDatasetId(config),
		});

		const record = this.toRecord(collection, existingRunIds.length + runsStartedIds.length);
		return { record, runsStartedIds };
	}

	/**
	 * Re-attempts a collection's runs: one fresh run per version it currently
	 * compares, then unlinks the old runs so the compare view shows only the new
	 * attempt. Versions are derived from the current runs' distinct pinned
	 * versions, and the config is re-frozen from its *current* state (a re-run
	 * usually follows a config fix, so the stale snapshot would just re-fail).
	 */
	async rerunCollection(
		user: User,
		workflowId: string,
		collectionId: string,
	): Promise<{ record: EvaluationCollectionRecord; runsStartedIds: string[] }> {
		// Serialize concurrent re-runs of the same collection so two tabs can't each
		// launch a wave: a second caller waits on the re-run lock, then sees the
		// first's fresh runs below and bails.
		return await this.withRerunLock(collectionId, async () => {
			const detail = await this.collectionRepo.getDetailByIdAndWorkflowId(collectionId, workflowId);
			if (!detail) throw new NotFoundError('Collection not found');
			const { collection, runs } = detail;

			// Re-checked while holding the re-run lock: a concurrent re-run that already
			// started has committed its fresh (new/running) runs by now, so this sees
			// them and a second wave never launches.
			if (runs.some((r) => r.status === 'new' || r.status === 'running')) {
				throw new BadRequestError('Collection run already in progress');
			}

			// Derive versions from the current runs (distinct pinned ids in run order)
			// BEFORE any unlink, so we capture the on-screen membership.
			const versionIds: string[] = [];
			const seenVersions = new Set<string>();
			for (const run of runs) {
				if (run.workflowVersionId && !seenVersions.has(run.workflowVersionId)) {
					seenVersions.add(run.workflowVersionId);
					versionIds.push(run.workflowVersionId);
				}
			}
			if (versionIds.length === 0) {
				throw new BadRequestError('Collection has no pinned versions to re-run');
			}

			// Re-freeze the current eval config (see the doc comment for why).
			const config = await this.evalConfigRepo.findByIdAndWorkflowId(
				collection.evaluationConfigId,
				workflowId,
			);
			if (!config) {
				throw new BadRequestError(
					'Evaluation config for this collection no longer exists; cannot re-run',
				);
			}
			const configSnapshot = this.freezeConfigSnapshot(config);

			// Kick off one fresh run per version. If any fails to start, roll back the
			// fresh runs from this call and leave the old runs untouched, so the
			// collection stays in its pre-rerun state rather than a partial mix.
			const runsStartedIds: string[] = [];
			try {
				for (const versionId of versionIds) {
					runsStartedIds.push(
						await this.startCollectionRun(user, workflowId, {
							collectionId: collection.id,
							workflowVersionId: versionId,
							evaluationConfigId: collection.evaluationConfigId,
							configSnapshot,
							// The original collection's concurrency isn't persisted, so a
							// re-run always runs sequentially. Acceptable for a re-run.
							concurrency: 1,
						}),
					);
				}

				// Replace the old runs with the fresh attempt in one atomic unlink. Kept
				// inside the try so a failure here rolls the whole attempt back too; the
				// unlink is all-or-nothing, so a failure leaves the old runs untouched.
				await this.collectionRepo.removeRunsFromCollection(
					collection.id,
					runs.map((run) => run.id),
				);
			} catch (error) {
				// Restore the pre-rerun state (only the old runs linked): cancel the fresh
				// runs so they stop consuming compute and can't bust the insights cache
				// (the runner reads the collectionId captured at start), then unlink them.
				// The old runs are still linked — their unlink is atomic, so a failure
				// left them untouched.
				for (const runId of runsStartedIds) {
					await this.testRunnerService.cancelTestRun(runId).catch(() => {});
				}
				try {
					await this.collectionRepo.removeRunsFromCollection(collection.id, runsStartedIds);
				} catch (cleanupError) {
					// The rollback unlink itself failed — the collection may now hold both
					// the old and fresh runs. Surface it so the inconsistency isn't silent;
					// still throw the original error, which is the actionable cause.
					this.logger.error(
						'Failed to roll back eval collection re-run; collection may contain a mixed run set',
						{ collectionId: collection.id, error: cleanupError },
					);
				}
				throw error;
			}

			// Membership changed — the cached insights envelope is now stale.
			await this.collectionRepo.updateInsightsCache(collection.id, null);

			this.telemetry.track('Eval collection rerun', {
				user_id: user.id,
				workflow_id: workflowId,
				collection_id: collection.id,
				evaluation_config_id: collection.evaluationConfigId,
				version_count: versionIds.length,
				new_run_count: runsStartedIds.length,
				dataset_id: this.extractDatasetId(config),
			});

			const record = this.toRecord(collection, runsStartedIds.length);
			return { record, runsStartedIds };
		});
	}

	/**
	 * Runs `fn` under a per-collection re-run lock so two concurrent re-runs can't
	 * each launch a wave. Delegates to the shared `DbLockService`, scoped to the
	 * collection via `subKey` — a transaction-scoped advisory lock on Postgres, an
	 * in-process mutex on SQLite. The whole in-flight re-check + kickoff runs inside
	 * the lock on purpose: shrinking the critical section would reopen the
	 * read-then-act race.
	 *
	 * Fail-fast (`tryWithLock`, not a blocking wait): a concurrent re-run of the
	 * same collection returns immediately as "already in progress" rather than
	 * camping on a pinned pool connection while this call still needs one to do its
	 * work — which, on the default 2-connection pool, would deadlock the exact
	 * two-tab case the lock guards. A deliberate advisory lock, not a row lock — a
	 * `FOR UPDATE` on the collection row would deadlock against the FK KEY-SHARE
	 * lock the child `test_run` inserts take on that row.
	 */
	private async withRerunLock<T>(collectionId: string, fn: () => Promise<T>): Promise<T> {
		// `entered` distinguishes a failed lock acquisition (fn never ran → a
		// concurrent re-run holds it) from an OperationalError thrown by `fn` itself
		// (e.g. a transient DB error during kickoff), so we only translate the former.
		let entered = false;
		try {
			return await this.dbLockService.tryWithLock(
				DbLock.EVAL_COLLECTION_RERUN,
				async () => {
					entered = true;
					return await fn();
				},
				{ subKey: advisoryLockSubKey(collectionId) },
			);
		} catch (error) {
			if (!entered && error instanceof OperationalError) {
				throw new BadRequestError('Collection run already in progress');
			}
			throw error;
		}
	}

	async listCollections(workflowId: string): Promise<EvaluationCollectionRecord[]> {
		const items = await this.collectionRepo.listByWorkflowId(workflowId);
		return items.map(({ runCount, ...c }) => this.toRecord(c, runCount));
	}

	async getCollectionDetail(
		workflowId: string,
		collectionId: string,
	): Promise<EvaluationCollectionDetail> {
		const detail = await this.collectionRepo.getDetailByIdAndWorkflowId(collectionId, workflowId);
		if (!detail) throw new NotFoundError('Collection not found');

		// Collection-wide scales from the current config: the default for runs with
		// no snapshot, and the FE's fallback map. Each run further resolves its own
		// scales from its frozen snapshot in `toRunSummary`.
		const defaultScales = await resolveConfigMetricScales(
			this.evalConfigRepo,
			detail.collection.evaluationConfigId,
			workflowId,
		);
		const runs = detail.runs.map((r) => this.toRunSummary(r, defaultScales));
		return { ...this.toRecord(detail.collection, runs.length), runs, metricScales: defaultScales };
	}

	async updateCollectionMeta(
		workflowId: string,
		collectionId: string,
		input: UpdateEvaluationCollectionPayload,
	): Promise<EvaluationCollectionRecord> {
		const updated = await this.collectionRepo.updateMeta(collectionId, workflowId, input);
		if (!updated) throw new NotFoundError('Collection not found');
		const runCount = await this.testRunRepo.count({ where: { collectionId } });
		return this.toRecord(updated, runCount);
	}

	async deleteCollection(
		user: User,
		workflowId: string,
		collectionId: string,
	): Promise<{ runsUnlinked: number }> {
		// Verify ownership before any cancellation side effect, else a caller
		// could trigger another workflow's cancellation before getting a 404.
		const owned = await this.collectionRepo.findByIdAndWorkflowId(collectionId, workflowId);
		if (!owned) throw new NotFoundError('Collection not found');

		// Cancel active runs first so workers stop touching rows we're about to
		// unlink — otherwise post-delete writes on a foreign main strand them.
		const active = await this.testRunRepo.find({
			where: [
				{ collectionId, status: 'running' },
				{ collectionId, status: 'new' },
			],
			select: ['id'],
		});
		if (active.length > 0) {
			await this.testRunnerService.cancelCollection(collectionId);
		}

		const { deleted, runsUnlinked } = await this.collectionRepo.deleteByIdAndWorkflowId(
			collectionId,
			workflowId,
		);
		if (!deleted) throw new NotFoundError('Collection not found');

		this.telemetry.track('Eval collection deleted', {
			user_id: user.id,
			workflow_id: workflowId,
			collection_id: collectionId,
			runs_unlinked: runsUnlinked,
		});

		return { runsUnlinked };
	}

	async addRunToCollection(
		workflowId: string,
		collectionId: string,
		testRunId: string,
	): Promise<EvaluationCollectionDetail> {
		const collection = await this.collectionRepo.findByIdAndWorkflowId(collectionId, workflowId);
		if (!collection) throw new NotFoundError('Collection not found');

		const run = await this.testRunRepo.findOneBy({ id: testRunId });
		if (!run || run.workflowId !== workflowId) {
			throw new NotFoundError('Test run not found for this workflow');
		}
		if (run.evaluationConfigId !== collection.evaluationConfigId) {
			throw new BadRequestError(
				'Test run is not compatible with this collection (different evaluation config)',
			);
		}
		// Same invariant as the create path: an unpinned run breaks comparability.
		if (!run.workflowVersionId) {
			throw new BadRequestError(
				'Test run has no pinned workflow version and cannot be added to a collection',
			);
		}

		await this.collectionRepo.addRunsToCollection(collectionId, [testRunId]);
		// Membership change invalidates the cached insights envelope.
		await this.collectionRepo.updateInsightsCache(collectionId, null);
		return await this.getCollectionDetail(workflowId, collectionId);
	}

	async removeRunFromCollection(
		workflowId: string,
		collectionId: string,
		testRunId: string,
	): Promise<EvaluationCollectionDetail> {
		const collection = await this.collectionRepo.findByIdAndWorkflowId(collectionId, workflowId);
		if (!collection) throw new NotFoundError('Collection not found');

		const affected = await this.collectionRepo.removeRunFromCollection(collectionId, testRunId);
		if (affected === 0) {
			throw new NotFoundError('Test run is not part of this collection');
		}

		// Same invariant as `addRunToCollection` — the comparable set shifted, so
		// cached insights are stale.
		await this.collectionRepo.updateInsightsCache(collectionId, null);
		return await this.getCollectionDetail(workflowId, collectionId);
	}

	/**
	 * Powers the setup wizard's versions table: each workflow history row joined
	 * with its last run against `evaluationConfigId`, plus a synthesised "current
	 * draft" row (null `workflowVersionId` until committed). `isBest` / `isCritical`
	 * are computed here (highest avg / below 0.6) so the FE doesn't re-derive them.
	 */
	async getEvalVersions(
		workflowId: string,
		evaluationConfigId: string,
	): Promise<EvalVersionsResponse> {
		const config = await this.evalConfigRepo.findByIdAndWorkflowId(evaluationConfigId, workflowId);
		if (!config) {
			throw new NotFoundError('EvaluationConfig not found for this workflow');
		}

		// Per-metric scale so the versions-table badges match the compare view.
		const scaleByMetric = metricScalesFromConfig(config.metrics);

		// Metadata-only load: `nodes` / `connections` are fat JSON columns the
		// versions table never reads, so exclude them from the select.
		const history = await this.workflowHistoryRepo.find({
			where: { workflowId },
			order: { createdAt: 'DESC' },
			select: ['versionId', 'name', 'autosaved', 'createdAt'],
		});

		// One bulk query (not N+1), sorted DESC so the first run seen per version
		// is the latest — picked into the per-version map below.
		const lastRuns =
			history.length === 0
				? []
				: await this.testRunRepo.find({
						where: {
							evaluationConfigId,
							workflowVersionId: In(history.map((h) => h.versionId)),
						},
						order: { createdAt: 'DESC' },
					});
		// Surface only the latest *completed* run per version (the wizard offers it
		// for reuse), so a version whose last run failed shows "no run yet" instead.
		const latestRunByVersion = new Map<string, TestRun>();
		for (const run of lastRuns) {
			if (
				run.workflowVersionId &&
				run.status === 'completed' &&
				!latestRunByVersion.has(run.workflowVersionId)
			) {
				latestRunByVersion.set(run.workflowVersionId, run);
			}
		}

		// Which version is published, so the table can show "Published" as the
		// source label instead of the generic "Named" / "Autosaved".
		const publishedRow = await this.publishedVersionRepo.findOneBy({ workflowId });
		const publishedVersionId = publishedRow?.publishedVersionId ?? null;

		const versions: EvalVersionEntry[] = [];

		// Current draft row — `workflowVersionId: null` means "snapshot at run
		// start"; listed first. `lastRun: null` is intentional: unpinned legacy
		// runs are "Ungrouped runs" in the FE, not draft history.
		versions.push({
			workflowVersionId: null,
			label: 'Current draft',
			sourceLabel: 'Live workflow',
			isCurrent: true,
			lastRun: null,
		});

		for (const h of history) {
			const lastRun = latestRunByVersion.get(h.versionId) ?? null;

			versions.push({
				workflowVersionId: h.versionId,
				label: h.name ?? this.shortVersionLabel(h.versionId),
				sourceLabel: this.formatSourceLabel(h, h.versionId === publishedVersionId),
				isCurrent: false,
				lastRun: lastRun
					? {
							testRunId: lastRun.id,
							runAt: (lastRun.runAt ?? lastRun.createdAt).toISOString(),
							status: lastRun.status,
							avgScore: this.computeAvgScore(lastRun, scaleByMetric),
							isBest: false, // overwritten below
							isCritical: false, // overwritten below
						}
					: null,
			});
		}

		// Annotate `isBest` / `isCritical` over the scored entries only; skipped
		// when no version has a scored run yet.
		const scored = versions.filter((v) => v.lastRun?.avgScore !== null && v.lastRun !== null);
		if (scored.length > 0) {
			const best = scored.reduce((acc, v) =>
				(v.lastRun!.avgScore ?? -Infinity) > (acc.lastRun!.avgScore ?? -Infinity) ? v : acc,
			);
			if (best.lastRun) best.lastRun.isBest = true;
			for (const v of scored) {
				if (v.lastRun && v.lastRun.avgScore !== null && v.lastRun.avgScore < 0.6) {
					v.lastRun.isCritical = true;
				}
			}
		}

		return { evaluationConfigId, versions };
	}

	// ---- internals ----

	/**
	 * Freeze an eval config into the immutable snapshot every collection run
	 * compiles against, so a later config edit can't change what a run evaluated.
	 * Dates are serialized to match the JSON the runner persists on the row.
	 */
	private freezeConfigSnapshot(config: EvaluationConfig): IDataObject {
		return {
			...config,
			createdAt: config.createdAt.toISOString(),
			updatedAt: config.updatedAt.toISOString(),
		};
	}

	/**
	 * Kick off one collection-linked run pinned to a version, compiling the frozen
	 * config onto its snapshot. Shared by {@link createCollection} and
	 * {@link rerunCollection} so both schedule identically.
	 */
	private async startCollectionRun(
		user: User,
		workflowId: string,
		options: {
			collectionId: string;
			workflowVersionId: string;
			evaluationConfigId: string;
			configSnapshot: IDataObject;
			concurrency: number;
		},
	): Promise<string> {
		const { testRun } = await this.testRunnerService.startTestRun(
			user,
			workflowId,
			options.concurrency,
			{
				collectionId: options.collectionId,
				workflowVersionId: options.workflowVersionId,
				evaluationConfigId: options.evaluationConfigId,
				evaluationConfigSnapshot: options.configSnapshot,
				// Compile the eval config onto the version snapshot; without it the
				// run goes "direct" and fails with EVALUATION_TRIGGER_NOT_FOUND.
				compileFromConfig: true,
			},
		);
		return testRun.id;
	}

	private toRecord(collection: CollectionFields, runCount: number): EvaluationCollectionRecord {
		return {
			id: collection.id,
			name: collection.name,
			description: collection.description,
			workflowId: collection.workflowId,
			evaluationConfigId: collection.evaluationConfigId,
			createdById: collection.createdById,
			createdAt: collection.createdAt.toISOString(),
			updatedAt: collection.updatedAt.toISOString(),
			runCount,
		};
	}

	private toRunSummary(
		run: TestRun,
		defaultScales: Record<string, MetricScale>,
	): EvaluationCollectionRunSummary {
		// Resolve scales from the run's own frozen snapshot so its values normalize
		// on the scales they were produced with, not the collection's current config
		// (which may have changed since the run completed).
		const scaleByMetric = runMetricScales(run, defaultScales);
		return {
			testRunId: run.id,
			workflowVersionId: run.workflowVersionId,
			status: run.status,
			runAt: run.runAt ? run.runAt.toISOString() : null,
			completedAt: run.completedAt ? run.completedAt.toISOString() : null,
			avgScore: this.computeAvgScore(run, scaleByMetric),
			metrics: this.coerceMetrics(run.metrics),
			metricScales: scaleByMetric,
		};
	}

	private computeAvgScore(run: TestRun, scaleByMetric: Record<string, MetricScale>): number | null {
		const coerced = this.coerceMetrics(run.metrics);
		if (!coerced) return null;
		// A "score" is a metric normalized to [0, 1] by its scale; operational
		// metrics (tokens, time) normalize to null and are excluded. Mirrors the
		// FE score model so the versions table matches the compare view.
		const scores = Object.entries(coerced)
			.map(([key, value]) => normalizeMetricScore(key, value, scaleByMetric[key]))
			.filter((value): value is number => value !== null);
		if (scores.length === 0) return null;
		return scores.reduce((acc, value) => acc + value, 0) / scores.length;
	}

	private coerceMetrics(
		metrics: Record<string, number | boolean> | null | undefined,
	): Record<string, number> | null {
		if (!metrics) return null;
		const out: Record<string, number> = {};
		for (const [k, v] of Object.entries(metrics)) {
			if (typeof v === 'number') out[k] = v;
			else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
		}
		return Object.keys(out).length > 0 ? out : null;
	}

	private extractDatasetId(config: { datasetSource: string; datasetRef: unknown }): string | null {
		if (
			config.datasetSource === 'data_table' &&
			typeof config.datasetRef === 'object' &&
			config.datasetRef !== null &&
			'dataTableId' in config.datasetRef
		) {
			return String((config.datasetRef as { dataTableId: string }).dataTableId);
		}
		return null;
	}

	private shortVersionLabel(versionId: string): string {
		return `v ${versionId.slice(0, 8)}`;
	}

	private formatDateLabel(date: Date): string {
		// Fallback label for raw API consumers; the FE may reformat.
		return date.toISOString().slice(0, 10);
	}

	/**
	 * Source-label taxonomy. Published wins over named/autosaved when a version
	 * is both.
	 */
	private formatSourceLabel(
		h: { name: string | null; autosaved: boolean; createdAt: Date },
		isPublished: boolean,
	): string {
		const date = this.formatDateLabel(h.createdAt);
		if (isPublished) return `Published · ${date}`;
		if (h.name) return `Named · ${date}`;
		if (h.autosaved) return `Autosaved · ${date}`;
		return `Snapshot · ${date}`;
	}
}
