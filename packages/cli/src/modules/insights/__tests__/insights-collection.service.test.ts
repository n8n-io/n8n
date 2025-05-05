import type { Project } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import type { IWorkflowDb } from '@n8n/db';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { In, type EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { Logger } from 'n8n-core';
import {
	createDeferredPromise,
	type ExecutionStatus,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import type { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import type { TypeUnit } from '@/modules/insights/database/entities/insights-shared';
import { InsightsMetadataRepository } from '@/modules/insights/database/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';
import { mockLogger } from '@test/mocking';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import { InsightsCollectionService } from '../insights-collection.service';
import { InsightsConfig } from '../insights.config';

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init(['insights']);
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'Workflow',
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
	let entityManagerMock = mock<EntityManager>();
	const sharedWorkflowRepositoryMock: jest.Mocked<SharedWorkflowRepository> = {
		manager: entityManagerMock,
	} as unknown as jest.Mocked<SharedWorkflowRepository>;

	const startedAt = DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = mock<IRun>({
		mode: 'webhook',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});

	// Mock the transaction function
	const trxMock = {
		find: jest.fn(),
		findBy: jest.fn(),
		upsert: jest.fn(),
		insert: jest.fn(),
	};

	entityManagerMock.transaction.mockImplementation(
		jest.fn(async (runInTransaction: (entityManager: EntityManager) => Promise<void>) => {
			await runInTransaction(trxMock as unknown as EntityManager);
		}) as unknown as EntityManager['transaction'],
	);

	beforeAll(async () => {
		insightsCollectionService = new InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			Container.get(InsightsConfig),
			mockLogger(),
		);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({}, project);

		trxMock.find = jest.fn().mockResolvedValue([
			{
				workflow,
				workflowId: workflow.id,
				projectId: 'project-id',
				project: { name: 'project-name' },
			},
		]);
		trxMock.findBy = jest.fn().mockResolvedValue([
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
		expect(trxMock.find).toHaveBeenCalledWith(expect.anything(), {
			where: { workflowId: In([workflow.id]), role: 'workflow:owner' },
			relations: { project: true },
		});
		expect(trxMock.upsert).toHaveBeenCalledWith(
			expect.anything(),
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
		trxMock.find.mockClear();
		trxMock.upsert.mockClear();
		expect(trxMock.find).not.toHaveBeenCalled();
		expect(trxMock.upsert).not.toHaveBeenCalled();
	});

	test('updates cached metadata if workflow details change', async () => {
		// ARRANGE
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT
		expect(trxMock.find).toHaveBeenCalled();
		expect(trxMock.upsert).toHaveBeenCalled();

		// Change the workflow name
		workflow.name = 'new-workflow-name';

		// ACT AGAIN with the same workflow
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();

		// ASSERT AGAIN
		expect(trxMock.find).toHaveBeenCalledWith(expect.anything(), {
			where: { workflowId: In([workflow.id]), role: 'workflow:owner' },
			relations: { project: true },
		});
		expect(trxMock.upsert).toHaveBeenCalledWith(
			expect.anything(),
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
	let entityManagerMock = mock<EntityManager>();
	const sharedWorkflowRepositoryMock: jest.Mocked<SharedWorkflowRepository> = {
		manager: entityManagerMock,
	} as unknown as jest.Mocked<SharedWorkflowRepository>;
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnValue(
			mock<Logger>({
				error: jest.fn(),
			}),
		),
	});

	const startedAt = DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = mock<IRun>({
		mode: 'trigger',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});

	// Mock the transaction function
	const trxMock = {
		find: jest.fn(),
		findBy: jest.fn(),
		upsert: jest.fn(),
		insert: jest.fn(),
	};

	entityManagerMock.transaction.mockImplementation(
		jest.fn(async (runInTransaction: (entityManager: EntityManager) => Promise<void>) => {
			await runInTransaction(trxMock as unknown as EntityManager);
		}) as unknown as EntityManager['transaction'],
	);

	beforeAll(async () => {
		insightsCollectionService = new InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			Container.get(InsightsConfig),
			logger,
		);
	});

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({ settings: { timeSavedPerExecution: 1 } }, project);
		trxMock.find = jest.fn().mockResolvedValue([
			{
				workflow,
				workflowId: workflow.id,
				projectId: 'project-id',
				project: { name: 'project-name' },
			},
		]);
		trxMock.findBy = jest.fn().mockResolvedValue([
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
		expect(trxMock.insert).not.toHaveBeenCalled();

		// ACT
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);

		// ASSERT
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);
		expect(trxMock.insert).toHaveBeenCalled();
	});

	test('flushes events to the database after a timeout', async () => {
		// ARRANGE
		jest.useFakeTimers();
		trxMock.insert.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		try {
			// ACT
			for (let i = 0; i < 33; i++) {
				await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			}
			// ASSERT
			expect(trxMock.insert).not.toHaveBeenCalled();

			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(trxMock.insert).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
		}
	});

	test('reschedule flush on flushing end', async () => {
		// ARRANGE
		jest.useFakeTimers();
		trxMock.insert.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow });

		try {
			// ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(trxMock.insert).toHaveBeenCalledTimes(1);

			// // ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			expect(trxMock.insert).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});

	test('reschedule flush on no buffered insights', async () => {
		// ARRANGE
		jest.useFakeTimers();
		trxMock.insert.mockClear();
		insightsCollectionService.startFlushingTimer();
		const flushEventsSpy = jest.spyOn(insightsCollectionService, 'flushEvents');

		try {
			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(flushEventsSpy).toHaveBeenCalledTimes(1);
			expect(trxMock.insert).not.toHaveBeenCalled();

			// ACT
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(flushEventsSpy).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});

	test('flushes events to the database on shutdown', async () => {
		// ARRANGE
		trxMock.insert.mockClear();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		await insightsCollectionService.shutdown();

		// ASSERT
		expect(trxMock.insert).toHaveBeenCalledTimes(1);
		// Check that last insert call contains 30 events (10 * 3 insights)
		const lastCallArgs = trxMock.insert.mock.calls.at(-1);
		expect(lastCallArgs?.[1]).toHaveLength(30);
	});

	test('flushes events synchronously while shutting down', async () => {
		// ARRANGE
		// reset insights async flushing
		insightsCollectionService.startFlushingTimer();
		trxMock.insert.mockClear();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}

		void insightsCollectionService.shutdown();
		// trigger a workflow after shutdown
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);

		// ASSERT
		expect(trxMock.insert).toHaveBeenCalledTimes(2);
		// Check that last insert call contains 3 events (the synchronous flush after shutdown)
		let callArgs = trxMock.insert.mock.calls.at(-1);
		expect(callArgs?.[1]).toHaveLength(3);

		// ACT
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);

		// Check that the one before that contains 30 events (the shutdown flush)
		callArgs = trxMock.insert.mock.calls.at(-2);
		expect(callArgs?.[1]).toHaveLength(30);
	});

	test('restore buffer events on flushing error', async () => {
		// ARRANGE
		jest.useFakeTimers();
		trxMock.insert.mockClear();
		trxMock.insert.mockRejectedValueOnce(new Error('Test error'));
		insightsCollectionService.startFlushingTimer();
		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		try {
			// ACT
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(trxMock.insert).toHaveBeenCalledTimes(1);
			const insertArgs = trxMock.insert.mock.calls.at(-1);

			// ACT
			await insightsCollectionService.flushEvents();

			expect(trxMock.insert).toHaveBeenCalledTimes(2);
			const newInsertArgs = trxMock.insert.mock.calls.at(-1);
			// Check that last insert call contains the same 3 insights as previous failed flush
			expect(newInsertArgs?.[1]).toHaveLength(3);
			expect(newInsertArgs?.[1]).toEqual(insertArgs?.[1]);
		} finally {
			jest.useRealTimers();
		}
	});

	test('waits for ongoing flush during shutdown', async () => {
		// ARRANGE
		const config = Container.get(InsightsConfig);
		config.flushBatchSize = 10;
		insightsCollectionService.startFlushingTimer();
		trxMock.insert.mockClear();

		const ctx = mock<WorkflowExecuteAfterContext>({ workflow, runData });

		// Flush will hang until we manually resolve it
		const { resolve: flushResolve, promise: flushPromise } = createDeferredPromise();

		// First flush will "hang" (simulate long save)
		trxMock.insert.mockImplementationOnce(async () => {
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
		expect(trxMock.insert).toHaveBeenCalledTimes(1);
	});
});
