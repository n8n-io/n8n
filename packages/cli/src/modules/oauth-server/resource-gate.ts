import type { User } from '@n8n/db';
import type { OAuthResourceGrant } from 'n8n-workflow';

import type { ProtectedResource } from '@/services/protected-resource.registry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * Re-takes the grant's decision for `user`. Used by the live resource's `authorize` and,
 * once the resource is gone, against the grant sealed into the run — so the check is the
 * same one either way.
 */
export async function authorizeAgainstGrant(
	workflowFinderService: WorkflowFinderService,
	grant: OAuthResourceGrant,
	user: User,
): Promise<boolean> {
	if (!grant.executeAccessWorkflowId) return true;

	const allowed = await workflowFinderService.findWorkflowIdsWithScopeForUser(
		[grant.executeAccessWorkflowId],
		user,
		['workflow:execute'],
	);

	return allowed.has(grant.executeAccessWorkflowId);
}

/**
 * Builds a trigger resource's grant and authorize members from one grant, so the sealed
 * copy can't allow more than the live resource does. Spread into a resolver's descriptor
 * alongside its identity (`id`, `getResourceUrl`, `getAudiences`, `scopes`, …).
 *
 * Not for resources whose gate a grant can't express — the instance MCP server reads a
 * live instance setting, so it keeps its own `authorize` and offers no grant.
 */
export function triggerResourceGate(
	workflowFinderService: WorkflowFinderService,
	grant: OAuthResourceGrant,
): Pick<ProtectedResource, 'getGrant' | 'authorize'> {
	return {
		getGrant: () => grant,
		authorize: async (user: User) =>
			await authorizeAgainstGrant(workflowFinderService, grant, user),
	};
}
