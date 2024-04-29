import Container from 'typedi';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { ExecutionDataRepository } from '@db/repositories/executionData.repository';
import * as testDb from '../../shared/testDb';
import { createWorkflow } from '../../shared/db/workflows';

describe('ExecutionRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Workflow', 'Execution']);
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
	});
});
