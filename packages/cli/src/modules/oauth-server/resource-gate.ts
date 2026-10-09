import type { ResourceUser } from '@n8n/inbound-auth';
import type { OAuthResourceGrant } from 'n8n-workflow';

import { authorizeAgainstGrant } from '@/modules/inbound-auth-core/grant-authorization';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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
		authorize: async (user: ResourceUser) =>
			await authorizeAgainstGrant(workflowFinderService, grant, user),
	};
}
