import type {
	CreateEvaluationCollectionPayload,
	EvalVersionEntry,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	EvaluationCollectionRunSummary,
	UpdateEvaluationCollectionPayload,
} from '@n8n/api-types';
import type { TestRun, User } from '@n8n/db';
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
		// Freeze the evaluation config in `evaluationConfigSnapshot` for the
		// same reason: future config edits must not retroactively change what
		// a historical run was evaluating.
		const configSnapshot = {
			...config,
			createdAt: config.createdAt.toISOString(),
			updatedAt: config.updatedAt.toISOString(),
		};

		const runsStartedIds: string[] = [];
		for (const v of input.versions) {
			if (v.existingTestRunId) continue;

			const versionId =
				v.workflowVersionId ??
				(await this.workflowHistoryService.snapshotCurrent(workflowId)).versionId;

			const { testRun } = await this.testRunnerService.startTestRun(
				user,
				workflowId,
				input.concurrency ?? 1,
				(input.concurrency ?? 1) > 1,
				{
					collectionId: collection.id,
					workflowVersionId: versionId,
					evaluationConfigId: input.evaluationConfigId,
					evaluationConfigSnapshot: configSnapshot,
				},
			);
			runsStartedIds.push(testRun.id);
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

		const runs = detail.runs.map((r) => this.toRunSummary(r));
		return { ...this.toRecord(detail.collection, runs.length), runs };
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
		const latestRunByVersion = new Map<string, TestRun>();
		for (const run of lastRuns) {
			if (run.workflowVersionId && !latestRunByVersion.has(run.workflowVersionId)) {
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
							avgScore: this.computeAvgScore(lastRun),
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

	private toRunSummary(run: TestRun): EvaluationCollectionRunSummary {
		return {
			testRunId: run.id,
			workflowVersionId: run.workflowVersionId,
			status: run.status,
			runAt: run.runAt ? run.runAt.toISOString() : null,
			completedAt: run.completedAt ? run.completedAt.toISOString() : null,
			avgScore: this.computeAvgScore(run),
			metrics: this.coerceMetrics(run.metrics),
		};
	}

	private computeAvgScore(run: TestRun): number | null {
		const coerced = this.coerceMetrics(run.metrics);
		if (!coerced) return null;
		const values = Object.values(coerced);
		if (values.length === 0) return null;
		const sum = values.reduce((acc, v) => acc + v, 0);
		return sum / values.length;
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
