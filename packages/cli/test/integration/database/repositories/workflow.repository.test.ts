import { Container } from '@n8n/di';

import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

import {
	createWorkflowWithTrigger,
	createWorkflow,
	getAllWorkflows,
} from '../../shared/db/workflows';
import * as testDb from '../../shared/test-db';

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
});
