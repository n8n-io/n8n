import {
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

import { CredentialsFinderService } from '../credentials/credentials-finder.service';
import { ProjectOwnedResourceScopeResolverRegistry } from './project-owned-resource-scope-resolver.registry';
import { ProjectScopeService } from './project-scope.service';
import { RoleService } from './role.service';

const INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES = new Set<Scope>([
	'credential:read',
	'credential:update',
	'credential:delete',
]);

export type ScopeAccessResource =
	| { type: 'project'; projectId: string }
	| { type: 'workflow'; workflowId: string }
	| { type: 'credential'; credentialId: string }
	| { type: 'moduleResource'; resourceType: string; resourceId: string };

export interface ScopeAccessRequest {
	user: User;
	scopes: Scope[];
	globalOnly?: boolean;
	resource: ScopeAccessResource;
	context?: OperationContext;
}

@Service()
export class ScopeAccessService {
	constructor(
		private readonly projectScopeService: ProjectScopeService,
		private readonly roleService: RoleService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly resourceResolverRegistry: ProjectOwnedResourceScopeResolverRegistry,
	) {}

	async hasScopes({
		user,
		scopes,
		globalOnly = false,
		resource,
		context = {},
	}: ScopeAccessRequest) {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return true;
		if (globalOnly) return false;

		const projectIds = (await this.projectScopeService.getProjectIds(user, scopes, context)) ?? [];

		switch (resource.type) {
			case 'project':
				return projectIds.includes(resource.projectId);
			case 'workflow':
				return await this.hasWorkflowAccess(resource.workflowId, scopes, projectIds, context);
			case 'credential':
				return await this.hasCredentialAccess(
					user,
					resource.credentialId,
					scopes,
					projectIds,
					context,
				);
			case 'moduleResource':
				return await this.hasModuleResourceAccess(resource, projectIds);
		}
	}

	private async hasWorkflowAccess(
		workflowId: string,
		scopes: Scope[],
		projectIds: string[],
		context: OperationContext,
	) {
		const roles = await this.roleService.rolesWithScopeInContext('workflow', scopes, context);
		const access = await this.sharedWorkflowRepository.findScopeAccess(
			workflowId,
			projectIds,
			roles,
			context,
		);

		if (!access.exists) throw new NotFoundError(`Workflow with ID "${workflowId}" not found.`);
		return access.hasAccess;
	}

	private async hasCredentialAccess(
		user: User,
		credentialId: string,
		scopes: Scope[],
		projectIds: string[],
		context: OperationContext,
	) {
		if (
			hasGlobalScope(user, 'credential:manageInstance') &&
			scopes.every((scope) => INSTANCE_CREDENTIAL_MANAGEMENT_SCOPES.has(scope)) &&
			(await this.credentialsRepository.isInstanceCredential(credentialId, context))
		) {
			return true;
		}

		const roles = await this.roleService.rolesWithScopeInContext('credential', scopes, context);
		const access = await this.sharedCredentialsRepository.findScopeAccess(
			credentialId,
			projectIds,
			roles,
			context,
		);

		if (!access.exists) throw new NotFoundError(`Credential with ID "${credentialId}" not found.`);
		if (access.hasAccess) return true;
		return await this.hasGlobalCredentialAccess(credentialId, scopes);
	}

	private async hasGlobalCredentialAccess(credentialId: string, scopes: Scope[]) {
		const isReadOnlyRequest = this.credentialsFinderService.hasGlobalReadOnlyAccess(scopes);
		const isConnectRequest = this.credentialsFinderService.hasGlobalConnectAccess(scopes);
		if (!isReadOnlyRequest && !isConnectRequest) return false;

		const credential = await this.credentialsFinderService.findGlobalCredentialById(credentialId);
		return credential !== null && (isReadOnlyRequest || credential.isResolvable);
	}

	private async hasModuleResourceAccess(
		resource: Extract<ScopeAccessResource, { type: 'moduleResource' }>,
		projectIds: string[],
	) {
		const resolver = this.resourceResolverRegistry.get(resource.resourceType);
		const projectId = await resolver?.findProjectId(resource.resourceId);
		if (!projectId) {
			const resourceName = resource.resourceType === 'dataTable' ? 'Data table' : 'Resource';
			throw new NotFoundError(`${resourceName} with ID "${resource.resourceId}" not found.`);
		}

		return projectIds.includes(projectId);
	}
}
