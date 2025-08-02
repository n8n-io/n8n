import {
	createWorkflowWithTrigger,
	createWorkflow,
	getAllWorkflows,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createTestRun } from '../../shared/db/evaluation';

describe('WorkflowRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('activateAll', () => {
		it('should activate all workflows', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflows = await Promise.all([
				createWorkflowWithTrigger(),
				createWorkflowWithTrigger(),
			]);
			expect(workflows).toMatchObject([{ active: false }, { active: false }]);

			//
			// ACT
			//
			await workflowRepository.activateAll();

			//
			// ASSERT
			//
			const after = await getAllWorkflows();
			expect(after).toMatchObject([{ active: true }, { active: true }]);
		});
	});

	describe('deactivateAll', () => {
		it('should deactivate all workflows', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflows = await Promise.all([
				createWorkflowWithTrigger({ active: true }),
				createWorkflowWithTrigger({ active: true }),
			]);
			expect(workflows).toMatchObject([{ active: true }, { active: true }]);

			//
			// ACT
			//
			await workflowRepository.deactivateAll();

			//
			// ASSERT
			//
			const after = await getAllWorkflows();
			expect(after).toMatchObject([{ active: false }, { active: false }]);
		});
	});

	describe('getActiveIds', () => {
		it('should return all active workflow IDs when invoked without maxResults', async () => {
			//
			// ARRANGE
			//
			const workflows = await Promise.all([
				createWorkflow({ active: true }),
				createWorkflow({ active: false }),
				createWorkflow({ active: false }),
			]);

			//
			// ACT
			//
			const activeIds = await Container.get(WorkflowRepository).getActiveIds();

			//
			// ASSERT
			//
			expect(activeIds).toEqual([workflows[0].id]);
			expect(activeIds).toHaveLength(1);
		});

		it('should return a capped number of active workflow IDs when invoked with maxResults', async () => {
			//
			// ARRANGE
			//
			await Promise.all([
				createWorkflow({ active: true }),
				createWorkflow({ active: false }),
				createWorkflow({ active: true }),
			]);

			//
			// ACT
			//
			const activeIds = await Container.get(WorkflowRepository).getActiveIds({ maxResults: 1 });

			//
			// ASSERT
			//
			expect(activeIds).toHaveLength(1);
		});
	});

	describe('getWorkflowsWithEvaluationCount', () => {
		it('should return 0 when no workflows have test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			await createWorkflow();
			await createWorkflow();

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(0);
		});

		it('should return correct count when some workflows have test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow1 = await createWorkflow();
			await createWorkflow();
			const workflow3 = await createWorkflow();

			await createTestRun(workflow1.id);
			await createTestRun(workflow3.id);

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(2);
		});

		it('should count each workflow only once even with multiple test runs', async () => {
			//
			// ARRANGE
			//
			const workflowRepository = Container.get(WorkflowRepository);
			const workflow1 = await createWorkflow();
			const workflow2 = await createWorkflow();

			await createTestRun(workflow1.id);
			await createTestRun(workflow1.id);
			await createTestRun(workflow1.id);
			await createTestRun(workflow2.id);
			await createTestRun(workflow2.id);

			//
			// ACT
			//
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();

			//
			// ASSERT
			//
			expect(count).toBe(2);
		});
	});
});
