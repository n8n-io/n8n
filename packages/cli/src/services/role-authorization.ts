import type { User } from '@n8n/db';
import { getAuthPrincipalScopes, type Role as RoleDTO, type RoleNamespace } from '@n8n/permissions';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Whether a caller can manage a role requires `role:manage`; `role:manageProject` grants it for
 * project roles only.
 */
export function assertCanManageRoleType({
	apiKeyScopes,
	roleType,
	user,
}: {
	apiKeyScopes?: readonly string[];
	roleType: RoleNamespace;
	user: User;
}): void {
	const canManage = (scopes: readonly string[]) =>
		scopes.includes('role:manage') ||
		(roleType === 'project' && scopes.includes('role:manageProject'));

	const scopes = apiKeyScopes ?? getAuthPrincipalScopes(user);

	if (!canManage(scopes)) {
		throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	}
}

/**
 * Whether the caller may reassign a global role's users to another role before deleting it.
 */
export function canReassignUsers({
	apiKeyScopes,
	role,
	user,
}: {
	apiKeyScopes?: readonly string[];
	role: RoleDTO;
	user: User;
}): boolean {
	if (role.roleType !== 'global' || user.role.slug === role.slug) {
		return false;
	}

	const scopes = apiKeyScopes ?? getAuthPrincipalScopes(user);

	return scopes.includes('role:manage') && scopes.includes('user:changeRole');
}
