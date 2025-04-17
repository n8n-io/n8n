import { Container } from '@n8n/di';
import { In, type EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { Logger } from 'n8n-core';
import { type ExecutionLifecycleHooks } from 'n8n-core';
import {
	createDeferredPromise,
	type ExecutionStatus,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import type { Project } from '@/databases/entities/project';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import type { IWorkflowDb } from '@/interfaces';
import type { TypeUnit } from '@/modules/insights/database/entities/insights-shared';
import { InsightsMetadataRepository } from '@/modules/insights/database/repositories/insights-metadata.repository';
import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import {
	createMetadata,
	createRawInsightsEvent,
	createCompactedInsightsEvent,
	createRawInsightsEvents,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsConfig } from '../insights.config';
import { InsightsService } from '../insights.service';

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
	let insightsService: InsightsService;
	let insightsRawRepository: InsightsRawRepository;
	let insightsMetadataRepository: InsightsMetadataRepository;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
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
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		const now = DateTime.utc().toJSDate();
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });
		const startedAt = DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		const run = mock<IRun>({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
	let insightsService: InsightsService;
	let entityManagerMock = mock<EntityManager>();
	const sharedWorkflowRepositoryMock: jest.Mocked<SharedWorkflowRepository> = {
		manager: entityManagerMock,
	} as unknown as jest.Mocked<SharedWorkflowRepository>;
	const insightsRawRepository: jest.Mocked<InsightsRawRepository> = mock<InsightsRawRepository>();

	const startedAt = DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const run = mock<IRun>({
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
		insightsService = new InsightsService(
			sharedWorkflowRepositoryMock,
			Container.get(InsightsByPeriodRepository),
			insightsRawRepository,
			mock<Logger>(),
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
		const ctx = mock<ExecutionLifecycleHooks>({
			workflowData: { ...workflow, settings: undefined },
		});

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

		// ASSERT AGAIN
		trxMock.find.mockClear();
		trxMock.upsert.mockClear();
		expect(trxMock.find).not.toHaveBeenCalled();
		expect(trxMock.upsert).not.toHaveBeenCalled();
	});

	test('updates cached metadata if workflow details change', async () => {
		// ARRANGE
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

		// ASSERT
		expect(trxMock.find).toHaveBeenCalled();
		expect(trxMock.upsert).toHaveBeenCalled();

		// Change the workflow name
		workflow.name = 'new-workflow-name';

		// ACT AGAIN with the same workflow
		await insightsService.workflowExecuteAfterHandler(ctx, run);
		await insightsService.flushEvents();

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
	let insightsService: InsightsService;
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
	const run = mock<IRun>({
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
		insightsService = new InsightsService(
			sharedWorkflowRepositoryMock,
			mock<InsightsByPeriodRepository>(),
			mock<InsightsRawRepository>(),
			logger,
		);
	});

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

	test('flushes events to the database once buffer is full', async () => {
		// ARRANGE
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		// ACT
		for (let i = 0; i < 333; i++) {
			await insightsService.workflowExecuteAfterHandler(ctx, run);
		}
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);

		// ASSERT
		expect(trxMock.insert).not.toHaveBeenCalled();

		// ACT
		await insightsService.workflowExecuteAfterHandler(ctx, run);

		// ASSERT
		// await for the next tick to ensure the flush is called
		await new Promise(process.nextTick);
		expect(trxMock.insert).toHaveBeenCalled();
	});

	test('flushes events to the database after a timeout', async () => {
		// ARRANGE
		jest.useFakeTimers();
		trxMock.insert.mockClear();
		insightsService.startBackgroundProcess();
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		try {
			// ACT
			for (let i = 0; i < 33; i++) {
				await insightsService.workflowExecuteAfterHandler(ctx, run);
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
		insightsService.startBackgroundProcess();
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		try {
			// ACT
			await insightsService.workflowExecuteAfterHandler(ctx, run);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(trxMock.insert).toHaveBeenCalledTimes(1);

			// // ACT
			await insightsService.workflowExecuteAfterHandler(ctx, run);
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
		insightsService.startBackgroundProcess();
		const flushEventsSpy = jest.spyOn(insightsService, 'flushEvents');

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
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsService.workflowExecuteAfterHandler(ctx, run);
		}

		await insightsService.shutdown();

		// ASSERT
		expect(trxMock.insert).toHaveBeenCalledTimes(1);
		// Check that last insert call contains 30 events
		const lastCallArgs = trxMock.insert.mock.calls.at(-1);
		expect(lastCallArgs?.[1]).toHaveLength(30);
	});

	test('flushes events synchronously while shutting down', async () => {
		// ARRANGE
		// reset insights async flushing
		insightsService.startBackgroundProcess();
		trxMock.insert.mockClear();
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		// ACT
		for (let i = 0; i < 10; i++) {
			await insightsService.workflowExecuteAfterHandler(ctx, run);
		}

		void insightsService.shutdown();
		// trigger a workflow after shutdown
		await insightsService.workflowExecuteAfterHandler(ctx, run);

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
		insightsService.startBackgroundProcess();
		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		try {
			// ACT
			await insightsService.workflowExecuteAfterHandler(ctx, run);
			await jest.advanceTimersByTimeAsync(31 * 1000);

			// ASSERT
			expect(trxMock.insert).toHaveBeenCalledTimes(1);
			const insertArgs = trxMock.insert.mock.calls.at(-1);

			// ACT
			await insightsService.flushEvents();

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
		insightsService.startBackgroundProcess();
		trxMock.insert.mockClear();

		const ctx = mock<ExecutionLifecycleHooks>({ workflowData: workflow });

		// Flush will hang until we manually resolve it
		const { resolve: flushResolve, promise: flushPromise } = createDeferredPromise();

		// First flush will "hang" (simulate long save)
		trxMock.insert.mockImplementationOnce(async () => {
			await flushPromise;
		});

		// Each `workflowExecuteAfterHandler` adds 3 insights;
		// we call it 4 times to exceed the flushBatchSize (10)
		for (let i = 0; i < config.flushBatchSize / 3; i++) {
			await insightsService.workflowExecuteAfterHandler(ctx, run);
		}

		// ACT
		const shutdownPromise = insightsService.shutdown();

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

describe('compaction', () => {
	describe('compactRawToHour', () => {
		type TestData = {
			name: string;
			timestamps: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 0, 59),
					DateTime.utc(2000, 1, 1, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				timestamps: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 1, 0),
					DateTime.utc(2000, 1, 1, 2, 0),
				],
				batches: [1, 1, 1],
			},
		])('$name', async ({ timestamps, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const timestamp of timestamps) {
				await createRawInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					timestamp,
				});
			}

			// ACT
			const compactedRows = await insightsService.compactRawToHour();

			// ASSERT
			expect(compactedRows).toBe(timestamps.length);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('batch compaction split events in hourly insight periods', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
			expect(allCompacted[0].value).toBe(60);
			expect(allCompacted[1].value).toBe(40);
		});

		test('batch compaction split events in hourly insight periods by type and workflow', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow1 = await createWorkflow({}, project);
			const workflow2 = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');
			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow1, { type: 'failure', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'runtime_ms', value: 1200, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			for (let i = 0; i < batchSize / 4; i++) {
				await createRawInsightsEvent(workflow2, { type: 'time_saved_min', value: 3, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({
				order: { metaId: 'ASC', periodStart: 'ASC' },
			});

			// Expect 2 insights for workflow 1 (for success and failure)
			// and 3 for workflow 2 (2 period starts for runtime_ms and 1 for time_saved_min)
			expect(allCompacted).toHaveLength(5);
			const metaIds = allCompacted.map((event) => event.metaId);

			// meta id are ordered. first 2 are for workflow 1, last 3 are for workflow 2
			const uniqueMetaIds = [metaIds[0], metaIds[2]];
			const workflow1Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[0]);
			const workflow2Insights = allCompacted.filter((event) => event.metaId === uniqueMetaIds[1]);

			expect(workflow1Insights).toHaveLength(2);
			expect(workflow2Insights).toHaveLength(3);

			const successInsights = workflow1Insights.find((event) => event.type === 'success');
			const failureInsights = workflow1Insights.find((event) => event.type === 'failure');

			expect(successInsights).toBeTruthy();
			expect(failureInsights).toBeTruthy();
			// success and failure insights should have the value matching the number or raw events (because value = 1)
			expect(successInsights!.value).toBe(25);
			expect(failureInsights!.value).toBe(25);

			const runtimeMsEvents = workflow2Insights.filter((event) => event.type === 'runtime_ms');
			const timeSavedMinEvents = workflow2Insights.find((event) => event.type === 'time_saved_min');
			expect(runtimeMsEvents).toHaveLength(2);

			// The last 10 minutes of the first hour
			expect(runtimeMsEvents[0].value).toBe(1200 * 10);

			// The first 15 minutes of the second hour
			expect(runtimeMsEvents[1].value).toBe(1200 * 15);
			expect(timeSavedMinEvents).toBeTruthy();
			expect(timeSavedMinEvents!.value).toBe(3 * 25);
		});

		test('should return the number of compacted events', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc(2000, 1, 1, 0, 0);
			for (let i = 0; i < batchSize; i++) {
				await createRawInsightsEvent(workflow, { type: 'success', value: 1, timestamp });
				// create 60 events per hour
				timestamp = timestamp.plus({ minute: 1 });
			}

			// ACT
			const numberOfCompactedData = await insightsService.compactRawToHour();

			// ASSERT
			expect(numberOfCompactedData).toBe(100);
		});

		test('works with data in the compacted table', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 100;

			let timestamp = DateTime.utc().startOf('hour');

			// Create an existing compacted event for the first hour
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 10,
				periodUnit: 'hour',
				periodStart: timestamp,
			});

			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize + 10);
			expect(allCompacted[0].value).toBe(70);
			expect(allCompacted[1].value).toBe(40);
		});

		test('works with data bigger than the batch size', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			// spy on the compactRawToHour method to check if it's called multiple times
			const rawToHourSpy = jest.spyOn(insightsService, 'compactRawToHour');

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const batchSize = 600;

			let timestamp = DateTime.utc().startOf('hour');
			const events = Array<{ type: 'success'; value: number; timestamp: DateTime }>();
			for (let i = 0; i < batchSize; i++) {
				events.push({ type: 'success', value: 1, timestamp });
				timestamp = timestamp.plus({ minute: 1 });
			}
			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsService.compactInsights();

			// ASSERT
			expect(rawToHourSpy).toHaveBeenCalledTimes(3);
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			const accumulatedValues = allCompacted.reduce((acc, event) => acc + event.value, 0);
			expect(accumulatedValues).toBe(batchSize);
		});
	});

	describe('compactionSchedule', () => {
		test('compaction is running on schedule', async () => {
			jest.useFakeTimers();
			try {
				// ARRANGE
				const insightsService = Container.get(InsightsService);
				insightsService.startBackgroundProcess();

				// spy on the compactInsights method to check if it's called
				insightsService.compactInsights = jest.fn();

				// ACT
				// advance by 1 hour and 1 minute
				jest.advanceTimersByTime(1000 * 60 * 61);

				// ASSERT
				expect(insightsService.compactInsights).toHaveBeenCalledTimes(1);
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe('compactHourToDay', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					DateTime.utc(2000, 1, 1, 0, 0),
					DateTime.utc(2000, 1, 1, 23, 59),
					DateTime.utc(2000, 1, 2, 0, 0),
					DateTime.utc(2000, 1, 2, 23, 59),
					DateTime.utc(2000, 1, 3, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'hour',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(periodStarts.length);
			const hourInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'day',
			);
			expect(hourInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('recent insight periods should not be compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			// create before so we can create the raw events in parallel
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ day: 79 }).startOf('hour'),
			});

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compactDayToWeek', () => {
		type TestData = {
			name: string;
			periodStarts: DateTime[];
			batches: number[];
		};

		test.each<TestData>([
			{
				name: 'compact into 2 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 5, 23, 59),
					DateTime.utc(2000, 1, 11, 1, 0),
				],
				batches: [2, 1],
			},
			{
				name: 'compact into 3 rows',
				periodStarts: [
					// 2000-01-03 is a Monday
					DateTime.utc(2000, 1, 3, 0, 0),
					DateTime.utc(2000, 1, 4, 23, 59),
					DateTime.utc(2000, 1, 11, 0, 0),
					DateTime.utc(2000, 1, 12, 23, 59),
					DateTime.utc(2000, 1, 18, 23, 59),
				],
				batches: [2, 2, 1],
			},
		])('$name', async ({ periodStarts, batches }) => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			await createMetadata(workflow);
			for (const periodStart of periodStarts) {
				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: 1,
					periodUnit: 'day',
					periodStart,
				});
			}

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(periodStarts.length);
			const hourAndDayInsights = (await insightsByPeriodRepository.find()).filter(
				(insight) => insight.periodUnit !== 'week',
			);
			expect(hourAndDayInsights).toBeEmptyArray();
			const allCompacted = await insightsByPeriodRepository.find({ order: { periodStart: 1 } });
			expect(allCompacted).toHaveLength(batches.length);
			for (const [index, compacted] of allCompacted.entries()) {
				expect(compacted.periodStart.getDay()).toBe(1);
				expect(compacted.value).toBe(batches[index]);
			}
		});

		test('recent insight periods should not be compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			await createMetadata(workflow);
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 179 }).startOf('day'),
			});

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(0);
		});
	});

	describe('compaction threshold configuration', () => {
		test('insights by period older than the hourly to daily threshold are not compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionHourlyToDailyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: withinThresholdTimestamp,
			});

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsService.compactHourToDay();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const dailyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'day');
			expect(dailyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(dailyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('day').toISO(),
			);
		});

		test('insights by period older than the daily to weekly threshold are not compacted', async () => {
			// ARRANGE
			const insightsService = Container.get(InsightsService);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
			const config = Container.get(InsightsConfig);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const thresholdDays = config.compactionDailyToWeeklyThresholdDays;

			// Create insights by period within and beyond the threshold
			const withinThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays - 1 });
			const beyondThresholdTimestamp = DateTime.utc().minus({ days: thresholdDays + 1 });

			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: withinThresholdTimestamp,
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: beyondThresholdTimestamp,
			});

			// ACT
			const compactedRows = await insightsService.compactDayToWeek();

			// ASSERT
			expect(compactedRows).toBe(1); // Only the event within the threshold should be compacted
			const insightsByPeriods = await insightsByPeriodRepository.find();
			const weeklyInsights = insightsByPeriods.filter((insight) => insight.periodUnit === 'week');
			expect(weeklyInsights).toHaveLength(1); // The event beyond the threshold should remain
			expect(weeklyInsights[0].periodStart.toISOString()).toEqual(
				beyondThresholdTimestamp.startOf('week').toISO(),
			);
		});
	});
});

