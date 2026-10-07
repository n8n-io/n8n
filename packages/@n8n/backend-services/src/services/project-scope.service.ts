import { ProjectRelationRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

import { RoleService } from './role.service';

/**
 * Resolves the project roles, or the project IDs, that restrict a scope-aware query.
 * `null` means the user's global role grants access to every project.
 */
@Service()
export class ProjectScopeService {
	constructor(
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	async getProjectRoleSlugs(
		user: User,
		scopes: Scope[],
		ctx: OperationContext = {},
	): Promise<string[] | null> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return null;

		return await this.roleService.rolesWithScopeInContext('project', scopes, ctx);
	}

	async getProjectIds(
		user: User,
		scopes: Scope[],
		ctx: OperationContext = {},
	): Promise<string[] | null> {
		const roles = await this.getProjectRoleSlugs(user, scopes, ctx);
		if (roles === null) return null;

		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles, ctx);
	}
}
