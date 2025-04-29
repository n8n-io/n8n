import { ALL_ROLE_MAPS } from '../roles/role-maps.ee';
import type { AllRoleTypes, Resource, Scope } from '../types.ee';

export const COMBINED_ROLE_MAP = Object.fromEntries(
	Object.values(ALL_ROLE_MAPS).flatMap((o: Record<string, Scope[]>) => Object.entries(o)),
) as Record<AllRoleTypes, Scope[]>;

/**
 * Retrieves the scopes associated with a specific role.
 *
 * @param {AllRoleTypes} role - The role to get scopes for
 * @param {Resource[]} [filters] - Optional array of resources to filter the scopes by
 * @returns {Scope[]} Array of scopes associated with the given role, optionally filtered by resources
 *
 * @example
 * // Get all scopes for the owner role
 * const ownerScopes = getRoleScopes('owner');
 *
 * @example
 * // Get only workflow related scopes for the owner role
 * const workflowScopes = getRoleScopes('owner', ['workflow']);
 */
export function getRoleScopes(role: AllRoleTypes, filters?: Resource[]): Scope[] {
	let scopes = COMBINED_ROLE_MAP[role];
	if (filters) {
		scopes = scopes.filter((s) => filters.includes(s.split(':')[0] as Resource));
	}
	return scopes;
}
