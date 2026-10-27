import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ReportScope } from './migration-finding-query.service';

/**
 * A user who can edit every workflow reads the whole instance. Everyone else
 * reads the workflows they can edit, since those are the ones they can fix.
 * The REST routes and the MCP tools both read the report through this, so a
 * user sees the same findings on both surfaces.
 */
export async function resolveReportScope(
	user: User,
	workflowFinderService: Pick<WorkflowFinderService, 'findAllWorkflowIdsForUser'>,
): Promise<ReportScope> {
	if (hasGlobalScope(user, 'workflow:update')) return { kind: 'instance' };
	const workflowIds = await workflowFinderService.findAllWorkflowIdsForUser(user, [
		'workflow:update',
	]);
	return { kind: 'workflows', workflowIds };
}
