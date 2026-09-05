import type { PolicedWorkflow } from '@n8n/decorators';

import type { OwnershipService } from '@/services/ownership.service';

import type { PolicyEnforcementService } from './policy-enforcement.service';

/**
 * Enforces the `workflowPublish` policy for a workflow. It resolves the owning project only
 * when a check will run.
 *
 * The short-circuit is deliberate. The owning project is read only to give the check its
 * scope, so nothing consumes it when no check is registered. `getWorkflowProjectCached` is
 * a read-through cache, so a caller that later needs the project fills it on its own miss.
 * An absent feature must not cost a lookup on every publish.
 *
 * When a check is registered, the lookup is unguarded, as in `PolicyLifecycleHandler`: an
 * unevaluated project rule is not a passed one, so a failed lookup fails the publish.
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
