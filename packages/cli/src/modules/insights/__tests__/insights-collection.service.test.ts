import {
	mockLogger,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, WorkflowEntity, IWorkflowDb, SharedWorkflowRepository } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import {
	createDeferredPromise,
	type ExecutionStatus,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import type { TypeUnit } from '@/modules/insights/database/entities/insights-shared';
import { InsightsMetadataRepository } from '@/modules/insights/database/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';

import { InsightsCollectionService } from '../insights-collection.service';
import { InsightsConfig } from '../insights.config';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
});

describe('workflowExecuteAfterHandler', () => {
	let insightsCollectionService: InsightsCollectionService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: InsightsMetadataRepository;
	beforeAll(async () => {
		insightsCollectionService = Container.get(InsightsCollectionService);
		insightsRawRepository = Container.get(InsightsRawRepository);
		insightsMetadataRepository = Container.get(InsightsMetadataRepository);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow(
			{
				settings: {
					timeSavedPerExecution: 3,
				},
			},
			project,
		);
	});

	test.each<{ status: ExecutionStatus; type: TypeUnit }>([
		{ status: 'success', type: 'success' },
		{ status: 'error', type: 'failure' },
		{ status: 'crashed', type: 'failure' },
	])('stores events for executions with the status `$status`', async ({ status, type }) => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		const now = DateTime.utc().toJSDate();
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });

		if (!metadata) {
			return fail('expected metadata to exist');
		}

		expect(metadata).toMatchObject({
			workflowId: workflow.id,
			workflowName: workflow.name,
			projectId: project.id,
			projectName: project.name,
		});

		const allInsights = await insightsRawRepository.find();
		expect(allInsights).toHaveLength(status === 'success' ? 3 : 2);
		expect(allInsights).toContainEqual(
			expect.objectContaining({ metaId: metadata.metaId, type, value: 1 }),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'runtime_ms',
				value: stoppedAt.diff(startedAt).toMillis(),
			}),
		);
		// expect timestamp to be close to workflow execution start
		for (const insight of allInsights) {
			const timeDiffInSeconds = Math.abs(
				Math.round(insight.timestamp.getTime() / 1000) - Math.round(now.getTime() / 1000),
			);
			expect(timeDiffInSeconds).toBeLessThanOrEqual(1);
		}
		if (status === 'success') {
			expect(allInsights).toContainEqual(
				expect.objectContaining({
					metaId: metadata.metaId,
					type: 'time_saved_min',
					value: 3,
				}),
			);
		}
	});

	test.each<{ status: ExecutionStatus }>([
		{ status: 'waiting' },
		{ status: 'canceled' },
		{ status: 'unknown' },
		{ status: 'new' },
		{ status: 'running' },
	])('does not store events for executions with the status `$status`', async ({ status }) => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
		const allInsights = await insightsRawRepository.find();
		expect(metadata).toBeNull();
		expect(allInsights).toHaveLength(0);
	});

	test.each<{ mode: WorkflowExecuteMode }>([
		{ mode: 'internal' },
		{ mode: 'manual' },
		{ mode: 'integrated' },
	])('does not store events for executions with the mode `$mode`', async ({ mode }) => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
		const allInsights = await insightsRawRepository.find();
		expect(metadata).toBeNull();
		expect(allInsights).toHaveLength(0);
	});

	test.each<{ mode: WorkflowExecuteMode }>([
		{ mode: 'evaluation' },
		{ mode: 'error' },
		{ mode: 'cli' },
		{ mode: 'retry' },
		{ mode: 'trigger' },
		{ mode: 'webhook' },
	])('stores events for executions with the mode `$mode`', async ({ mode }) => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = mock<IRun>({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });

		if (!metadata) {
			return fail('expected metadata to exist');
		}

		expect(metadata).toMatchObject({
			workflowId: workflow.id,
			workflowName: workflow.name,
			projectId: project.id,
			projectName: project.name,
		});

		const allInsights = await insightsRawRepository.find();
		expect(allInsights).toHaveLength(3);
		expect(allInsights).toContainEqual(
			expect.objectContaining({ metaId: metadata.metaId, type: 'success', value: 1 }),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'runtime_ms',
				value: stoppedAt.diff(startedAt).toMillis(),
			}),
		);
		expect(allInsights).toContainEqual(
			expect.objectContaining({
				metaId: metadata.metaId,
				type: 'time_saved_min',
				value: 3,
			}),
		);
	});
});

