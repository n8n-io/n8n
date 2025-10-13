import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_OWNER_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
	type ProjectRole,
	ALL_ROLES,
	type GlobalRole,
	type Role as RoleDTO,
} from '@n8n/permissions';

import type { Role } from 'entities';

export function builtInRoleToRoleObject(
	role: RoleDTO,
	roleType: 'global' | 'project' | 'workflow' | 'credential',
): Role {
	return {
		slug: role.slug,
		displayName: role.displayName,
		scopes: role.scopes.map((scope) => {
			return {
				slug: scope,
				displayName: scope,
				description: null,
			};
		}),
		systemRole: true,
		roleType,
		description: role.description,
	} as Role;
}

function toRoleMap(allRoles: Role[]): Record<string, Role> {
	return allRoles.reduce(
		(acc, role) => {
			acc[role.slug] = role;
			return acc;
		},
		{} as Record<string, Role>,
	);
}

export const ALL_BUILTIN_ROLES = toRoleMap([
	...ALL_ROLES.global.map((role) => builtInRoleToRoleObject(role, 'global')),
	...ALL_ROLES.project.map((role) => builtInRoleToRoleObject(role, 'project')),
	...ALL_ROLES.credential.map((role) => builtInRoleToRoleObject(role, 'credential')),
	...ALL_ROLES.workflow.map((role) => builtInRoleToRoleObject(role, 'workflow')),
]);

export const GLOBAL_OWNER_ROLE = ALL_BUILTIN_ROLES['global:owner'];
export const GLOBAL_ADMIN_ROLE = ALL_BUILTIN_ROLES['global:admin'];
export const GLOBAL_MEMBER_ROLE = ALL_BUILTIN_ROLES['global:member'];

export const PROJECT_OWNER_ROLE = ALL_BUILTIN_ROLES[PROJECT_OWNER_ROLE_SLUG];
export const PROJECT_ADMIN_ROLE = ALL_BUILTIN_ROLES[PROJECT_ADMIN_ROLE_SLUG];
export const PROJECT_EDITOR_ROLE = ALL_BUILTIN_ROLES[PROJECT_EDITOR_ROLE_SLUG];
export const PROJECT_VIEWER_ROLE = ALL_BUILTIN_ROLES[PROJECT_VIEWER_ROLE_SLUG];

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
