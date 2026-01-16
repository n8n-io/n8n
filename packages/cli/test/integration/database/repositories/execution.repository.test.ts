import { createWorkflow, testDb } from '@n8n/backend-test-utils';
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
	describe('findByStopExecutionsFilter', () => {
		it('should find executions by status', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow();

			// Insert executions with different statuses
			await executionRepo.insert([
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'running',
					finished: false,
					createdAt: new Date(),
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
					createdAt: new Date(),
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'error',
					finished: false,
					createdAt: new Date(),
				},
			]);

			// Find executions with status 'running' and 'error'
			const executions = await executionRepo.findByStopExecutionsFilter({
				status: ['running', 'error'],
				workflowId: workflow.id,
			});

			expect(executions).toHaveLength(2);
		});

		it('should find executions by startedAfter and startedBefore', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow = await createWorkflow();

			// Insert executions with different start times
			const now = new Date();
			const pastDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
			const futureDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later

			await executionRepo.insert([
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: pastDate,
					status: 'running',
					finished: false,
					createdAt: pastDate,
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: now,
					status: 'success',
					finished: true,
					createdAt: now,
				},
				{
					workflowId: workflow.id,
					mode: 'manual',
					startedAt: futureDate,
					status: 'error',
					finished: false,
					createdAt: futureDate,
				},
			]);

			// Find executions started between pastDate and now
			const executions = await executionRepo.findByStopExecutionsFilter({
				startedAfter: new Date(pastDate.getTime() + 1).toISOString(),
				startedBefore: new Date(futureDate.getTime() - 1).toISOString(),
				status: ['running', 'success', 'error'],
				workflowId: workflow.id,
			});

			expect(executions).toHaveLength(1);
		});

		it('should find executions for all workflows when workflowId is "all"', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const workflow1 = await createWorkflow();
			const workflow2 = await createWorkflow();

			// Insert executions for different workflows
			await executionRepo.insert([
				{
					workflowId: workflow1.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'running',
					finished: false,
					createdAt: new Date(),
				},
				{
					workflowId: workflow2.id,
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
					finished: true,
					createdAt: new Date(),
				},
			]);

			// Find executions for all workflows
			const executions = await executionRepo.findByStopExecutionsFilter({
				status: ['running', 'success'],
				workflowId: 'all',
			});

			expect(executions).toHaveLength(2);
		});
	});
});