describe('workflowExecuteAfterHandler - cacheMetadata', () => {
	let insightsCollectionService: InsightsCollectionService;

	// Mock the repositories functions
	const repositoryMocks = {
		find: jest.fn(),
		findBy: jest.fn(),
		upsert: jest.fn(),
		insert: jest.fn(),
	};
	const sharedWorkflowRepositoryMock = mock<SharedWorkflowRepository>(repositoryMocks);
	const metadataRepositoryMock = mock<InsightsMetadataRepository>(repositoryMocks);
	const insightsRawRepositoryMock = mock<InsightsRawRepository>(repositoryMocks);

	const startedAt = DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = mock<IRun>({
		mode: 'webhook',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});

	beforeAll(async () => {
		insightsCollectionService = new InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			insightsRawRepositoryMock,
			metadataRepositoryMock,
			Container.get(InsightsConfig),
			mockLogger(),
		);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({}, project);

		repositoryMocks.find = jest.fn().mockResolvedValue([
			{
				workflow,
				workflowId: workflow.id,
				projectId: 'project-id',
				project: { name: 'project-name' },
			},
		]);
		repositoryMocks.findBy = jest.fn().mockResolvedValue([
			{
				metaId: 'meta-id',
				workflowId: workflow.id,
				workflowName: workflow.name,
				projectId: 'project-id',
				projectName: 'project-name',
			},
		]);
	});

	test('reuses cached metadata for subsequent executions of the same workflow', async () => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({
			workflow: { ...workflow, settings: undefined },
			runData,
		});

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		expect(repositoryMocks.find).toHaveBeenCalledWith({
			where: { workflowId: In([workflow.id]), role: 'workflow:owner' },
			relations: { project: true },
		});
		expect(repositoryMocks.upsert).toHaveBeenCalledWith(
			expect.arrayContaining([
				{
					workflowId: workflow.id,
					workflowName: workflow.name,
					projectId: 'project-id',
					projectName: 'project-name',
				},
			]),
			['workflowId'],
		);

		// ACT AGAIN with the same workflow
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT AGAIN
		repositoryMocks.find.mockClear();
		repositoryMocks.upsert.mockClear();
		expect(repositoryMocks.find).not.toHaveBeenCalled();
		expect(repositoryMocks.upsert).not.toHaveBeenCalled();
	});

	test('updates cached metadata if workflow details change', async () => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		expect(repositoryMocks.find).toHaveBeenCalled();
		expect(repositoryMocks.upsert).toHaveBeenCalled();

		// Change the workflow name
		workflow.name = 'new-workflow-name';

		// ACT AGAIN with the same workflow
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT AGAIN
		expect(repositoryMocks.find).toHaveBeenCalledWith({
			where: { workflowId: In([workflow.id]), role: 'workflow:owner' },
			relations: { project: true },
		});
		expect(repositoryMocks.upsert).toHaveBeenCalledWith(
			expect.arrayContaining([
				{
					workflowId: workflow.id,
					workflowName: workflow.name,
					projectId: 'project-id',
					projectName: 'project-name',
				},
			]),
			['workflowId'],
		);
	});
});

