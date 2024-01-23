import Container from 'typedi';

import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

import * as testDb from '../../shared/testDb';
import { createWorkflowWithTrigger, getAllWorkflows } from '../../shared/db/workflows';

describe('WorkflowRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Workflow']);
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
});
