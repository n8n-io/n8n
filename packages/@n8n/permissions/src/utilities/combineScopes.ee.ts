import type { Scope, ScopeLevels, MaskLevels } from '../types.ee';

/**
 * Combines scopes from different levels into a deduplicated set.
 *
 * @param userScopes - Scopes organized by level (global, project, resource)
 * @param masks - Optional filters for non-global scopes
 * @returns Set containing all allowed scopes
 *
 * @example
 * combineScopes({
 *   global: ['user:list'],
 *   project: ['workflow:read'],
 * }, { sharing: ['workflow:read'] });
 */
export function combineScopes(userScopes: ScopeLevels, masks?: MaskLevels): Set<Scope> {
	const maskedScopes: ScopeLevels = Object.fromEntries(
		Object.entries(userScopes).map((e) => [e[0], [...e[1]]]),
	) as ScopeLevels;

	if (masks?.sharing) {
		if (maskedScopes.project) {
			maskedScopes.project = maskedScopes.project.filter((v) => masks.sharing.includes(v));
		}
		if (maskedScopes.resource) {
			maskedScopes.resource = maskedScopes.resource.filter((v) => masks.sharing.includes(v));
		}
	}

	return new Set(Object.values(maskedScopes).flat());
}