describe('workflowExecuteAfterHandler - flushEvents', () => {
	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;
	let insightsCollectionService: InsightsCollectionService;

	const repoMocks = {
		findSharedWorkflowRepositoryMock: jest.fn(),
		findByMetadata: jest.fn(),
		upsertMetadata: jest.fn(),
		insertInsightsRaw: jest.fn(),
	};
	const sharedWorkflowRepositoryMock = mock<SharedWorkflowRepository>({
		find: repoMocks.findSharedWorkflowRepositoryMock,
	});
	const metadataRepositoryMock = mock<InsightsMetadataRepository>({
		findBy: repoMocks.findByMetadata,
		upsert: repoMocks.upsertMetadata,
	});
	const insightsRawRepositoryMock = mock<InsightsRawRepository>({
		insert: repoMocks.insertInsightsRaw,
	});
	const startedAt = DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = mock<IRun>({
		mode: 'trigger',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});

	beforeAll(async () => {
		insightsCollectionService = new InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			insightsRawRepositoryMock,
			metadataRepositoryMock,
			Container.get(InsightsConfig),
			mockLogger(),
		);
	});

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({ settings: { timeSavedPerExecution: 1 } }, project);
		repoMocks.findSharedWorkflowRepositoryMock.mockResolvedValue([
			{
				workflow,
				workflowId: workflow.id,
				projectId: 'project-id',
				project: { name: 'project-name' },
			},
		]);
		repoMocks.findByMetadata.mockResolvedValue([
			{
				metaId: 'meta-id',
				workflowId: workflow.id,
				workflowName: workflow.name,
				projectId: 'project-id',
				projectName: 'project-name',
			},
		]);
	});

	test('flushes events to the database once buffer is full', async () => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// ACT
		// each `workflowExecuteAfterHandler` adds 3 insights (status, runtime, time saved);
		// we call it 333 times be 1 away from the flushBatchSize (1000)
		for (let i = 0; i < 333; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);

		// ASSERT
		expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);

		// ASSERT
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalled();
	});

	test('flushes events to the database after a timeout', async () => {
		// ARRANGE
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		try {
			// ACT
			for (let i = 0; i < 33; i++) {
				await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			}
			// ASSERT
			expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();

			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
		}
	});

	test('reschedule flush on flushing end', async () => {
		// ARRANGE
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });

		try {
			// ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);

			// // ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});

	test('reschedule flush on no buffered insights', async () => {
		// ARRANGE
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const flushEventsSpy = jest.spyOn(insightsCollectionService, 'flushEvents');

		try {
			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(flushEventsSpy).toHaveBeenCalledTimes(1);
			expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();

			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(flushEventsSpy).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});

	test('flushes events to the database on shutdown', async () => {
		// ARRANGE
		repoMocks.insertInsightsRaw.mockClear();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		await insightsCollectionService.shutdown();

		// ASSERT
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
		// Check that last insert call contains 30 events (10 * 3 insights)
		const lastCallArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
		expect(lastCallArgs?.[0]).toHaveLength(30);
	});

	test('flushes events synchronously while shutting down', async () => {
		// ARRANGE
		// reset insights async flushing
		insightsCollectionService.startFlushingTimer();
		repoMocks.insertInsightsRaw.mockClear();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		void insightsCollectionService.shutdown();
		// trigger a workflow after shutdown
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);

		// ASSERT
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
		// Check that last insert call contains 3 events (the synchronous flush after shutdown)
		let callArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
		expect(callArgs?.[0]).toHaveLength(3);

		// ACT
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);

		// Check that the one before that contains 30 events (the shutdown flush)
		callArgs = repoMocks.insertInsightsRaw.mock.calls.at(-2);
		expect(callArgs?.[0]).toHaveLength(30);
	});

	test('restore buffer events on flushing error', async () => {
		// ARRANGE
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		repoMocks.insertInsightsRaw.mockRejectedValueOnce(new Error('Test error'));
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		try {
			// ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
			const insertArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);

			// ACT
			await insightsCollectionService.flushEvents();

			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
			const newInsertArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
			// Check that last insert call contains the same 3 insights as previous failed flush
			expect(newInsertArgs?.[0]).toHaveLength(3);
			expect(newInsertArgs?.[0]).toEqual(insertArgs?.[0]);
		} finally {
			jest.useRealTimers();
		}
	});

	test('waits for ongoing flush during shutdown', async () => {
		// ARRANGE
		const config = Container.get(InsightsConfig);
		config.flushBatchSize = 10;
		insightsCollectionService.startFlushingTimer();
		repoMocks.insertInsightsRaw.mockClear();

		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// Flush will hang until we manually resolve it
		const { resolve: flushResolve, promise: flushPromise } = createDeferredPromise();

		// First flush will "hang" (simulate long save)
		repoMocks.insertInsightsRaw.mockImplementationOnce(async () => {
			await flushPromise;
		});

		// Each `workflowExecuteAfterHandler` adds 3 insights;
		// we call it 4 times to exceed the flushBatchSize (10)
		for (let i = 0; i < config.flushBatchSize / 3; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		// ACT
		const shutdownPromise = insightsCollectionService.shutdown();

		// At this point, shutdown should be waiting for ongoing flushes
		let shutdownResolved = false;
		void shutdownPromise.then(() => (shutdownResolved = true));

		// Give shutdown a tick to reach the `await Promise.all(...)`
		await new Promise(setImmediate);

		// ASSERT

		// shutdown should still be waiting for remaining flushes
		expect(shutdownResolved).toBe(false);

		// ACT
		// Now resolve the hanging flush and await shutdown
		flushResolve();
		await shutdownPromise;

		// ASSERT
		expect(shutdownResolved).toBe(true);
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
	});
});
