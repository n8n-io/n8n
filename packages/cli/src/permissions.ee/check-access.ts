import { ModuleRegistry } from '@n8n/backend-common';
import type { OperationContext, User } from '@n8n/db';
import { ScopeAccessRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialsFinderService, RoleService } from '@n8n/backend-services';
import { NotFoundError } from '@n8n/errors';

const INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES = new Set<Scope>([
	'credential:read',
	'credential:update',
	'credential:delete',
]);

/**
 * Global credentials bypass per-recipient sharing rows, so they are checked
 * separately: read-only access for any global credential, plus connect
 * access when the credential is an end-user (resolvable) credential.
 */
async function hasGlobalCredentialAccess(
	credentialsFinderService: CredentialsFinderService,
	credentialId: string,
	scopes: Scope[],
): Promise<boolean> {
	const isReadOnlyRequest = credentialsFinderService.hasGlobalReadOnlyAccess(scopes);
	const isConnectRequest = credentialsFinderService.hasGlobalConnectAccess(scopes);
	if (!isReadOnlyRequest && !isConnectRequest) return false;

	const globalCredential = await credentialsFinderService.findGlobalCredentialById(credentialId);
	if (!globalCredential) return false;

	return isReadOnlyRequest || globalCredential.isResolvable;
}

/**
 * Check if a user has the required scopes. The check can be:
 *
 * - only for scopes in the user's global role, or
 * - for scopes in the user's global role, else for scopes in the resource roles
 *   of projects including the user and the resource, else for scopes in the
 *   project roles in those projects.
 */
export async function userHasScopes(
	user: User,
	scopes: Scope[],
	globalOnly: boolean,
	{
		credentialId,
		workflowId,
		projectId,
		dataTableId,
	}: {
		credentialId?: string;
		workflowId?: string;
		projectId?: string;
		dataTableId?: string;
	} /* only one */,
	ctx: OperationContext = {},
): Promise<boolean> {
	if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return true;

	const scopeAccessRepository = Container.get(ScopeAccessRepository);

	if (
		credentialId &&
		hasGlobalScope(user, 'credential:manageInstance') &&
		scopes.every((scope) => INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES.has(scope)) &&
		(await scopeAccessRepository.isInstanceCredential(credentialId, ctx))
	) {
		return true;
	}

	if (globalOnly) return false;

	const userProjectIds = await scopeAccessRepository.findProjectIdsWithAllScopes(
		user.id,
		scopes,
		ctx,
	);

	// Find which resource roles are defined to contain the required scopes.
	// Then find at least one of the above qualifying projects having one of
	// those resource roles over the resource being checked.
	const roleService = Container.get(RoleService);
	// Inside a transaction, read the roles on its connection instead of the cache loader's.
	const loadRoles = ctx.trx
		? async () => await scopeAccessRepository.findRolesForAccessCheck(ctx)
		: undefined;
	const rolesWithScope = async (namespace: 'credential' | 'workflow') =>
		loadRoles
			? await roleService.rolesWithScope(namespace, scopes, loadRoles)
			: await roleService.rolesWithScope(namespace, scopes);

	if (credentialId) {
		const credentials = await scopeAccessRepository.findCredentialSharings(credentialId, ctx);
		if (!credentials.length) {
			throw new NotFoundError(`Credential with ID "${credentialId}" not found.`);
		}

		const validRoles = await rolesWithScope('credential');

		const hasValidRoles = credentials.some(
			(c) => userProjectIds.includes(c.projectId) && validRoles.includes(c.role),
		);

		if (hasValidRoles) {
			return true;
		}

		const credentialsFinderService = Container.get(CredentialsFinderService);
		return await hasGlobalCredentialAccess(credentialsFinderService, credentialId, scopes);
	}

	if (workflowId) {
		const workflows = await scopeAccessRepository.findWorkflowSharings(workflowId, ctx);

		if (!workflows.length) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found.`);
		}

		const validRoles = await rolesWithScope('workflow');

		return workflows.some(
			(w) => userProjectIds.includes(w.projectId) && validRoles.includes(w.role),
		);
	}

	if (dataTableId) {
		const moduleRegistry = Container.get(ModuleRegistry);
		if (!moduleRegistry.isActive('data-table')) {
			throw new NotFoundError(`Data table with ID "${dataTableId}" not found.`);
		}

		const { DataTableRepository } = await import('@n8n/backend-module-data-table');
		const dataTable = await Container.get(DataTableRepository).findOne({
			where: { id: dataTableId },
			relations: ['project'],
		});

		if (!dataTable) {
			throw new NotFoundError(`Data table with ID "${dataTableId}" not found.`);
		}

		// Data tables don't have resource-level roles, only project-level access
		return userProjectIds.includes(dataTable.project.id);
	}

	if (projectId) return userProjectIds.includes(projectId);

	throw new UnexpectedError(
		"`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, `dataTableId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.",
	);
}
