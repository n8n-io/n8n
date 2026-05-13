import type { CreateEvaluationCollectionPayload } from '@n8n/api-types';
import type {
	EvaluationCollection,
	EvaluationCollectionRepository,
	EvaluationConfig,
	EvaluationConfigRepository,
	TestRun,
	TestRunRepository,
	User,
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowPublishedVersion,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Telemetry } from '@/telemetry';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { EvaluationCollectionService } from '../evaluation-collection.service';
import type { TestRunnerService } from '../test-runner/test-runner.service.ee';

function makeConfig(over: Partial<EvaluationConfig> = {}): EvaluationConfig {
	return {
		id: 'cfg-1',
		workflowId: 'wf-1',
		name: 'cfg',
		status: 'valid',
		invalidReason: null,
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		startNodeName: 'Start',
		endNodeName: 'End',
		metrics: [],
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-01-02T00:00:00Z'),
		workflow: undefined as never,
		...over,
	} as EvaluationConfig;
}

function makeCollection(over: Partial<EvaluationCollection> = {}): EvaluationCollection {
	return {
		id: 'col-1',
		name: 'My collection',
		description: null,
		workflowId: 'wf-1',
		evaluationConfigId: 'cfg-1',
		createdById: 'user-1',
		insightsCache: null,
		createdAt: new Date('2026-02-01T00:00:00Z'),
		updatedAt: new Date('2026-02-01T00:00:00Z'),
		workflow: undefined as never,
		evaluationConfig: undefined as never,
		...over,
	} as EvaluationCollection;
}

function makeTestRun(over: Partial<TestRun> = {}): TestRun {
	return {
		id: 'tr-1',
		status: 'completed',
		workflowId: 'wf-1',
		evaluationConfigId: 'cfg-1',
		workflowVersionId: 'wfv-1',
		collectionId: null,
		evaluationConfigSnapshot: null,
		metrics: { accuracy: 0.9 },
		runAt: new Date('2026-03-01T00:00:00Z'),
		completedAt: new Date('2026-03-01T00:01:00Z'),
		createdAt: new Date('2026-03-01T00:00:00Z'),
		updatedAt: new Date('2026-03-01T00:01:00Z'),
		errorCode: null,
		errorDetails: null,
		cancelRequested: false,
		runningInstanceId: null,
		workflow: undefined as never,
		testCaseExecutions: [],
		evaluationConfig: null,
		collection: null,
		...over,
	} as TestRun;
}

const user = mock<User>({ id: 'user-1' });

function makePayload(
	over: Partial<CreateEvaluationCollectionPayload> = {},
): CreateEvaluationCollectionPayload {
	return {
		name: 'My collection',
		evaluationConfigId: 'cfg-1',
		versions: [{ workflowVersionId: 'wfv-1' }],
		...over,
	};
}

