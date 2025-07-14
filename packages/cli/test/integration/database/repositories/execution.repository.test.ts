import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('ExecutionRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('createNewExecution', () => {
		it('should save execution data', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });
			const executionId = await executionRepo.createNewExecution({
				workflowId: workflow.id,
				data: {
					//@ts-expect-error This is not needed for tests
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

			const executionDataRepo = Container.get(ExecutionDataRepository);
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
			const { type: dbType, sqlite: sqliteConfig } = Container.get(GlobalConfig).database;
			// Do not run this test for the legacy sqlite driver
			if (dbType === 'sqlite' && sqliteConfig.poolSize === 0) return;

			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepo = Container.get(ExecutionDataRepository);

			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });
			jest
				.spyOn(executionDataRepo, 'createExecutionDataForExecution')
				.mockRejectedValueOnce(new Error());

			await expect(
				async () =>
					await executionRepo.createNewExecution({
						workflowId: workflow.id,
						data: {
							//@ts-expect-error This is not needed for tests
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
