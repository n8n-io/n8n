import { ProjectScopeService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import type { ResourcePrincipal } from '@n8n/inbound-auth';
import { scopeSchema, type Scope } from '@n8n/permissions';
import type { OAuthResourceGrant } from 'n8n-workflow';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const isScope = (value: string): value is Scope => scopeSchema.safeParse(value).success;

/**
 * Re-takes the grant's decision for `user`. Used by the live resource's `authorize` and,
 * once the resource is gone, against the grant sealed into the run — so the check is the
 * same one either way. The user must pass every requirement that the grant names.
 */
export async function authorizeAgainstGrant(
	workflowFinderService: WorkflowFinderService,
	grant: OAuthResourceGrant,
	user: ResourcePrincipal,
): Promise<boolean> {
	if (grant.executeAccessWorkflowId) {
		const allowed = await workflowFinderService.findWorkflowIdsWithScopeForUser(
			[grant.executeAccessWorkflowId],
			user,
			['workflow:execute'],
		);
		if (!allowed.has(grant.executeAccessWorkflowId)) return false;
	}

	if (grant.projectAccess) {
		const { projectId, scopes } = grant.projectAccess;
		const known = scopes.filter(isScope);
		// An unknown scope can never be granted, so refuse instead of skipping it.
		if (known.length !== scopes.length) return false;
		// Only grants that name a project need this service, so trigger resources keep their dependencies.
		return await Container.get(ProjectScopeService).hasScopes(user, projectId, known);
	}

	return true;
}
