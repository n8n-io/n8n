import { ScopeAccessService, type ScopeAccessResource } from '@n8n/backend-services';
import type { OperationContext, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

export interface ScopeAccessRouteParameters {
	credentialId?: string;
	workflowId?: string;
	projectId?: string;
	dataTableId?: string;
}

export async function hasScopes(
	user: User,
	scopes: Scope[],
	globalOnly: boolean,
	parameters: ScopeAccessRouteParameters,
	context: OperationContext = {},
): Promise<boolean> {
	return await Container.get(ScopeAccessService).hasScopes({
		user,
		scopes,
		globalOnly,
		resource: getScopeAccessResource(parameters),
		context,
	});
}

export function getScopeAccessResource({
	credentialId,
	workflowId,
	dataTableId,
	projectId,
}: ScopeAccessRouteParameters): ScopeAccessResource {
	if (credentialId) return { type: 'credential', credentialId };
	if (workflowId) return { type: 'workflow', workflowId };
	if (dataTableId) {
		return { type: 'moduleResource', resourceType: 'dataTable', resourceId: dataTableId };
	}
	if (projectId) return { type: 'project', projectId };

	throw new UnexpectedError(
		"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, `dataTableId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
	);
}
