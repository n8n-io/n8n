import { ALL_ROLE_MAPS } from '../roles/role-maps.ee';
import type { AllRoleTypes, AuthPrincipal, Resource, Scope } from '../types.ee';

export const COMBINED_ROLE_MAP = Object.fromEntries(
	Object.values(ALL_ROLE_MAPS).flatMap((o: Record<string, Scope[]>) => Object.entries(o)),
) as Record<AllRoleTypes, Scope[]>;

/**
 * Gets scopes for a role, optionally filtered by resource types.
 * @param role - The role to look up
 * @param filters - Optional resources to filter scopes by
 * @returns Array of matching scopes
 *
 * @deprecated Use the 'getRoleScopes' from the AuthRolesService instead.
 */
export function getRoleScopes(role: AllRoleTypes, filters?: Resource[]): Scope[] {
	let scopes = COMBINED_ROLE_MAP[role];
	if (filters) {
		scopes = scopes.filter((s) => filters.includes(s.split(':')[0] as Resource));
	}
	return scopes;
}

/**
 * Gets scopes for an auth principal, optionally filtered by resource types.
 * @param user - The auth principal to search scopes for
 * @param filters - Optional resources to filter scopes by
 * @returns Array of matching scopes
 */
export function getAuthPrincipalScopes(user: AuthPrincipal, filters?: Resource[]): Scope[] {
	if (!user.role) {
		const e = new Error('AuthPrincipal does not have a role defined');
		console.error('AuthPrincipal does not have a role defined', e);
		throw e;
	}
	let scopes = user.role.scopes.map((s) => s.slug);
	if (filters) {
		scopes = scopes.filter((s) => filters.includes(s.split(':')[0] as Resource));
	}
	return scopes;
}
