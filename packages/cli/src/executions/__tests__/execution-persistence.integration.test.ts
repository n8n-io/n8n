import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

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
		it('should record versionId on the execution and skip the workflowData snapshot for saved workflows', async () => {
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
			expect(executionEntity?.workflowVersionId).toEqual(workflow.versionId);

			const executionDataRepository = Container.get(ExecutionDataRepository);
			const executionData = await executionDataRepository.findOneBy({ executionId });
			expect(executionData?.workflowData).toBeNull();
			expect(executionData?.data).toEqual('[{"resultData":"1"},{}]');
		});

		it('should write the snapshot when the executed workflow has no versionId', async () => {
			const executionPersistence = Container.get(ExecutionPersistence);
			const workflow = await createWorkflow({ settings: { executionOrder: 'v1' } });

			// Simulate a code path where workflowData carries no versionId (e.g. an
			// in-memory representation that hasn't been hydrated from the DB).
			const workflowDataWithoutVersionId = { ...workflow, versionId: undefined };

			const executionId = await executionPersistence.create({
				workflowId: workflow.id,
				data: {
					// @ts-expect-error Partial data for test
					resultData: {},
				},
				workflowData: workflowDataWithoutVersionId as typeof workflow,
				mode: 'manual',
				startedAt: new Date(),
				status: 'new',
				finished: false,
			});

			const executionEntity = await Container.get(ExecutionRepository).findOneBy({
				id: executionId,
			});
			expect(executionEntity?.workflowVersionId).toBeNull();

			const executionData = await Container.get(ExecutionDataRepository).findOneBy({
				executionId,
			});
			expect(executionData?.workflowData).toEqual(
				expect.objectContaining({ id: workflow.id, nodes: workflow.nodes }),
			);
		});
	});
});