describe('getInsightsSummary', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow = await createWorkflow({}, project);
	});

	test('compacted data are summarized correctly', async () => {
		// ARRANGE
		// last 6 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 2 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		// last 12 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});
		//Outside range should not be taken into account
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: 123,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 13 }),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 6 });

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: -123, unit: 'millisecond', value: 0 },
			failed: { deviation: 1, unit: 'count', value: 1 },
			failureRate: { deviation: 0.333, unit: 'ratio', value: 0.333 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: 2, unit: 'count', value: 3 },
		});
	});

	test('no data for previous period should return null deviation', async () => {
		// ARRANGE
		// last 7 days
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });

		// ASSERT
		expect(Object.values(summary).map((v) => v.deviation)).toEqual([null, null, null, null, null]);
	});

	test('mixed period data are summarized correctly', async () => {
		// ARRANGE
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'hour',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 1 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc(),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 2,
			periodUnit: 'hour',
			periodStart: DateTime.utc().minus({ day: 10 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 3,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ day: 11 }),
		});

		// ACT
		const summary = await insightsService.getInsightsSummary({ periodLengthInDays: 7 });

		// ASSERT
		expect(summary).toEqual({
			averageRunTime: { deviation: 0, unit: 'millisecond', value: 0 },
			failed: { deviation: 2, unit: 'count', value: 2 },
			failureRate: { deviation: 0.5, unit: 'ratio', value: 0.5 },
			timeSaved: { deviation: 0, unit: 'minute', value: 0 },
			total: { deviation: -1, unit: 'count', value: 4 },
		});
	});
});