describe('EvaluationCollectionService', () => {
	let service: EvaluationCollectionService;
	let collectionRepo: jest.Mocked<EvaluationCollectionRepository>;
	let testRunRepo: jest.Mocked<TestRunRepository>;
	let evalConfigRepo: jest.Mocked<EvaluationConfigRepository>;
	let workflowHistoryRepo: jest.Mocked<WorkflowHistoryRepository>;
	let publishedVersionRepo: jest.Mocked<WorkflowPublishedVersionRepository>;
	let workflowHistoryService: jest.Mocked<WorkflowHistoryService>;
	let testRunnerService: jest.Mocked<TestRunnerService>;
	let telemetry: jest.Mocked<Telemetry>;

	beforeEach(() => {
		collectionRepo = mock<EvaluationCollectionRepository>();
		testRunRepo = mock<TestRunRepository>();
		evalConfigRepo = mock<EvaluationConfigRepository>();
		workflowHistoryRepo = mock<WorkflowHistoryRepository>();
		publishedVersionRepo = mock<WorkflowPublishedVersionRepository>();
		workflowHistoryService = mock<WorkflowHistoryService>();
		testRunnerService = mock<TestRunnerService>();
		telemetry = mock<Telemetry>();

		service = new EvaluationCollectionService(
			collectionRepo,
			testRunRepo,
			evalConfigRepo,
			workflowHistoryRepo,
			publishedVersionRepo,
			workflowHistoryService,
			testRunnerService,
			telemetry,
		);

		evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(makeConfig());
		workflowHistoryService.findVersion.mockResolvedValue(
			mock<WorkflowHistory>({ versionId: 'wfv-1' }),
		);
		publishedVersionRepo.findOneBy.mockResolvedValue(null);
		workflowHistoryService.snapshotCurrent.mockResolvedValue({ versionId: 'wfv-snap' });
		testRunRepo.findOneBy.mockResolvedValue(makeTestRun());
		testRunRepo.find.mockResolvedValue([]);
		collectionRepo.createCollection.mockImplementation(async (input) =>
			makeCollection({ id: input.id, name: input.name, description: input.description }),
		);
		collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValue({
			collection: makeCollection(),
			runs: [],
		});
		testRunnerService.startTestRun.mockResolvedValue({
			testRun: makeTestRun({ id: 'tr-new', status: 'new' }),
			finished: Promise.resolve(),
		});
	});

	describe('createCollection', () => {
		it('rejects when the evaluation config does not belong to the workflow', async () => {
			evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(null);
			await expect(service.createCollection(user, 'wf-1', makePayload())).rejects.toThrow(
				NotFoundError,
			);
			expect(collectionRepo.createCollection).not.toHaveBeenCalled();
		});

		it('rejects when an existingTestRunId belongs to a different workflow', async () => {
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ workflowId: 'other-wf' }));
			await expect(
				service.createCollection(
					user,
					'wf-1',
					makePayload({
						versions: [{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-other' }],
					}),
				),
			).rejects.toThrow(BadRequestError);
			expect(collectionRepo.createCollection).not.toHaveBeenCalled();
		});

		it('rejects when an existingTestRunId belongs to a different evaluation config', async () => {
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ evaluationConfigId: 'cfg-other' }));
			await expect(
				service.createCollection(
					user,
					'wf-1',
					makePayload({
						versions: [{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-x' }],
					}),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('rejects when existingTestRunId was executed against a different workflow version than requested', async () => {
			// User asks "compare on wfv-A" but supplies a run that executed
			// on wfv-B. Without this guard the service would silently attach
			// the wfv-B run and never schedule wfv-A — the "collection on
			// wfv-A" would actually be "collection on wfv-B".
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ workflowVersionId: 'wfv-B' }));
			await expect(
				service.createCollection(
					user,
					'wf-1',
					makePayload({
						versions: [{ workflowVersionId: 'wfv-A', existingTestRunId: 'tr-x' }],
					}),
				),
			).rejects.toThrow(BadRequestError);
			expect(collectionRepo.createCollection).not.toHaveBeenCalled();
		});

		it('rejects when existingTestRunId is unpinned (legacy run with no workflowVersionId)', async () => {
			// Unpinned runs can have executed against any historical workflow
			// state, so they break collection comparability by construction.
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ workflowVersionId: null }));
			await expect(
				service.createCollection(
					user,
					'wf-1',
					makePayload({
						versions: [{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-legacy' }],
					}),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('attaches existing runs and schedules new runs for missing versions', async () => {
			await service.createCollection(
				user,
				'wf-1',
				makePayload({
					versions: [
						{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-existing' },
						{ workflowVersionId: 'wfv-2' },
					],
				}),
			);

			expect(collectionRepo.createCollection).toHaveBeenCalledTimes(1);
			expect(collectionRepo.addRunsToCollection).toHaveBeenCalledWith(expect.any(String), [
				'tr-existing',
			]);
			expect(testRunnerService.startTestRun).toHaveBeenCalledTimes(1);
			expect(testRunnerService.startTestRun).toHaveBeenCalledWith(
				user,
				'wf-1',
				expect.any(Number),
				expect.any(Boolean),
				expect.objectContaining({
					workflowVersionId: 'wfv-2',
					evaluationConfigId: 'cfg-1',
					collectionId: expect.any(String),
					evaluationConfigSnapshot: expect.objectContaining({ id: 'cfg-1' }),
				}),
			);
		});

		it('snapshots a new workflow version for "current draft" entries before scheduling', async () => {
			await service.createCollection(
				user,
				'wf-1',
				makePayload({
					versions: [{ workflowVersionId: null }],
				}),
			);

			expect(workflowHistoryService.snapshotCurrent).toHaveBeenCalledTimes(1);
			expect(workflowHistoryService.snapshotCurrent).toHaveBeenCalledWith('wf-1');
			expect(testRunnerService.startTestRun).toHaveBeenCalledWith(
				user,
				'wf-1',
				expect.any(Number),
				expect.any(Boolean),
				expect.objectContaining({ workflowVersionId: 'wfv-snap' }),
			);
		});

		it('emits Eval collection created telemetry with expected counts', async () => {
			await service.createCollection(
				user,
				'wf-1',
				makePayload({
					versions: [
						{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-existing' },
						{ workflowVersionId: 'wfv-2' },
						{ workflowVersionId: null },
					],
				}),
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'Eval collection created',
				expect.objectContaining({
					version_count: 3,
					existing_run_count: 1,
					new_run_count: 2,
					evaluation_config_id: 'cfg-1',
					dataset_id: 'dt-1',
				}),
			);
		});
	});

	describe('deleteCollection', () => {
		it('emits Eval collection deleted telemetry with runs_unlinked', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			collectionRepo.deleteByIdAndWorkflowId.mockResolvedValueOnce({
				deleted: true,
				runsUnlinked: 3,
			});

			await service.deleteCollection(user, 'wf-1', 'col-1');

			expect(telemetry.track).toHaveBeenCalledWith(
				'Eval collection deleted',
				expect.objectContaining({ collection_id: 'col-1', runs_unlinked: 3 }),
			);
		});

		it('broadcasts cancel-collection when any run is still active', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			testRunRepo.find.mockResolvedValueOnce([{ id: 'tr-active' } as TestRun]);
			collectionRepo.deleteByIdAndWorkflowId.mockResolvedValueOnce({
				deleted: true,
				runsUnlinked: 1,
			});

			await service.deleteCollection(user, 'wf-1', 'col-1');

			expect(testRunnerService.cancelCollection).toHaveBeenCalledWith('col-1');
		});

		it('throws NotFoundError when collection does not exist', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(null);
			await expect(service.deleteCollection(user, 'wf-1', 'col-x')).rejects.toThrow(NotFoundError);
		});

		it('does not cancel runs when the collection belongs to a different workflow', async () => {
			// A caller with `workflow:update` on wf-1 must not be able to
			// trigger cancellation side effects on a collection owned by
			// wf-other just by guessing its id — ownership has to be verified
			// before the active-runs query reaches the cancel path.
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(null);

			await expect(
				service.deleteCollection(user, 'wf-1', 'col-from-other-workflow'),
			).rejects.toThrow(NotFoundError);

			expect(testRunRepo.find).not.toHaveBeenCalled();
			expect(testRunnerService.cancelCollection).not.toHaveBeenCalled();
			expect(collectionRepo.deleteByIdAndWorkflowId).not.toHaveBeenCalled();
		});
	});

	describe('addRunToCollection', () => {
		it('rejects when the run belongs to a different evaluation config', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ evaluationConfigId: 'cfg-other' }));
			await expect(service.addRunToCollection('wf-1', 'col-1', 'tr-bad')).rejects.toThrow(
				BadRequestError,
			);
		});

		it('rejects when the run is unpinned (legacy run with no workflowVersionId)', async () => {
			// Mirrors the create-path invariant: an unpinned run could have
			// executed against any historical workflow state and therefore
			// cannot satisfy the collection's comparability promise.
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			testRunRepo.findOneBy.mockResolvedValueOnce(makeTestRun({ workflowVersionId: null }));

			await expect(service.addRunToCollection('wf-1', 'col-1', 'tr-legacy')).rejects.toThrow(
				BadRequestError,
			);

			expect(collectionRepo.addRunsToCollection).not.toHaveBeenCalled();
		});
	});

	describe('getEvalVersions', () => {
		it('annotates the highest-scoring version as best and runs below 0.6 as critical', async () => {
			const versions: WorkflowHistory[] = [
				mock<WorkflowHistory>({
					versionId: 'wfv-a',
					name: 'A',
					autosaved: false,
					createdAt: new Date('2026-04-01'),
				}),
				mock<WorkflowHistory>({
					versionId: 'wfv-b',
					name: 'B',
					autosaved: false,
					createdAt: new Date('2026-04-02'),
				}),
			];
			workflowHistoryRepo.find.mockResolvedValueOnce(versions);
			// Single bulk lookup, descending by createdAt — service picks the
			// first row per `workflowVersionId` it sees, which is the latest.
			testRunRepo.find.mockResolvedValueOnce([
				makeTestRun({ id: 'tr-a', workflowVersionId: 'wfv-a', metrics: { acc: 0.9 } }),
				makeTestRun({ id: 'tr-b', workflowVersionId: 'wfv-b', metrics: { acc: 0.5 } }),
			]);

			const result = await service.getEvalVersions('wf-1', 'cfg-1');

			const a = result.versions.find((v) => v.workflowVersionId === 'wfv-a');
			const b = result.versions.find((v) => v.workflowVersionId === 'wfv-b');
			expect(a?.lastRun?.isBest).toBe(true);
			expect(a?.lastRun?.isCritical).toBe(false);
			expect(b?.lastRun?.isBest).toBe(false);
			expect(b?.lastRun?.isCritical).toBe(true);
		});

		it('includes a current-draft row with no last run', async () => {
			workflowHistoryRepo.find.mockResolvedValueOnce([]);
			const result = await service.getEvalVersions('wf-1', 'cfg-1');
			expect(result.versions[0]).toEqual(
				expect.objectContaining({
					workflowVersionId: null,
					isCurrent: true,
					lastRun: null,
				}),
			);
		});

		it('current-draft entry ignores runs without a workflowVersionId (legacy one-offs)', async () => {
			// Legacy runs that pre-date eval-collections have no
			// `workflowVersionId`. The wizard surfaces them as "Ungrouped
			// runs" elsewhere, not in the versions picker — the current-draft
			// row stays `lastRun: null` regardless.
			workflowHistoryRepo.find.mockResolvedValueOnce([]);
			testRunRepo.find.mockResolvedValueOnce([
				makeTestRun({ id: 'tr-legacy', workflowVersionId: null, metrics: { acc: 0.95 } }),
			]);

			const result = await service.getEvalVersions('wf-1', 'cfg-1');

			const draft = result.versions.find((v) => v.workflowVersionId === null);
			expect(draft?.lastRun).toBeNull();
		});

		it('issues exactly one bulk run lookup regardless of history size', async () => {
			const history = Array.from({ length: 10 }, (_, i) =>
				mock<WorkflowHistory>({
					versionId: `wfv-${i}`,
					name: `v${i}`,
					autosaved: false,
					createdAt: new Date(`2026-04-${i + 1 < 10 ? '0' + (i + 1) : i + 1}`),
				}),
			);
			workflowHistoryRepo.find.mockResolvedValueOnce(history);
			testRunRepo.find.mockResolvedValueOnce([]);

			await service.getEvalVersions('wf-1', 'cfg-1');

			expect(testRunRepo.find).toHaveBeenCalledTimes(1);
		});

		it('loads history with a metadata-only column selection (skips nodes/connections JSON)', async () => {
			workflowHistoryRepo.find.mockResolvedValueOnce([]);
			testRunRepo.find.mockResolvedValueOnce([]);

			await service.getEvalVersions('wf-1', 'cfg-1');

			expect(workflowHistoryRepo.find).toHaveBeenCalledWith(
				expect.objectContaining({
					select: expect.arrayContaining(['versionId', 'name', 'autosaved', 'createdAt']),
				}),
			);
			// Sanity: nodes/connections should not be in the selection (those are
			// the fat columns we're deliberately excluding).
			const call = workflowHistoryRepo.find.mock.calls[0][0] as { select: string[] };
			expect(call.select).not.toContain('nodes');
			expect(call.select).not.toContain('connections');
		});

		it('labels the currently-published version as "Published" rather than "Named"', async () => {
			workflowHistoryRepo.find.mockResolvedValueOnce([
				mock<WorkflowHistory>({
					versionId: 'wfv-pub',
					name: 'v3',
					autosaved: false,
					createdAt: new Date('2026-04-01'),
				}),
				mock<WorkflowHistory>({
					versionId: 'wfv-named',
					name: 'experiment',
					autosaved: false,
					createdAt: new Date('2026-04-02'),
				}),
				mock<WorkflowHistory>({
					versionId: 'wfv-auto',
					name: null,
					autosaved: true,
					createdAt: new Date('2026-04-03'),
				}),
			]);
			testRunRepo.find.mockResolvedValueOnce([]);
			publishedVersionRepo.findOneBy.mockResolvedValueOnce(
				mock<WorkflowPublishedVersion>({ publishedVersionId: 'wfv-pub' }),
			);

			const result = await service.getEvalVersions('wf-1', 'cfg-1');

			const pub = result.versions.find((v) => v.workflowVersionId === 'wfv-pub');
			const named = result.versions.find((v) => v.workflowVersionId === 'wfv-named');
			const auto = result.versions.find((v) => v.workflowVersionId === 'wfv-auto');
			expect(pub?.sourceLabel).toMatch(/^Published/);
			expect(named?.sourceLabel).toMatch(/^Named/);
			expect(auto?.sourceLabel).toMatch(/^Autosaved/);
		});
	});
});
