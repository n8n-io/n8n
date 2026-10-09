import type { WorkflowSharingService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

import type { ReportScope } from './migration-finding-query.service';

/**
 * A user who can edit every workflow reads the whole instance. Everyone else
 * reads the workflows they can edit, since those are the ones they can fix.
 * The REST routes and the MCP tools both read the report through this, so a
 * user sees the same findings on both surfaces.
 */
export async function resolveReportScope(
	user: User,
	workflowSharingService: WorkflowSharingService,
): Promise<ReportScope> {
	if (hasGlobalScope(user, 'workflow:update')) return { kind: 'instance' };
	const workflowIds = await workflowSharingService.getSharedWorkflowIdsForScopes(user, [
		'workflow:update',
	]);
	// A workflow shared into two of the user's projects comes back twice.
	return { kind: 'workflows', workflowIds: [...new Set(workflowIds)] };
}
