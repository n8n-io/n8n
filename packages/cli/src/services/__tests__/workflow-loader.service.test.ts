import type { User, WorkflowEntity } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowLoaderService } from '../workflow-loader.service';

describe('WorkflowLoaderService', () => {
	const workflowFinderService = mock<WorkflowFinderService>();
	const service = new WorkflowLoaderService(workflowFinderService);
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('forUser', () => {
		it('should load a workflow the user can read', async () => {
			const workflow = mock<WorkflowEntity>({ id: 'workflow-1' });
			workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);

			const result = await service.forUser(user).get('workflow-1');

			expect(result).toBe(workflow);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
				'workflow-1',
				user,
				['workflow:read'],
				{ includeActiveVersion: true, publishHistory: 'none' },
			);
		});

		it('should treat a workflow the user cannot read like a missing workflow', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const loader = service.forUser(user);

			await expect(loader.get('workflow-1')).rejects.toThrow(UserError);
			await expect(loader.get('workflow-1')).rejects.toThrow(
				'Failed to find workflow with ID "workflow-1"',
			);
		});
	});
});
