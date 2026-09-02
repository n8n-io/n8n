import type { PolicedWorkflow } from '@n8n/decorators';

import type { OwnershipService } from '@/services/ownership.service';

import type { PolicyEnforcementService } from './policy-enforcement.service';

/**
 * Enforces the `workflowPublish` policy for a workflow, resolving its owning project only
 * when a check would actually run.
 *
 * The lookup is unguarded, as in `PolicyLifecycleHandler`: an unevaluated project rule is
 * not a passed one, so a failed lookup fails the publish.
 */
export async function enforceWorkflowPublishPolicy(
	policyEnforcementService: PolicyEnforcementService,
	ownershipService: OwnershipService,
	workflow: PolicedWorkflow & { id: string },
): Promise<void> {
	if (!policyEnforcementService.hasChecksFor('workflowPublish')) return;

	const project = await ownershipService.getWorkflowProjectCached(workflow.id);

	await policyEnforcementService.enforceWorkflowPublish({ workflow, projectId: project.id });
}
