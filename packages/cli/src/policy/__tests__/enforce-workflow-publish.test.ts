import type { Project } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';

import { enforceWorkflowPublishPolicy } from '../enforce-workflow-publish';
import type { PolicyEnforcementService } from '../policy-enforcement.service';

describe('enforceWorkflowPublishPolicy', () => {
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const ownershipService = mock<OwnershipService>();
	const workflow = { id: 'workflow-1', name: 'Test Workflow', nodes: [] };

	beforeEach(() => {
		vi.clearAllMocks();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(mock<Project>({ id: 'project-1' }));
	});

	// A feature that is merely absent must not cost a lookup on every publish.
	it('skips the project lookup and the check when nothing is registered for workflowPublish', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		await enforceWorkflowPublishPolicy(policyEnforcementService, ownershipService, workflow);

		expect(policyEnforcementService.hasChecksFor).toHaveBeenCalledWith('workflowPublish');
		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		expect(policyEnforcementService.enforceWorkflowPublish).not.toHaveBeenCalled();
	});

	it('enforces with the owning project when a check is registered', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);

		await enforceWorkflowPublishPolicy(policyEnforcementService, ownershipService, workflow);

		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-1');
		expect(policyEnforcementService.enforceWorkflowPublish).toHaveBeenCalledWith({
			workflow,
			projectId: 'project-1',
		});
	});

	// An unevaluated project rule is not a passed one, so the lookup is unguarded.
	it('propagates a failed project lookup instead of policing a null scope', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		ownershipService.getWorkflowProjectCached.mockRejectedValue(new Error('no owner row'));

		await expect(
			enforceWorkflowPublishPolicy(policyEnforcementService, ownershipService, workflow),
		).rejects.toThrow('no owner row');

		expect(policyEnforcementService.enforceWorkflowPublish).not.toHaveBeenCalled();
	});
});
