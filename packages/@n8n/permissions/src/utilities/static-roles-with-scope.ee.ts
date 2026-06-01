import { ALL_ROLE_MAPS } from '../roles/role-maps.ee';
import type { RoleNamespace, Scope } from '../types.ee';

/**
 * Retrieves roles within a specific namespace that have all the given scopes.
 *
 * This is only valid for static roles defined in ALL_ROLE_MAPS, with custom roles
 * being handled in the RoleService.
 *
 * @param namespace - The role namespace to search in
 * @param scopes - Scope(s) to filter by
 */
export function staticRolesWithScope(namespace: RoleNamespace, scopes: Scope | Scope[]) {
	if (!Array.isArray(scopes)) {
		scopes = [scopes];
	}

	return Object.keys(ALL_ROLE_MAPS[namespace]).filter((k) => {
		return scopes.every((s) =>
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
			((ALL_ROLE_MAPS[namespace] as any)[k] as Scope[]).includes(s),
		);
	});
}
