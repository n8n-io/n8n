import type { CreateEvaluationCollectionPayload } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
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
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

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
	let collectionRepo: Mocked<EvaluationCollectionRepository>;
	let testRunRepo: Mocked<TestRunRepository>;
	let evalConfigRepo: Mocked<EvaluationConfigRepository>;
	let workflowHistoryRepo: Mocked<WorkflowHistoryRepository>;
	let publishedVersionRepo: Mocked<WorkflowPublishedVersionRepository>;
	let workflowHistoryService: Mocked<WorkflowHistoryService>;
	let testRunnerService: Mocked<TestRunnerService>;
	let telemetry: Mocked<Telemetry>;
	let logger: Mocked<Logger>;

	beforeEach(() => {
		collectionRepo = mock<EvaluationCollectionRepository>();
		testRunRepo = mock<TestRunRepository>();
		evalConfigRepo = mock<EvaluationConfigRepository>();
		workflowHistoryRepo = mock<WorkflowHistoryRepository>();
		publishedVersionRepo = mock<WorkflowPublishedVersionRepository>();
		workflowHistoryService = mock<WorkflowHistoryService>();
		testRunnerService = mock<TestRunnerService>();
		telemetry = mock<Telemetry>();
		logger = mock<Logger>();

		// Async no-op cleanup paths used by rerun rollback.
		collectionRepo.removeRunsFromCollection.mockResolvedValue(undefined);
		testRunnerService.cancelTestRun.mockResolvedValue(undefined);

		service = new EvaluationCollectionService(
			collectionRepo,
			testRunRepo,
			evalConfigRepo,
			workflowHistoryRepo,
			publishedVersionRepo,
			workflowHistoryService,
			testRunnerService,
			telemetry,
			logger,
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

		it('rejects when existingTestRunId references a run that has not completed', async () => {
			// A failed/cancelled/running run is not a reusable result — reusing
			// it would silently seed the collection with a broken version. The
			// caller must omit `existingTestRunId` to force a fresh run.
			testRunRepo.findOneBy.mockResolvedValueOnce(
				makeTestRun({ workflowVersionId: 'wfv-1', status: 'error' }),
			);
			await expect(
				service.createCollection(
					user,
					'wf-1',
					makePayload({
						versions: [{ workflowVersionId: 'wfv-1', existingTestRunId: 'tr-failed' }],
					}),
				),
			).rejects.toThrow(BadRequestError);
			expect(collectionRepo.createCollection).not.toHaveBeenCalled();
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

	describe('rerunCollection', () => {
		it('re-runs every version with fresh runs and unlinks the old runs', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-old-a', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-old-b', workflowVersionId: 'wfv-b', status: 'error' }),
				],
			});
			testRunnerService.startTestRun
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-a', status: 'new' }),
					finished: Promise.resolve(),
				})
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-b', status: 'new' }),
					finished: Promise.resolve(),
				});

			const { record, runsStartedIds } = await service.rerunCollection(user, 'wf-1', 'col-1');

			// One fresh run per distinct version, each linked to the collection,
			// compiled against a freshly-frozen config snapshot.
			expect(testRunnerService.startTestRun).toHaveBeenCalledTimes(2);
			expect(testRunnerService.startTestRun).toHaveBeenNthCalledWith(
				1,
				user,
				'wf-1',
				expect.any(Number),
				expect.objectContaining({
					workflowVersionId: 'wfv-a',
					collectionId: 'col-1',
					evaluationConfigId: 'cfg-1',
					evaluationConfigSnapshot: expect.objectContaining({ id: 'cfg-1' }),
					compileFromConfig: true,
				}),
			);
			expect(testRunnerService.startTestRun).toHaveBeenNthCalledWith(
				2,
				user,
				'wf-1',
				expect.any(Number),
				expect.objectContaining({ workflowVersionId: 'wfv-b' }),
			);

			// Old runs unlinked in one atomic call so the compare view shows only
			// the fresh attempt; insights cache busted.
			expect(collectionRepo.removeRunsFromCollection).toHaveBeenCalledWith('col-1', [
				'tr-old-a',
				'tr-old-b',
			]);
			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledWith('col-1', null);

			expect(runsStartedIds).toEqual(['tr-new-a', 'tr-new-b']);
			expect(record.runCount).toBe(2);
		});

		it('re-runs each distinct version once, preserving run order', async () => {
			// Two runs on the same version collapse to a single re-run; distinct
			// versions keep their run order.
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-1', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-2', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-3', workflowVersionId: 'wfv-b', status: 'completed' }),
				],
			});

			await service.rerunCollection(user, 'wf-1', 'col-1');

			expect(testRunnerService.startTestRun).toHaveBeenCalledTimes(2);
			const versionOrder = testRunnerService.startTestRun.mock.calls.map(
				(call) => call[3]?.workflowVersionId,
			);
			expect(versionOrder).toEqual(['wfv-a', 'wfv-b']);
		});

		it('emits Eval collection rerun telemetry', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeTestRun({ id: 'tr-old', workflowVersionId: 'wfv-a', status: 'completed' })],
			});

			await service.rerunCollection(user, 'wf-1', 'col-1');

			expect(telemetry.track).toHaveBeenCalledWith(
				'Eval collection rerun',
				expect.objectContaining({
					collection_id: 'col-1',
					evaluation_config_id: 'cfg-1',
					version_count: 1,
					new_run_count: 1,
					dataset_id: 'dt-1',
				}),
			);
		});

		it('rejects when a run is still in progress and schedules nothing', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-old-a', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-old-b', workflowVersionId: 'wfv-b', status: 'running' }),
				],
			});

			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow(BadRequestError);

			expect(testRunnerService.startTestRun).not.toHaveBeenCalled();
			expect(collectionRepo.removeRunFromCollection).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the collection does not exist', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce(null);
			await expect(service.rerunCollection(user, 'wf-1', 'col-x')).rejects.toThrow(NotFoundError);
			expect(testRunnerService.startTestRun).not.toHaveBeenCalled();
		});

		it('rejects when the collection eval config no longer exists', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeTestRun({ id: 'tr-old', workflowVersionId: 'wfv-a', status: 'completed' })],
			});
			evalConfigRepo.findByIdAndWorkflowId.mockResolvedValueOnce(null);

			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow(BadRequestError);
			expect(testRunnerService.startTestRun).not.toHaveBeenCalled();
		});

		it('rejects when the collection has no pinned versions and starts nothing', async () => {
			// Defensive guard: a collection whose runs are all unpinned has no
			// version to re-run against, so we reject rather than start zero runs.
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-1', workflowVersionId: null, status: 'completed' }),
					makeTestRun({ id: 'tr-2', workflowVersionId: null, status: 'completed' }),
				],
			});

			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow(BadRequestError);

			expect(testRunnerService.startTestRun).not.toHaveBeenCalled();
			expect(collectionRepo.removeRunFromCollection).not.toHaveBeenCalled();
		});

		it('rolls back the fresh runs and leaves the old runs linked when a version fails to start', async () => {
			// If startTestRun throws partway (e.g. a pinned WorkflowHistory was
			// pruned), the collection must return to its pre-rerun state: the
			// already-created fresh runs are unlinked, the OLD runs stay linked,
			// and the error propagates.
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-old-a', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-old-b', workflowVersionId: 'wfv-b', status: 'completed' }),
				],
			});
			testRunnerService.startTestRun
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-a', status: 'new' }),
					finished: Promise.resolve(),
				})
				.mockRejectedValueOnce(new Error('Workflow version wfv-b not found'));

			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow(
				'Workflow version wfv-b not found',
			);

			// The one fresh run that started is cancelled and unlinked; the old runs
			// are left untouched, and only that single cleanup unlink happens.
			expect(testRunnerService.cancelTestRun).toHaveBeenCalledWith('tr-new-a');
			expect(collectionRepo.removeRunsFromCollection).toHaveBeenCalledWith('col-1', ['tr-new-a']);
			expect(collectionRepo.removeRunsFromCollection).toHaveBeenCalledTimes(1);
			// A failed re-run never busts the insights cache — the collection is
			// unchanged, so the cached envelope is still valid.
			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
		});

		it('rolls back the fresh attempt when the old-run unlink fails, restoring the pre-rerun state', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-old-a', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-old-b', workflowVersionId: 'wfv-b', status: 'completed' }),
				],
			});
			testRunnerService.startTestRun
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-a', status: 'new' }),
					finished: Promise.resolve(),
				})
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-b', status: 'new' }),
					finished: Promise.resolve(),
				});
			// Both fresh runs start, then the old-run unlink fails; the rollback
			// unlink (fresh ids) still succeeds.
			collectionRepo.removeRunsFromCollection.mockImplementation(async (_id, ids) => {
				if (ids.includes('tr-old-a')) throw new Error('unlink old failed');
			});

			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow(
				'unlink old failed',
			);

			// Fresh runs are cancelled + unlinked; the old runs stay linked (their
			// atomic unlink threw before changing anything); cache is not busted.
			expect(testRunnerService.cancelTestRun).toHaveBeenCalledWith('tr-new-a');
			expect(testRunnerService.cancelTestRun).toHaveBeenCalledWith('tr-new-b');
			expect(collectionRepo.removeRunsFromCollection).toHaveBeenCalledWith('col-1', [
				'tr-new-a',
				'tr-new-b',
			]);
			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
		});

		it('logs when the rollback unlink itself fails, still throwing the original error', async () => {
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [
					makeTestRun({ id: 'tr-old-a', workflowVersionId: 'wfv-a', status: 'completed' }),
					makeTestRun({ id: 'tr-old-b', workflowVersionId: 'wfv-b', status: 'completed' }),
				],
			});
			testRunnerService.startTestRun
				.mockResolvedValueOnce({
					testRun: makeTestRun({ id: 'tr-new-a', status: 'new' }),
					finished: Promise.resolve(),
				})
				.mockRejectedValueOnce(new Error('start failed'));
			collectionRepo.removeRunsFromCollection.mockRejectedValue(new Error('cleanup failed'));

			// The original start error surfaces, not the cleanup error.
			await expect(service.rerunCollection(user, 'wf-1', 'col-1')).rejects.toThrow('start failed');

			// The rollback failure is reported rather than silently swallowed.
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('mixed run set'),
				expect.objectContaining({ collectionId: 'col-1' }),
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

		it('busts the insights cache after attaching a run (membership changed)', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			testRunRepo.findOneBy.mockResolvedValueOnce(
				makeTestRun({ id: 'tr-add', workflowVersionId: 'wfv-x', evaluationConfigId: 'cfg-1' }),
			);
			// Stub the post-write `getCollectionDetail` chain — service calls
			// `getDetailByIdAndWorkflowId` to build the response.
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [],
			});

			await service.addRunToCollection('wf-1', 'col-1', 'tr-add');

			expect(collectionRepo.addRunsToCollection).toHaveBeenCalledWith('col-1', ['tr-add']);
			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledWith('col-1', null);
		});
	});

	describe('removeRunFromCollection', () => {
		it('busts the insights cache after detaching a run', async () => {
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			collectionRepo.removeRunFromCollection.mockResolvedValueOnce(1);
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [],
			});

			await service.removeRunFromCollection('wf-1', 'col-1', 'tr-removed');

			expect(collectionRepo.removeRunFromCollection).toHaveBeenCalledWith('col-1', 'tr-removed');
			expect(collectionRepo.updateInsightsCache).toHaveBeenCalledWith('col-1', null);
		});

		it('does not bust the cache when the run was never part of the collection', async () => {
			// 404s land before the cache-bust path — guards against
			// inadvertently clearing valid caches when a stale FE retries
			// a removal that's already happened.
			collectionRepo.findByIdAndWorkflowId.mockResolvedValueOnce(makeCollection());
			collectionRepo.removeRunFromCollection.mockResolvedValueOnce(0);

			await expect(service.removeRunFromCollection('wf-1', 'col-1', 'tr-missing')).rejects.toThrow(
				NotFoundError,
			);

			expect(collectionRepo.updateInsightsCache).not.toHaveBeenCalled();
		});
	});

	describe('getCollectionDetail', () => {
		it('scores custom-named 1–5 judge metrics via the config scale and surfaces metricScales', async () => {
			// The bug: a 1–5 judge metric named anything other than
			// correctness/helpfulness scored null everywhere. Resolving the scale
			// from the config (not the name) fixes both avgScore and metricScales.
			const config = makeConfig({
				metrics: [
					{
						id: 'm1',
						name: 'Markdown Formatting',
						type: 'llm_judge',
						config: {
							preset: 'correctness',
							provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							credentialId: 'cred-1',
							model: 'gpt-4o',
							outputType: 'numeric',
							inputs: { actualAnswer: 'a', expectedAnswer: 'b' },
						},
					},
				],
			});
			evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(config);
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeTestRun({ id: 'tr-1', metrics: { 'Markdown Formatting': 5 } })],
			});

			const detail = await service.getCollectionDetail('wf-1', 'col-1');

			expect(detail.metricScales).toEqual({ 'Markdown Formatting': 'oneToFive' });
			expect(detail.runs[0].avgScore).toBe(1); // 5 / 5
		});

		it('returns an empty metricScales map when the config is gone (name-based fallback)', async () => {
			evalConfigRepo.findByIdAndWorkflowId.mockResolvedValue(null);
			collectionRepo.getDetailByIdAndWorkflowId.mockResolvedValueOnce({
				collection: makeCollection(),
				runs: [makeTestRun({ id: 'tr-1', metrics: { correctness: 5 } })],
			});

			const detail = await service.getCollectionDetail('wf-1', 'col-1');

			expect(detail.metricScales).toEqual({});
			// correctness still scores via the name-based fallback.
			expect(detail.runs[0].avgScore).toBe(1);
		});
	});

	describe('getEvalVersions', () => {
		it('surfaces only completed runs as reusable, skipping a version whose latest run failed', async () => {
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
			// Descending by createdAt, as the query returns them. wfv-a's latest
			// run failed but an earlier one completed → the completed one is
			// surfaced. wfv-b has only a failed run → no reusable run.
			testRunRepo.find.mockResolvedValueOnce([
				makeTestRun({
					id: 'tr-a-fail',
					workflowVersionId: 'wfv-a',
					status: 'error',
					createdAt: new Date('2026-04-05'),
				}),
				makeTestRun({
					id: 'tr-a-ok',
					workflowVersionId: 'wfv-a',
					status: 'completed',
					createdAt: new Date('2026-04-04'),
					metrics: { acc: 0.9 },
				}),
				makeTestRun({
					id: 'tr-b-fail',
					workflowVersionId: 'wfv-b',
					status: 'cancelled',
					createdAt: new Date('2026-04-03'),
				}),
			]);

			const result = await service.getEvalVersions('wf-1', 'cfg-1');

			const a = result.versions.find((v) => v.workflowVersionId === 'wfv-a');
			const b = result.versions.find((v) => v.workflowVersionId === 'wfv-b');
			expect(a?.lastRun?.testRunId).toBe('tr-a-ok');
			expect(b?.lastRun).toBeNull();
		});

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

		it('scores versions on normalized quality metrics, excluding token/time metrics', async () => {
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
			// correctness is a 1–5 metric → /5; tokens/executionTime are operational
			// and excluded, so avgScore is the correctness score alone rather than a
			// token-dominated mean in the thousands.
			testRunRepo.find.mockResolvedValueOnce([
				makeTestRun({
					id: 'tr-a',
					workflowVersionId: 'wfv-a',
					metrics: { correctness: 5, completionTokens: 1719, executionTime: 21368 },
				}),
				makeTestRun({
					id: 'tr-b',
					workflowVersionId: 'wfv-b',
					metrics: { correctness: 2, completionTokens: 540, executionTime: 11646 },
				}),
			]);

			const result = await service.getEvalVersions('wf-1', 'cfg-1');

			const a = result.versions.find((v) => v.workflowVersionId === 'wfv-a');
			const b = result.versions.find((v) => v.workflowVersionId === 'wfv-b');
			expect(a?.lastRun?.avgScore).toBe(1); // 5 / 5
			expect(b?.lastRun?.avgScore).toBeCloseTo(0.4); // 2 / 5
			expect(a?.lastRun?.isBest).toBe(true);
			expect(b?.lastRun?.isCritical).toBe(true); // 0.4 < 0.6
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