describe('getInsightsByWorkflow', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;
	let workflow3: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);
		workflow3 = await createWorkflow({}, project);
	});

	test('compacted data are are grouped by workflow correctly', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// last 14 days
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: 123,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);

		// expect first workflow to be workflow 2, because it has a bigger total (default sorting)
		expect(byWorkflow.data[0]).toMatchObject({
			workflowId: workflow2.id,
			workflowName: workflow2.name,
			projectId: project.id,
			projectName: project.name,
			total: 7,
			failed: 2,
			runTime: 123,
			succeeded: 5,
			timeSaved: 0,
		});
		expect(byWorkflow.data[0].failureRate).toBeCloseTo(2 / 7);
		expect(byWorkflow.data[0].averageRunTime).toBeCloseTo(123 / 7);

		expect(byWorkflow.data[1]).toMatchObject({
			workflowId: workflow1.id,
			workflowName: workflow1.name,
			projectId: project.id,
			projectName: project.name,
			total: 6,
			failed: 2,
			runTime: 123,
			succeeded: 4,
			timeSaved: 0,
		});
		expect(byWorkflow.data[1].failureRate).toBeCloseTo(2 / 6);
		expect(byWorkflow.data[1].averageRunTime).toBeCloseTo(123 / 6);
	});

	test('compacted data are grouped by workflow correctly with sorting', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 2 : 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'runTime:desc',
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(2);
		expect(byWorkflow.data).toHaveLength(2);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow1.id);
	});

	test('compacted data are grouped by workflow correctly with pagination', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2, workflow3]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : workflow === workflow2 ? 2 : 3,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
		}

		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
			sortBy: 'succeeded:desc',
			skip: 1,
			take: 1,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(3);
		expect(byWorkflow.data).toHaveLength(1);
		expect(byWorkflow.data[0].workflowId).toEqual(workflow2.id);
	});

	test('compacted data are grouped by workflow correctly even with 0 data (check division by 0)', async () => {
		// ACT
		const byWorkflow = await insightsService.getInsightsByWorkflow({
			maxAgeInDays: 14,
		});

		// ASSERT
		expect(byWorkflow.count).toEqual(0);
		expect(byWorkflow.data).toHaveLength(0);
	});
});

