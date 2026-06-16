import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { MissingExecutionDataError } from '@/executions/execution-data/missing-execution-data.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('create', () => {
		it('should save execution and execution data to database', async () => {
			const executionRepo = Container.get(ExecutionRepository);
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: {
					// @ts-expect-error Partial data for test
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
			expect(executionEntity?.storedAt).toEqual('db');

			const executionDataRepository = Container.get(ExecutionDataRepository);
			const executionData = await executionDataRepository.findOneBy({ executionId });
			expect(executionData?.workflowData).toEqual({
				id: workflow.id,
				connections: workflow.connections,
				nodes: workflow.nodes,
				name: workflow.name,
				settings: workflow.settings,
			});
			expect(executionData?.data).toEqual('[{"resultData":"1"},{}]');
		});
	});

	describe('updateExistingExecution (db overwrite path)', () => {
		it('should preserve the original workflowVersionId when overwriting data and workflowData', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionDataRepository = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: { ...workflow, versionId: 'v-original' },
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			const updatedData = createEmptyRunExecutionData();
			updatedData.resultData.lastNodeExecuted = 'NodeX';

			await executionPersistence.updateExistingExecution(executionId, {
				data: updatedData,
				workflowData: { ...workflow, versionId: 'v-different' },
				status: 'success',
			});

			const executionData = await executionDataRepository.findOneBy({ executionId });
			expect(executionData?.workflowVersionId).toEqual('v-original');
			expect(executionData?.data).toContain('NodeX');
		});

		it('should roll back the status change when the data row is missing during an overwrite', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const executionRepo = Container.get(ExecutionRepository);
			const executionDataRepository = Container.get(ExecutionDataRepository);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: workflow,
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			await executionDataRepository.delete({ executionId });

			await expect(
				executionPersistence.updateExistingExecution(executionId, {
					data: createEmptyRunExecutionData(),
					workflowData: workflow,
					status: 'success',
				}),
			).rejects.toThrow(MissingExecutionDataError);

			const executionEntity = await executionRepo.findOneBy({ id: executionId });
			expect(executionEntity?.status).toEqual('new');
		});
	});

	describe('findSingleExecution', () => {
		it('returns the persisted bundle byte size and the workflow version id', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: createEmptyRunExecutionData(),
				workflowData: {
					...workflow,
					id: 'wf-1',
					name: 'wf',
					nodes: [],
					connections: {},
					settings: {},
					versionId: 'v-roundtrip-456',
				},
				mode: 'manual',
				status: 'new',
				finished: false,
			});

			const execution = await executionPersistence.findSingleExecution(executionId, {
				includeData: true,
			});

			// 51 (run data) + 67 (workflow snapshot) + 15 ("v-roundtrip-456") = 133 bytes
			expect(execution?.jsonSizeBytes).toBe(133);
			expect(execution?.workflowVersionId).toBe('v-roundtrip-456');
		});
	});
});
