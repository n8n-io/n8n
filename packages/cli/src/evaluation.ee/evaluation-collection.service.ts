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
import type { EvaluationConfig, TestRun, User } from '@n8n/db';
import {
	EvaluationCollectionRepository,
	EvaluationConfigRepository,
	TestRunRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TestRunnerService } from '@/evaluation.ee/test-runner/test-runner.service.ee';
import { Telemetry } from '@/telemetry';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

/**
 * Bare shape of the {@link EvaluationCollection} fields the service uses for
 * building API records — kept structural (not the full entity class with
 * methods + relations) so callers can pass plain-object spreads from
 * `EvaluationCollectionListItem`.
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
 * Orchestrates eval-collection lifecycle: validating + creating collections,
 * kicking off the per-version test runs that make up a collection,
 * curating membership, and broadcasting collection-level cancellation. The
 * runner itself stays unaware of collections — collection metadata is
 * passed through `TestRunnerService.startTestRun()` as opaque options.
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
	) {}

	async createCollection(
		user: User,
		workflowId: string,
		input: CreateEvaluationCollectionPayload,
	): Promise<{ record: EvaluationCollectionRecord; runsStartedIds: string[] }> {
		// 1. Validate evaluation config belongs to this workflow. Without this
		// check a caller with access to two workflows could attach config A
		// to workflow B's collection — the comparison would silently break.
		const config = await this.evalConfigRepo.findByIdAndWorkflowId(
			input.evaluationConfigId,
			workflowId,
		);
		if (!config) {
			throw new NotFoundError('EvaluationConfig not found for this workflow');
		}

		// 2. Validate version IDs + reused-run IDs. Done up front so we either
		// commit the whole collection cleanly or reject before any side
		// effects (collection row, snapshot, runner kickoff).
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
				// If the caller asks for version A but supplies a run from
				// version B we'd silently attach B and never schedule A — the
				// resulting "collection on version A" would actually be
				// "collection on version B". Reject up front so the caller
				// can decide whether to omit `workflowVersionId` (use the run
				// as-is) or change `existingTestRunId` (run a fresh A).
				if (v.workflowVersionId && run.workflowVersionId !== v.workflowVersionId) {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" was executed against version "${
							run.workflowVersionId ?? '(unpinned)'
						}", not the requested "${v.workflowVersionId}"`,
					);
				}
				// Unpinned legacy runs (no `workflowVersionId`) cannot be
				// reused in collections — the whole point is comparability
				// across pinned versions, and an unpinned run could have
				// executed against any historical workflow state.
				if (!run.workflowVersionId) {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" has no pinned workflow version and cannot be reused in a collection`,
					);
				}
				// Only a completed run is a reusable result. A failed/cancelled
				// run has no scores to compare, and a still-running one hasn't
				// produced any yet — reusing either would silently seed the
				// collection with a broken version. The caller should omit
				// `existingTestRunId` to force a fresh run instead.
				if (run.status !== 'completed') {
					throw new BadRequestError(
						`versions[${index}]: test run "${v.existingTestRunId}" has status "${run.status}" and is not a completed result; omit it to run a fresh evaluation`,
					);
				}
			}
		}

		// 3. Persist the collection. We do this *before* kicking off any new
		// runs so the runs can be tagged with `collectionId` at creation time.
		const collection = await this.collectionRepo.createCollection({
			id: nanoid(),
			name: input.name,
			description: input.description ?? null,
			workflowId,
			evaluationConfigId: input.evaluationConfigId,
			createdById: user.id,
		});

		// 4. Wire up runs the user wants to reuse.
		const existingRunIds = input.versions
			.filter((v) => v.existingTestRunId)
			.map((v) => v.existingTestRunId!);
		if (existingRunIds.length > 0) {
			await this.collectionRepo.addRunsToCollection(collection.id, existingRunIds);
		}

		// 5. Kick off new runs for versions that weren't matched to an existing
		// run. For "current draft" entries we snapshot a `WorkflowHistory` row
		// first so the new run is pinned to an immutable version — otherwise
		// the next edit to the live workflow would invalidate the comparison.
		// Freeze the evaluation config for the same reason: future config edits
		// must not retroactively change what a historical run was evaluating.
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
	 * Re-attempts a collection's runs. Kicks off one fresh run per version the
	 * collection currently compares, then unlinks the old runs so the compare
	 * view shows only the new attempt.
	 *
	 * Two deliberate choices:
	 *  - The versions to re-run are derived from the collection's *current*
	 *    runs (their distinct pinned `workflowVersionId`s), so a re-run keeps
	 *    comparing exactly the same set of versions.
	 *  - The eval config is re-frozen from its *current* state, not the
	 *    original snapshot. A user typically re-runs because they fixed the
	 *    config; re-running against the stale frozen snapshot would just
	 *    reproduce the original failure. One fresh snapshot shared across every
	 *    version keeps the collection internally comparable.
	 */
	async rerunCollection(
		user: User,
		workflowId: string,
		collectionId: string,
	): Promise<{ record: EvaluationCollectionRecord; runsStartedIds: string[] }> {
		// 1. Load the collection + its runs (scoped to the workflow).
		const detail = await this.collectionRepo.getDetailByIdAndWorkflowId(collectionId, workflowId);
		if (!detail) throw new NotFoundError('Collection not found');
		const { collection, runs } = detail;

		// Reject while anything is still in flight — a second wave against a
		// collection that's still resolving the first would double the runs and
		// leave the compare view ambiguous about which attempt is current.
		if (runs.some((r) => r.status === 'new' || r.status === 'running')) {
			throw new BadRequestError('Collection run already in progress');
		}

		// 2. Derive the versions to re-run from the CURRENT runs: the distinct
		// pinned version ids in run order (this is what the collection compares).
		// Done BEFORE any unlink so we capture the on-screen membership.
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

		// 3. Re-freeze the CURRENT eval config (see the doc comment for why).
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

		// 4. Kick off one fresh run per derived version, linked to the collection.
		// If any version fails to start (e.g. its pinned WorkflowHistory was
		// pruned), roll back the fresh runs already created this call and leave
		// the OLD runs untouched, so the collection stays exactly in its
		// pre-rerun state rather than a partial mix of old + orphaned new runs.
		const runsStartedIds: string[] = [];
		try {
			for (const versionId of versionIds) {
				runsStartedIds.push(
					await this.startCollectionRun(user, workflowId, {
						collectionId: collection.id,
						workflowVersionId: versionId,
						evaluationConfigId: collection.evaluationConfigId,
						configSnapshot,
						concurrency: 1,
					}),
				);
			}
		} catch (error) {
			// Best-effort: detach only the fresh runs this call linked, so a
			// failed re-run adds nothing to the collection. Cleanup errors are
			// swallowed so the original failure is what propagates. The OLD runs
			// are deliberately left linked — they're still the collection's
			// valid state until every fresh run has started.
			for (const runId of runsStartedIds) {
				try {
					await this.collectionRepo.removeRunFromCollection(collection.id, runId);
				} catch {
					// Ignore cleanup failures; the original error is what matters.
				}
			}
			throw error;
		}

		// 5. Unlink the OLD runs so the compare view reflects only the fresh
		// attempt. Reached only after every fresh run started successfully, so a
		// partial failure never strips the old runs. The new runs created in
		// step 4 have distinct ids, so this only detaches the previous ones.
		for (const run of runs) {
			await this.collectionRepo.removeRunFromCollection(collection.id, run.id);
		}

		// Membership changed (old runs out, fresh runs in) — the cached insights
		// envelope was computed against the previous set and can't be trusted.
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

		// Resolve each metric's scale from the eval config so scores normalize by
		// scale rather than by metric name (a 1–5 judge metric works whatever it's
		// named). Passed through to the FE via `metricScales` and applied here when
		// deriving per-run avg scores.
		const scaleByMetric = await this.buildScaleByMetric(
			detail.collection.evaluationConfigId,
			workflowId,
		);
		const runs = detail.runs.map((r) => this.toRunSummary(r, scaleByMetric));
		return { ...this.toRecord(detail.collection, runs.length), runs, metricScales: scaleByMetric };
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
		// Verify the collection belongs to this workflow *before* any
		// cancellation side effects. Otherwise a caller with `workflow:update`
		// on workflow A could pass a known collection id from workflow B and
		// trigger cancellation (abort + pubsub fan-out + DB writes) before
		// receiving the eventual 404 from `deleteByIdAndWorkflowId`.
		const owned = await this.collectionRepo.findByIdAndWorkflowId(collectionId, workflowId);
		if (!owned) throw new NotFoundError('Collection not found');

		// If any runs in this collection are still active, broadcast a
		// collection-level cancel first so workers stop touching rows we're
		// about to unlink. The FK is SET NULL anyway, but cancelling avoids
		// post-delete writes flipping a deleted collection's runs back into
		// limbo on a foreign main.
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
		// Mirror the create-path invariant: an unpinned legacy run could have
		// executed against any historical workflow state, so it breaks the
		// comparability promise the collection exists to provide.
		if (!run.workflowVersionId) {
			throw new BadRequestError(
				'Test run has no pinned workflow version and cannot be added to a collection',
			);
		}

		await this.collectionRepo.addRunsToCollection(collectionId, [testRunId]);
		// Membership change invalidates the cached insights envelope — the
		// cached winner / regressions were computed against the prior set of
		// runs and can no longer be trusted.
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

		// Same invariant as `addRunToCollection` — removing a run also
		// shifts the comparable set, so previously-cached insights would
		// reference a version that no longer participates.
		await this.collectionRepo.updateInsightsCache(collectionId, null);
		return await this.getCollectionDetail(workflowId, collectionId);
	}

	/**
	 * Powers the setup wizard's versions table. Lists every named/auto-saved
	 * workflow history row for the workflow, joined with the last test run
	 * (if any) executed against the given `evaluationConfigId` on that
	 * version. The "current draft" row is synthesised on top of that — its
	 * `workflowVersionId` is null until the user commits.
	 *
	 * `★ best` / `⚠ low` annotations are computed in-memory from each
	 * version's `avgScore`: the highest is `isBest`, anything below 0.6 is
	 * `isCritical`. The thresholds match the spec mock and stay co-located
	 * with the data so the FE doesn't have to re-derive them.
	 */
	async getEvalVersions(
		workflowId: string,
		evaluationConfigId: string,
	): Promise<EvalVersionsResponse> {
		const config = await this.evalConfigRepo.findByIdAndWorkflowId(evaluationConfigId, workflowId);
		if (!config) {
			throw new NotFoundError('EvaluationConfig not found for this workflow');
		}

		// Per-metric scale for the versions-table avg-score annotations, so the
		// %/best/critical badges match the compare view's scoring.
		const scaleByMetric = metricScalesFromConfig(config.metrics);

		// Cheap metadata-only load: `WorkflowHistory.nodes` / `connections` are
		// fat JSON columns we never reference from the wizard's versions
		// table. Excluding them keeps response payloads small and avoids
		// streaming entire workflow canvases just to render labels.
		const history = await this.workflowHistoryRepo.find({
			where: { workflowId },
			order: { createdAt: 'DESC' },
			select: ['versionId', 'name', 'autosaved', 'createdAt'],
		});

		// One bulk query for the latest run per version against this config
		// instead of N+1 individual lookups. Sorted descending so the first
		// run seen per `workflowVersionId` is the latest — picked into the
		// per-version map below.
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
		// Only a completed run is a reusable result — the wizard offers this run
		// for reuse (via `existingTestRunId`), and a failed/cancelled/running run
		// has no comparable scores. Skipping non-completed runs surfaces the
		// latest *completed* run per version (or "no run yet" if none), so
		// re-running a version that last failed doesn't silently reuse the
		// failure.
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

		// One lookup for which version is currently published, so the
		// versions table can show "Published" as the source label instead of
		// the generic "Named" / "Autosaved" — matches spec §4's three-way
		// taxonomy (current draft / published / named snapshot).
		const publishedRow = await this.publishedVersionRepo.findOneBy({ workflowId });
		const publishedVersionId = publishedRow?.publishedVersionId ?? null;

		const versions: EvalVersionEntry[] = [];

		// Current draft row — `workflowVersionId: null` signals "snapshot at
		// run start". Always first in the list so the wizard surfaces it on
		// top of the table.
		//
		// `lastRun: null` here is intentional: runs without a `workflowVersionId`
		// (legacy one-offs) are not surfaced as draft history — they're
		// "Ungrouped runs" in the FE list view. Showing them here would
		// blur the boundary between draft + pinned-snapshot runs and lead
		// to off-by-one comparability bugs in the wizard.
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

		// Pass 2: annotate `isBest` / `isCritical` over the scored entries
		// only. Skipped if no version has a scored run yet — the wizard then
		// shows every row as "No run yet".
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
	 * compiles against, so a later config edit can't retroactively change what a
	 * historical run was evaluating. Dates are serialized to match the JSON the
	 * runner persists on the run row.
	 */
	private freezeConfigSnapshot(config: EvaluationConfig): IDataObject {
		return {
			...config,
			createdAt: config.createdAt.toISOString(),
			updatedAt: config.updatedAt.toISOString(),
		};
	}

	/**
	 * Kick off one collection-linked test run pinned to a workflow version,
	 * compiling the frozen eval config onto that version's snapshot. Shared by
	 * {@link createCollection} and {@link rerunCollection} so both schedule runs
	 * identically. Returns the new run id.
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
				// Compile the eval config (dataset + trigger + metric nodes) onto
				// each version's snapshot. Without this the run goes "direct" and
				// the raw versioned workflow has no evaluation trigger → the run
				// fails immediately with EVALUATION_TRIGGER_NOT_FOUND.
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
		scaleByMetric: Record<string, MetricScale>,
	): EvaluationCollectionRunSummary {
		return {
			testRunId: run.id,
			workflowVersionId: run.workflowVersionId,
			status: run.status,
			runAt: run.runAt ? run.runAt.toISOString() : null,
			completedAt: run.completedAt ? run.completedAt.toISOString() : null,
			avgScore: this.computeAvgScore(run, scaleByMetric),
			metrics: this.coerceMetrics(run.metrics),
		};
	}

	private computeAvgScore(run: TestRun, scaleByMetric: Record<string, MetricScale>): number | null {
		const coerced = this.coerceMetrics(run.metrics);
		if (!coerced) return null;
		// A "score" is a user-defined metric normalized to [0, 1] by its scale
		// (resolved from the eval config; AI-judge metrics are 1–5 → /5).
		// Operational metrics (token counts, execution time) normalize to null and
		// are excluded. Mirrors the FE's score model so the versions table's
		// %/best/critical annotations match the compare view; null when a run
		// reports no score metric.
		const scores = Object.entries(coerced)
			.map(([key, value]) => normalizeMetricScore(key, value, scaleByMetric[key]))
			.filter((value): value is number => value !== null);
		if (scores.length === 0) return null;
		return scores.reduce((acc, value) => acc + value, 0) / scores.length;
	}

	/**
	 * Loads the collection's eval config and maps each metric name to its scale.
	 * Returns an empty map (name-based fallback in `normalizeMetricScore`) when
	 * the config can't be found — e.g. a legacy config-less collection.
	 */
	private async buildScaleByMetric(
		evaluationConfigId: string,
		workflowId: string,
	): Promise<Record<string, MetricScale>> {
		const config = await this.evalConfigRepo.findByIdAndWorkflowId(evaluationConfigId, workflowId);
		return config ? metricScalesFromConfig(config.metrics) : {};
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
		// Compact relative-ish label for the source column. Frontend can format
		// further if it wants; this is a fallback for raw API consumers.
		return date.toISOString().slice(0, 10);
	}

	/**
	 * Three-way source-label taxonomy from spec §4. Published wins over
	 * named/autosaved when a version is both (a named snapshot can later be
	 * published; the wizard should surface it as "Published" then).
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
