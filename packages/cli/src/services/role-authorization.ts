import type { User } from '@n8n/db';
import {
	getAuthPrincipalScopes,
	hasGlobalScope,
	type Scope,
	type Role as RoleDTO,
	type RoleNamespace,
} from '@n8n/permissions';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Managing a role requires `role:manage`; `role:manageProject` grants it for
 * project roles only.
 *
 * When `apiKeyScopes` is given (Public API), authorization is
 * decided entirely by the API key's own granted scopes.
 *
 * When `apiKeyScopes` is omitted (Internal API, no API-key
 * concept), authorization falls back to the user's own scopes.
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
 * Check if a user has a global role capable of reassigning users to another role
 * and the user does not hold the target role.
 */
export function canReassignUsers(user: User, role: RoleDTO): boolean {
	const requiredScopes: Scope[] = ['role:manage', 'user:changeRole'];

	return (
		role.roleType === 'global' &&
		user.role.slug !== role.slug &&
		requiredScopes.every((scope) => hasGlobalScope(user, scope))
	);
}
