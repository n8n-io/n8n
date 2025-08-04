'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
describe('ExecutionRepository', () => {
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('createNewExecution', () => {
		it('should save execution data', async () => {
			const executionRepo = di_1.Container.get(db_1.ExecutionRepository);
			const workflow = await (0, backend_test_utils_1.createWorkflow)({
				settings: { executionOrder: 'v1' },
			});
			const executionId = await executionRepo.createNewExecution({
				workflowId: workflow.id,
				data: {
					resultData: {},
				},
				workflowData: workflow,
				mode: 'manual',
				startedAt: new Date(),
				status: 'new',
				finished: false,
			});
			expect(executionId).toBeDefined();
			const executionEntity = await executionRepo.findOneBy({ id: executionId });
			expect(executionEntity?.id).toEqual(executionId);
			expect(executionEntity?.workflowId).toEqual(workflow.id);
			expect(executionEntity?.status).toEqual('new');
			const executionDataRepo = di_1.Container.get(db_1.ExecutionDataRepository);
			const executionData = await executionDataRepo.findOneBy({ executionId });
			expect(executionData?.workflowData).toEqual({
				id: workflow.id,
				connections: workflow.connections,
				nodes: workflow.nodes,
				name: workflow.name,
				settings: workflow.settings,
			});
			expect(executionData?.data).toEqual('[{"resultData":"1"},{}]');
		});
		it('should not create execution if execution data insert fails', async () => {
			const { type: dbType, sqlite: sqliteConfig } = di_1.Container.get(
				config_1.GlobalConfig,
			).database;
			if (dbType === 'sqlite' && sqliteConfig.poolSize === 0) return;
			const executionRepo = di_1.Container.get(db_1.ExecutionRepository);
			const executionDataRepo = di_1.Container.get(db_1.ExecutionDataRepository);
			const workflow = await (0, backend_test_utils_1.createWorkflow)({
				settings: { executionOrder: 'v1' },
			});
			jest
				.spyOn(executionDataRepo, 'createExecutionDataForExecution')
				.mockRejectedValueOnce(new Error());
			await expect(
				async () =>
					await executionRepo.createNewExecution({
						workflowId: workflow.id,
						data: {
							resultData: {},
						},
						workflowData: workflow,
						mode: 'manual',
						startedAt: new Date(),
						status: 'new',
						finished: false,
					}),
			).rejects.toThrow();
			const executionEntities = await executionRepo.find();
			expect(executionEntities).toBeEmptyArray();
		});
	});
});
//# sourceMappingURL=execution.repository.test.js.map
