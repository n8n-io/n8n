import { ProjectRelationRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type AuthPrincipal, type Scope } from '@n8n/permissions';

import { RoleService } from './role.service';

/**
 * Checks project-level access, and resolves the project roles or the project IDs that
 * restrict a scope-aware query. `null` means the user's global role grants access to
 * every project.
 */
@Service()
export class ProjectScopeService {
	constructor(
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/** Whether the user's global role, or their role in the project, grants all `scopes`. */
	async hasScopes(
		user: AuthPrincipal & { id: string },
		projectId: string,
		scopes: Scope[],
	): Promise<boolean> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return true;

		const roles = await this.roleService.rolesWithScope('project', scopes);
		return await this.projectRelationRepository.hasAnyRoleInProject(user.id, projectId, roles);
	}

	async getProjectRoleSlugs(user: User, scopes: Scope[]): Promise<string[] | null> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return null;

		return await this.roleService.rolesWithScope('project', scopes);
	}

	async getProjectIds(user: User, scopes: Scope[]): Promise<string[] | null> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return null;

		return await this.getMemberProjectIds(user, scopes);
	}

	/**
	 * Like {@link getProjectIds}, but ignores the global role: only projects the
	 * user is a member of with a role that grants all `scopes`.
	 */
	async getMemberProjectIds(user: User, scopes: Scope[]): Promise<string[]> {
		const roles = await this.roleService.rolesWithScope('project', scopes);
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles);
	}
}
