'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const executions_pruning_service_1 = require('@/services/pruning/executions-pruning.service');
const executions_1 = require('./shared/db/executions');
describe('softDeleteOnPruningCycle()', () => {
	let pruningService;
	const instanceSettings = di_1.Container.get(n8n_core_1.InstanceSettings);
	instanceSettings.markAsLeader();
	const now = new Date();
	const yesterday = new Date(Date.now() - 1 * constants_1.Time.days.toMilliseconds);
	let workflow;
	let executionsConfig;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		executionsConfig = di_1.Container.get(config_1.ExecutionsConfig);
		pruningService = new executions_pruning_service_1.ExecutionsPruningService(
			(0, backend_test_utils_1.mockLogger)(),
			instanceSettings,
			di_1.Container.get(db_1.DbConnection),
			di_1.Container.get(db_1.ExecutionRepository),
			(0, backend_test_utils_1.mockInstance)(n8n_core_1.BinaryDataService),
			executionsConfig,
		);
		workflow = await (0, backend_test_utils_1.createWorkflow)();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['ExecutionEntity', 'ExecutionAnnotation']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	async function findAllExecutions() {
		return await di_1.Container.get(db_1.ExecutionRepository).find({
			order: { id: 'asc' },
			withDeleted: true,
		});
	}
	describe('when EXECUTIONS_DATA_PRUNE_MAX_COUNT is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 336;
			executionsConfig.pruneDataMaxCount = 1;
		});
		test('should mark as deleted based on EXECUTIONS_DATA_PRUNE_MAX_COUNT', async () => {
			const executions = [
				await (0, executions_1.createSuccessfulExecution)(workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
		test('should not re-mark already marked executions', async () => {
			const executions = [
				await (0, executions_1.createExecution)(
					{ status: 'success', finished: true, startedAt: now, stoppedAt: now, deletedAt: now },
					workflow,
				),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: now }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test.each([
			['unknown', { startedAt: now, stoppedAt: now }],
			['canceled', { startedAt: now, stoppedAt: now }],
			['crashed', { startedAt: now, stoppedAt: now }],
			['error', { startedAt: now, stoppedAt: now }],
			['success', { finished: true, startedAt: now, stoppedAt: now }],
		])('should prune %s executions', async (status, attributes) => {
			const executions = [
				await (0, executions_1.createExecution)({ status, ...attributes }, workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test.each([
			['new', {}],
			['running', { startedAt: now }],
			['waiting', { startedAt: now, stoppedAt: now, waitTill: now }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await (0, executions_1.createExecution)({ status, ...attributes }, workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test('should not prune annotated executions', async () => {
			const executions = [
				await (0, executions_1.createSuccessfulExecution)(workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await (0, executions_1.annotateExecution)(executions[0].id, { vote: 'up' }, [workflow.id]);
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});
	describe('when EXECUTIONS_DATA_MAX_AGE is set', () => {
		beforeAll(() => {
			executionsConfig.pruneDataMaxAge = 1;
			executionsConfig.pruneDataMaxCount = 0;
		});
		test('should mark as deleted based on EXECUTIONS_DATA_MAX_AGE', async () => {
			const executions = [
				await (0, executions_1.createExecution)(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await (0, executions_1.createExecution)(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test('should not re-mark already marked executions', async () => {
			const executions = [
				await (0, executions_1.createExecution)(
					{
						status: 'success',
						finished: true,
						startedAt: yesterday,
						stoppedAt: yesterday,
						deletedAt: yesterday,
					},
					workflow,
				),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: yesterday }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test.each([
			['unknown', { startedAt: yesterday, stoppedAt: yesterday }],
			['canceled', { startedAt: yesterday, stoppedAt: yesterday }],
			['crashed', { startedAt: yesterday, stoppedAt: yesterday }],
			['error', { startedAt: yesterday, stoppedAt: yesterday }],
			['success', { finished: true, startedAt: yesterday, stoppedAt: yesterday }],
		])('should prune %s executions', async (status, attributes) => {
			const execution = await (0, executions_1.createExecution)(
				{ status, ...attributes },
				workflow,
			);
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: execution.id, deletedAt: expect.any(Date) }),
			]);
		});
		test.each([
			['new', {}],
			['running', { startedAt: yesterday }],
			['waiting', { startedAt: yesterday, stoppedAt: yesterday, waitTill: yesterday }],
		])('should not prune %s executions', async (status, attributes) => {
			const executions = [
				await (0, executions_1.createExecution)({ status, ...attributes }, workflow),
				await (0, executions_1.createSuccessfulExecution)(workflow),
			];
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: null }),
			]);
		});
		test('should not prune annotated executions', async () => {
			const executions = [
				await (0, executions_1.createExecution)(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await (0, executions_1.createExecution)(
					{ finished: true, startedAt: yesterday, stoppedAt: yesterday, status: 'success' },
					workflow,
				),
				await (0, executions_1.createExecution)(
					{ finished: true, startedAt: now, stoppedAt: now, status: 'success' },
					workflow,
				),
			];
			await (0, executions_1.annotateExecution)(executions[0].id, { vote: 'up' }, [workflow.id]);
			await pruningService.softDelete();
			const result = await findAllExecutions();
			expect(result).toEqual([
				expect.objectContaining({ id: executions[0].id, deletedAt: null }),
				expect.objectContaining({ id: executions[1].id, deletedAt: expect.any(Date) }),
				expect.objectContaining({ id: executions[2].id, deletedAt: null }),
			]);
		});
	});
});
//# sourceMappingURL=executions-pruning.service.test.js.map
