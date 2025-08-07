import { GLOBAL_SCOPE_MAP, type GlobalRole } from '@n8n/permissions';

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
	};
}

export const GLOBAL_OWNER_ROLE = buildInRoleToRoleObject('global:owner');
export const GLOBAL_ADMIN_ROLE = buildInRoleToRoleObject('global:admin');
export const GLOBAL_MEMBER_ROLE = buildInRoleToRoleObject('global:member');

export const GLOBAL_ROLES: Record<GlobalRole, Role> = {
	'global:owner': GLOBAL_OWNER_ROLE,
	'global:admin': GLOBAL_ADMIN_ROLE,
	'global:member': GLOBAL_MEMBER_ROLE,
};
