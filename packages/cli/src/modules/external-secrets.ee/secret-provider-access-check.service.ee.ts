import type { User } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { combineScopes, getAuthPrincipalScopes, hasGlobalScope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

@Service()
export class SecretsProviderAccessCheckService {
	constructor(
		private readonly connectionRepository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly roleService: RoleService,
		private readonly projectService: ProjectService,
	) {}

	async isProviderAvailableInProject(providerKey: string, projectId: string): Promise<boolean> {
		return await this.connectionRepository.isProviderAvailableInProject(providerKey, projectId);
	}

	/**
	 * Asserts that the project's sharing role on a connection grants the required scope.
	 * Throws ForbiddenError if the project's access role does not have the required scope.
	 *
	 * Users with the global scope bypass the project role check.
	 */
	async assertConnectionAccess({
		providerKey,
		projectId,
		requiredScope,
		user,
	}: {
		providerKey: string;
		projectId: string;
		requiredScope: Scope;
		user: User;
	}): Promise<void> {
		const access = await this.projectAccessRepository.findOne({
			where: {
				secretsProviderConnection: { providerKey },
				projectId,
			},
		});

		if (!access) {
			throw new NotFoundError(
				`Connection with key "${providerKey}" not found in project "${projectId}"`,
			);
		}

		if (hasGlobalScope(user, requiredScope)) {
			return;
		}

		const validRoles = await this.roleService.rolesWithScope('secretsProviderConnection', [
			requiredScope,
		]);

		if (!validRoles.includes(access.role)) {
			throw new ForbiddenError(
				'Project does not have the required access level for this connection',
			);
		}
	}

	/**
	 * Computes the effective scopes for a user on a connection within a project context.
	 * Combines global scopes, project-level scopes, and the connection's sharing role scopes.
	 */
	async getConnectionScopesForProject(
		user: User,
		providerKey: string,
		projectId: string,
	): Promise<Scope[]> {
		const globalScopes = getAuthPrincipalScopes(user, [
			'externalSecretsProvider',
			'externalSecret',
		]);

		const access = await this.projectAccessRepository.findOne({
			where: {
				secretsProviderConnection: { providerKey },
				projectId,
			},
		});

		// For global connections (no project access entry), treat as read-only (user role)
		const sharingRoleSlug = access?.role ?? 'secretsProviderConnection:user';

		const userProjectRelations = await this.projectService.getProjectRelationsForUser(user);
		const projectRelation = userProjectRelations.find((pr) => pr.projectId === projectId);
		const projectScopes: Scope[] = projectRelation
			? projectRelation.role.scopes.map((s) => s.slug)
			: [];

		const sharingRole = await this.roleService.getRole(sharingRoleSlug);
		const sharingScopes = sharingRole.scopes as Scope[];

		const mergedScopes = combineScopes(
			{ global: globalScopes, project: projectScopes },
			{ sharing: sharingScopes },
		);

		return [...mergedScopes].sort();
	}
}
