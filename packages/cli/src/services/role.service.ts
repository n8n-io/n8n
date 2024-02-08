import { Service } from 'typedi';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { Scope } from '@n8n/permissions';
import {
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
	REGULAR_PROJECT_ADMIN_SCOPES,
} from '@/permissions/scopes-for-project-roles';

export const PROJECT_SCOPES: Record<string, Scope[]> = {
	'project:admin': REGULAR_PROJECT_ADMIN_SCOPES,
	'project:editor': PROJECT_EDITOR_SCOPES,
	'project:viewer': PROJECT_VIEWER_SCOPES,
};

@Service()
export class RoleService {
	/**
	 * Find the distinct scopes in an array of project roles.
	 *
	 * Personal project admin scopes are excluded because they are
	 * not relevant to the permission checker.
	 */
	getScopesBy(projectRoles: Set<ProjectRole>) {
		return [...projectRoles].reduce<Set<Scope>>((acc, projectRole) => {
			for (const scope of PROJECT_SCOPES[projectRole] ?? []) {
				acc.add(scope);
			}

			return acc;
		}, new Set());
	}
}
