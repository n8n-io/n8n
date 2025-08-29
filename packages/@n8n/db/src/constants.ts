import {
	GLOBAL_SCOPE_MAP,
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_SCOPE_MAP,
	PROJECT_VIEWER_ROLE_SLUG,
	type GlobalRole,
	type ProjectRole,
} from '@n8n/permissions';

import type { Role } from 'entities';

export function buildInRoleToRoleObject(role: GlobalRole): Role {
	return {
		slug: role,
		displayName: role,
		scopes: GLOBAL_SCOPE_MAP[role].map((scope) => {
			return {
				slug: scope,
				displayName: scope,
				description: null,
			};
		}),
		systemRole: true,
		roleType: 'global',
		description: `Built-in global role with ${role} permissions.`,
	} as Role;
}

export function buildInProjectRoleToRoleObject(role: ProjectRole): Role {
	return {
		slug: role,
		displayName: role,
		scopes: PROJECT_SCOPE_MAP[role].map((scope) => {
			return {
				slug: scope,
				displayName: scope,
				description: null,
			};
		}),
		systemRole: true,
		roleType: 'project',
		description: `Built-in project role with ${role} permissions.`,
	} as Role;
}

export const GLOBAL_OWNER_ROLE = buildInRoleToRoleObject('global:owner');
export const GLOBAL_ADMIN_ROLE = buildInRoleToRoleObject('global:admin');
export const GLOBAL_MEMBER_ROLE = buildInRoleToRoleObject('global:member');

export const PROJECT_OWNER_ROLE = buildInProjectRoleToRoleObject(PROJECT_OWNER_ROLE_SLUG);
export const PROJECT_ADMIN_ROLE = buildInProjectRoleToRoleObject(PROJECT_ADMIN_ROLE_SLUG);
export const PROJECT_EDITOR_ROLE = buildInProjectRoleToRoleObject(PROJECT_EDITOR_ROLE_SLUG);
export const PROJECT_VIEWER_ROLE = buildInProjectRoleToRoleObject(PROJECT_VIEWER_ROLE_SLUG);

export const GLOBAL_ROLES: Record<GlobalRole, Role> = {
	'global:owner': GLOBAL_OWNER_ROLE,
	'global:admin': GLOBAL_ADMIN_ROLE,
	'global:member': GLOBAL_MEMBER_ROLE,
};

export const PROJECT_ROLES: Record<ProjectRole, Role> = {
	[PROJECT_OWNER_ROLE_SLUG]: PROJECT_OWNER_ROLE,
	[PROJECT_ADMIN_ROLE_SLUG]: PROJECT_ADMIN_ROLE,
	[PROJECT_EDITOR_ROLE_SLUG]: PROJECT_EDITOR_ROLE,
	[PROJECT_VIEWER_ROLE_SLUG]: PROJECT_VIEWER_ROLE,
};
