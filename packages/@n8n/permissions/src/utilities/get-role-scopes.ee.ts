import { ALL_ROLE_MAPS } from '../roles/role-maps.ee';
import type { AllRoleTypes, Resource, Scope } from '../types.ee';

export const COMBINED_ROLE_MAP = Object.fromEntries(
	Object.values(ALL_ROLE_MAPS).flatMap((o: Record<string, Scope[]>) => Object.entries(o)),
) as Record<AllRoleTypes, Scope[]>;

/**
 * Gets scopes for a role, optionally filtered by resource types.
 * @param role - The role to look up
 * @param filters - Optional resources to filter scopes by
 * @returns Array of matching scopes
 */
export function getRoleScopes(role: AllRoleTypes, filters?: Resource[]): Scope[] {
	let scopes = COMBINED_ROLE_MAP[role];
	if (filters) {
		scopes = scopes.filter((s) => filters.includes(s.split(':')[0] as Resource));
	}
	return scopes;
}
