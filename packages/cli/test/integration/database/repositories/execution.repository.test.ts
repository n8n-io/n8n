import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { IRunExecutionData, IRunExecutionDataAll } from 'n8n-workflow';

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

	describe('run execution data migration', () => {
		it('should automatically migrate IRunExecutionDataV0 to V1 when reading', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepo = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			// Create V0 data with string destinationNode
			const v0Data: IRunExecutionDataAll = {
				version: 0,
				startData: { destinationNode: 'TestNode' },
				resultData: { runData: {} },
			};

			// Insert execution with V0 data directly into the database
			const { identifiers } = await executionRepo.insert({
				workflowId: workflow.id,
				mode: 'manual',
				startedAt: new Date(),
				status: 'success',
				finished: true,
				createdAt: new Date(),
			});
			const executionId = identifiers[0].id as string;
			await executionDataRepo.insert({
				executionId,
				workflowData: { id: workflow.id, connections: {}, nodes: [], name: workflow.name },
				data: stringify(v0Data),
			});

			// Read the execution back
			const execution = await executionRepo.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			// Verify that the data was migrated to V1
			const data = execution?.data as IRunExecutionData;
			expect(data.version).toBe(1);
			expect(data.startData?.destinationNode).toEqual({
				nodeName: 'TestNode',
				mode: 'inclusive',
			});
		});
	});
});
