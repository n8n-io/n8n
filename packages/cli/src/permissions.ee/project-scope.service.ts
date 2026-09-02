import { ProjectRelationRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

/**
 * Resolves the project restriction for a scope-aware query.
 * `null` means the user's global role grants access to every project.
 */
@Service()
export class ProjectScopeService {
	constructor(
		private readonly roleService: RoleService,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	async getProjectIds(user: User, scopes: Scope[]): Promise<string[] | null> {
		if (hasGlobalScope(user, scopes, { mode: 'allOf' })) return null;

		const roles = await this.roleService.rolesWithScope('project', scopes);
		return await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles);
	}
}