describe('getInsightsByTime', () => {
	let insightsService: InsightsService;
	beforeAll(async () => {
		insightsService = Container.get(InsightsService);
	});

	let project: Project;
	let workflow1: IWorkflowDb & WorkflowEntity;
	let workflow2: IWorkflowDb & WorkflowEntity;

	beforeEach(async () => {
		project = await createTeamProject();
		workflow1 = await createWorkflow({}, project);
		workflow2 = await createWorkflow({}, project);
	});

	test('returns empty array when no insights exist', async () => {
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});

	test('returns empty array when no insights in the time range exists', async () => {
		await createCompactedInsightsEvent(workflow1, {
			type: 'success',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 30 }),
		});

		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });
		expect(byTime).toEqual([]);
	});

	test('compacted data are are grouped by time correctly', async () => {
		// ARRANGE
		for (const workflow of [workflow1, workflow2]) {
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: workflow === workflow1 ? 1 : 2,
				periodUnit: 'day',
				periodStart: DateTime.utc(),
			});
			// Check that hourly data is grouped together with the previous daily data
			await createCompactedInsightsEvent(workflow, {
				type: 'failure',
				value: 2,
				periodUnit: 'hour',
				periodStart: DateTime.utc(),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ day: 2 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});
			await createCompactedInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: workflow === workflow1 ? 10 : 20,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 10 }),
			});

			// Barely in range insight (should be included)
			// 1 hour before 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: workflow === workflow1 ? 'success' : 'failure',
				value: 1,
				periodUnit: 'hour',
				periodStart: DateTime.utc().minus({ days: 13, hours: 23 }),
			});

			// Out of date range insight (should not be included)
			// 14 days ago
			await createCompactedInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart: DateTime.utc().minus({ days: 14 }),
			});
		}

		// ACT
		const byTime = await insightsService.getInsightsByTime({ maxAgeInDays: 14, periodUnit: 'day' });

		// ASSERT
		expect(byTime).toHaveLength(4);

		// expect date to be sorted by oldest first
		expect(byTime[0].date).toEqual(DateTime.utc().minus({ days: 14 }).startOf('day').toISO());
		expect(byTime[1].date).toEqual(DateTime.utc().minus({ days: 10 }).startOf('day').toISO());
		expect(byTime[2].date).toEqual(DateTime.utc().minus({ days: 2 }).startOf('day').toISO());
		expect(byTime[3].date).toEqual(DateTime.utc().startOf('day').toISO());

		expect(byTime[0].values).toEqual({
			total: 2,
			succeeded: 1,
			failed: 1,
			failureRate: 0.5,
			averageRunTime: 0,
			timeSaved: 0,
		});

		expect(byTime[1].values).toEqual({
			total: 2,
			succeeded: 2,
			failed: 0,
			failureRate: 0,
			averageRunTime: 15,
			timeSaved: 0,
		});

		expect(byTime[2].values).toEqual({
			total: 2,
			succeeded: 2,
			failed: 0,
			failureRate: 0,
			averageRunTime: 0,
			timeSaved: 0,
		});

		expect(byTime[3].values).toEqual({
			total: 7,
			succeeded: 3,
			failed: 4,
			failureRate: 4 / 7,
			averageRunTime: 0,
			timeSaved: 0,
		});
	});
});
