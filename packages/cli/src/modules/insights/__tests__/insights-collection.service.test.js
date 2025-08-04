'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const luxon_1 = require('luxon');
const n8n_workflow_1 = require('n8n-workflow');
const insights_metadata_repository_1 = require('@/modules/insights/database/repositories/insights-metadata.repository');
const insights_raw_repository_1 = require('@/modules/insights/database/repositories/insights-raw.repository');
const insights_collection_service_1 = require('../insights-collection.service');
const insights_config_1 = require('../insights.config');
beforeAll(async () => {
	await backend_test_utils_1.testModules.loadModules(['insights']);
	await backend_test_utils_1.testDb.init();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('workflowExecuteAfterHandler', () => {
	let insightsCollectionService;
	let insightsRawRepository;
	let insightsMetadataRepository;
	beforeAll(async () => {
		insightsCollectionService = di_1.Container.get(
			insights_collection_service_1.InsightsCollectionService,
		);
		insightsRawRepository = di_1.Container.get(insights_raw_repository_1.InsightsRawRepository);
		insightsMetadataRepository = di_1.Container.get(
			insights_metadata_repository_1.InsightsMetadataRepository,
		);
	});
	let project;
	let workflow;
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow = await (0, backend_test_utils_1.createWorkflow)(
			{
				settings: {
					timeSavedPerExecution: 3,
				},
			},
			project,
		);
	});
	test.each([
		{ status: 'success', type: 'success' },
		{ status: 'error', type: 'failure' },
		{ status: 'crashed', type: 'failure' },
	])('stores events for executions with the status `$status`', async ({ status, type }) => {
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		const startedAt = luxon_1.DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = (0, jest_mock_extended_1.mock)({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});
		const now = luxon_1.DateTime.utc().toJSDate();
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
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
	test.each([
		{ status: 'waiting' },
		{ status: 'canceled' },
		{ status: 'unknown' },
		{ status: 'new' },
		{ status: 'running' },
	])('does not store events for executions with the status `$status`', async ({ status }) => {
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		const startedAt = luxon_1.DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = (0, jest_mock_extended_1.mock)({
			mode: 'webhook',
			status,
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
		const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
		const allInsights = await insightsRawRepository.find();
		expect(metadata).toBeNull();
		expect(allInsights).toHaveLength(0);
	});
	test.each([{ mode: 'internal' }, { mode: 'manual' }, { mode: 'integrated' }])(
		'does not store events for executions with the mode `$mode`',
		async ({ mode }) => {
			const ctx = (0, jest_mock_extended_1.mock)({ workflow });
			const startedAt = luxon_1.DateTime.utc();
			const stoppedAt = startedAt.plus({ seconds: 5 });
			ctx.runData = (0, jest_mock_extended_1.mock)({
				mode,
				status: 'success',
				startedAt: startedAt.toJSDate(),
				stoppedAt: stoppedAt.toJSDate(),
			});
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await insightsCollectionService.flushEvents();
			const metadata = await insightsMetadataRepository.findOneBy({ workflowId: workflow.id });
			const allInsights = await insightsRawRepository.find();
			expect(metadata).toBeNull();
			expect(allInsights).toHaveLength(0);
		},
	);
	test.each([
		{ mode: 'evaluation' },
		{ mode: 'error' },
		{ mode: 'cli' },
		{ mode: 'retry' },
		{ mode: 'trigger' },
		{ mode: 'webhook' },
	])('stores events for executions with the mode `$mode`', async ({ mode }) => {
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		const startedAt = luxon_1.DateTime.utc();
		const stoppedAt = startedAt.plus({ seconds: 5 });
		ctx.runData = (0, jest_mock_extended_1.mock)({
			mode,
			status: 'success',
			startedAt: startedAt.toJSDate(),
			stoppedAt: stoppedAt.toJSDate(),
		});
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
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
	let insightsCollectionService;
	const repositoryMocks = {
		find: jest.fn(),
		findBy: jest.fn(),
		upsert: jest.fn(),
		insert: jest.fn(),
	};
	const sharedWorkflowRepositoryMock = (0, jest_mock_extended_1.mock)(repositoryMocks);
	const metadataRepositoryMock = (0, jest_mock_extended_1.mock)(repositoryMocks);
	const insightsRawRepositoryMock = (0, jest_mock_extended_1.mock)(repositoryMocks);
	const startedAt = luxon_1.DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = (0, jest_mock_extended_1.mock)({
		mode: 'webhook',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});
	beforeAll(async () => {
		insightsCollectionService = new insights_collection_service_1.InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			insightsRawRepositoryMock,
			metadataRepositoryMock,
			di_1.Container.get(insights_config_1.InsightsConfig),
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	let project;
	let workflow;
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
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
		const ctx = (0, jest_mock_extended_1.mock)({
			workflow: { ...workflow, settings: undefined },
			runData,
		});
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
		expect(repositoryMocks.find).toHaveBeenCalledWith({
			where: { workflowId: (0, typeorm_1.In)([workflow.id]), role: 'workflow:owner' },
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
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
		repositoryMocks.find.mockClear();
		repositoryMocks.upsert.mockClear();
		expect(repositoryMocks.find).not.toHaveBeenCalled();
		expect(repositoryMocks.upsert).not.toHaveBeenCalled();
	});
	test('updates cached metadata if workflow details change', async () => {
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
		expect(repositoryMocks.find).toHaveBeenCalled();
		expect(repositoryMocks.upsert).toHaveBeenCalled();
		workflow.name = 'new-workflow-name';
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await insightsCollectionService.flushEvents();
		expect(repositoryMocks.find).toHaveBeenCalledWith({
			where: { workflowId: (0, typeorm_1.In)([workflow.id]), role: 'workflow:owner' },
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
	let project;
	let workflow;
	let insightsCollectionService;
	const repoMocks = {
		findSharedWorkflowRepositoryMock: jest.fn(),
		findByMetadata: jest.fn(),
		upsertMetadata: jest.fn(),
		insertInsightsRaw: jest.fn(),
	};
	const sharedWorkflowRepositoryMock = (0, jest_mock_extended_1.mock)({
		find: repoMocks.findSharedWorkflowRepositoryMock,
	});
	const metadataRepositoryMock = (0, jest_mock_extended_1.mock)({
		findBy: repoMocks.findByMetadata,
		upsert: repoMocks.upsertMetadata,
	});
	const insightsRawRepositoryMock = (0, jest_mock_extended_1.mock)({
		insert: repoMocks.insertInsightsRaw,
	});
	const startedAt = luxon_1.DateTime.utc();
	const stoppedAt = startedAt.plus({ seconds: 5 });
	const runData = (0, jest_mock_extended_1.mock)({
		mode: 'trigger',
		status: 'success',
		startedAt: startedAt.toJSDate(),
		stoppedAt: stoppedAt.toJSDate(),
	});
	beforeAll(async () => {
		insightsCollectionService = new insights_collection_service_1.InsightsCollectionService(
			sharedWorkflowRepositoryMock,
			insightsRawRepositoryMock,
			metadataRepositoryMock,
			di_1.Container.get(insights_config_1.InsightsConfig),
			(0, backend_test_utils_1.mockLogger)(),
		);
	});
	beforeEach(async () => {
		project = await (0, backend_test_utils_1.createTeamProject)();
		workflow = await (0, backend_test_utils_1.createWorkflow)(
			{ settings: { timeSavedPerExecution: 1 } },
			project,
		);
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
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		for (let i = 0; i < 333; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		await new Promise(process.nextTick);
		expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		await new Promise(process.nextTick);
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalled();
	});
	test('flushes events to the database after a timeout', async () => {
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		try {
			for (let i = 0; i < 33; i++) {
				await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			}
			expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
		}
	});
	test('reschedule flush on flushing end', async () => {
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow });
		try {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});
	test('reschedule flush on no buffered insights', async () => {
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		insightsCollectionService.startFlushingTimer();
		const flushEventsSpy = jest.spyOn(insightsCollectionService, 'flushEvents');
		try {
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(flushEventsSpy).toHaveBeenCalledTimes(1);
			expect(repoMocks.insertInsightsRaw).not.toHaveBeenCalled();
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(flushEventsSpy).toHaveBeenCalledTimes(2);
		} finally {
			jest.useRealTimers();
		}
	});
	test('flushes events to the database on shutdown', async () => {
		repoMocks.insertInsightsRaw.mockClear();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		await insightsCollectionService.shutdown();
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
		const lastCallArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
		expect(lastCallArgs?.[0]).toHaveLength(30);
	});
	test('flushes events synchronously while shutting down', async () => {
		insightsCollectionService.startFlushingTimer();
		repoMocks.insertInsightsRaw.mockClear();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		for (let i = 0; i < 10; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		void insightsCollectionService.shutdown();
		await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
		let callArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
		expect(callArgs?.[0]).toHaveLength(3);
		await new Promise(process.nextTick);
		callArgs = repoMocks.insertInsightsRaw.mock.calls.at(-2);
		expect(callArgs?.[0]).toHaveLength(30);
	});
	test('restore buffer events on flushing error', async () => {
		jest.useFakeTimers();
		repoMocks.insertInsightsRaw.mockClear();
		repoMocks.insertInsightsRaw.mockRejectedValueOnce(new Error('Test error'));
		insightsCollectionService.startFlushingTimer();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		try {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
			await jest.advanceTimersByTimeAsync(31 * 1000);
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
			const insertArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
			await insightsCollectionService.flushEvents();
			expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(2);
			const newInsertArgs = repoMocks.insertInsightsRaw.mock.calls.at(-1);
			expect(newInsertArgs?.[0]).toHaveLength(3);
			expect(newInsertArgs?.[0]).toEqual(insertArgs?.[0]);
		} finally {
			jest.useRealTimers();
		}
	});
	test('waits for ongoing flush during shutdown', async () => {
		const config = di_1.Container.get(insights_config_1.InsightsConfig);
		config.flushBatchSize = 10;
		insightsCollectionService.startFlushingTimer();
		repoMocks.insertInsightsRaw.mockClear();
		const ctx = (0, jest_mock_extended_1.mock)({ workflow, runData });
		const { resolve: flushResolve, promise: flushPromise } = (0,
		n8n_workflow_1.createDeferredPromise)();
		repoMocks.insertInsightsRaw.mockImplementationOnce(async () => {
			await flushPromise;
		});
		for (let i = 0; i < config.flushBatchSize / 3; i++) {
			await insightsCollectionService.handleWorkflowExecuteAfter(ctx);
		}
		const shutdownPromise = insightsCollectionService.shutdown();
		let shutdownResolved = false;
		void shutdownPromise.then(() => (shutdownResolved = true));
		await new Promise(setImmediate);
		expect(shutdownResolved).toBe(false);
		flushResolve();
		await shutdownPromise;
		expect(shutdownResolved).toBe(true);
		expect(repoMocks.insertInsightsRaw).toHaveBeenCalledTimes(1);
	});
});
//# sourceMappingURL=insights-collection.service.test.js.map
