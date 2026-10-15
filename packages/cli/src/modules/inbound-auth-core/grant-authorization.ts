import type { ResourceUser } from '@n8n/inbound-auth';
import type { OAuthResourceGrant } from 'n8n-workflow';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * Re-takes the grant's decision for `user`. Used by the live resource's `authorize` and,
 * once the resource is gone, against the grant sealed into the run — so the check is the
 * same one either way.
 */
export async function authorizeAgainstGrant(
	workflowFinderService: WorkflowFinderService,
	grant: OAuthResourceGrant,
	user: ResourceUser,
): Promise<boolean> {
	if (!grant.executeAccessWorkflowId) return true;

	const allowed = await workflowFinderService.findWorkflowIdsWithScopeForUser(
		[grant.executeAccessWorkflowId],
		user,
		['workflow:execute'],
	);

	return allowed.has(grant.executeAccessWorkflowId);
}
