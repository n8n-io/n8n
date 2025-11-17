import { createActiveWorkflow, createWorkflow, testDb } from '@n8n/backend-test-utils';
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

	describe('findSingleExecution - workflow data normalization', () => {
		it('should add active flag when reading workflow data without active field', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepo = Container.get(ExecutionDataRepository);
			const workflow = await createActiveWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionRepo.createNewExecution({
				workflowId: workflow.id,
				data: { resultData: { runData: {} } },
				workflowData: workflow,
				mode: 'trigger',
				status: 'success',
				finished: true,
			});

			// Simulate post-execution update with full workflow data (like prepareExecutionDataForDbUpdate does)
			await executionDataRepo.update(
				{ executionId },
				{
					workflowData: {
						id: workflow.id,
						name: workflow.name,
						nodes: workflow.nodes,
						connections: workflow.connections,
						settings: workflow.settings,
						activeVersionId: workflow.activeVersionId,
						createdAt: workflow.createdAt,
						updatedAt: workflow.updatedAt,
						isArchived: false,
					},
				},
			);

			// Verify active flag is added based on activeVersionId
			const execution = await executionRepo.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			expect(execution).toBeDefined();
			expect(execution?.workflowData.active).toBe(true);
			expect(execution?.workflowData.activeVersionId).toBe(workflow.activeVersionId);
		});

		it('should preserve active flag from old format workflow data', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepo = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionRepo.createNewExecution({
				workflowId: workflow.id,
				data: { resultData: { runData: {} } },
				workflowData: workflow,
				mode: 'manual',
				status: 'success',
				finished: true,
			});

			// Simulate old format: has active flag, no activeVersionId)
			await executionDataRepo.update(
				{ executionId },
				{
					workflowData: {
						id: workflow.id,
						name: workflow.name,
						nodes: workflow.nodes,
						connections: workflow.connections,
						active: true,
						createdAt: workflow.createdAt,
						updatedAt: workflow.updatedAt,
						isArchived: false,
					},
				},
			);

			// Verify active flag is preserved from old format
			const execution = await executionRepo.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			expect(execution).toBeDefined();
			expect(execution?.workflowData.active).toBe(true);
		});
	});
});
