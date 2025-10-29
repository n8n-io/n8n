import { mockInstance } from '@n8n/backend-test-utils';
import { WorkflowEntity, WorkflowRepository } from '@n8n/db';

import { updateWorkflow } from '../workflows.service';

describe('updateWorkflow', () => {
	const workflowRepository = mockInstance(WorkflowRepository);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not update workflow settings if no settings are provided', async () => {
		const existingWorkflow = new WorkflowEntity();
		existingWorkflow.id = 'workflow-id';
		existingWorkflow.settings = {
			executionOrder: 'v1',
			callerPolicy: 'none',
		};

		const updateData = new WorkflowEntity();
		updateData.name = 'Updated Workflow Name';

		await updateWorkflow(existingWorkflow, updateData);

		// Ensure that only the name is updated and settings remain unchanged
		expect(workflowRepository.update).toHaveBeenCalledWith(existingWorkflow.id, {
			name: 'Updated Workflow Name',
		});
	});

	it('should update workflow while preserving existing settings', async () => {
		const existingWorkflow = new WorkflowEntity();
		existingWorkflow.id = 'workflow-id';
		existingWorkflow.settings = {
			executionOrder: 'v1',
			callerPolicy: 'none',
		};

		const updateData = new WorkflowEntity();
		updateData.settings = {
			executionOrder: 'v1',
			errorWorkflow: 'error-handler-workflow-id',
		};

		await updateWorkflow(existingWorkflow, updateData);
		expect(workflowRepository.update).toHaveBeenCalledWith(existingWorkflow.id, {
			settings: {
				executionOrder: 'v1',
				callerPolicy: 'none',
				errorWorkflow: 'error-handler-workflow-id',
			},
		});
	});
});
