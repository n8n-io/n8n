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
});
