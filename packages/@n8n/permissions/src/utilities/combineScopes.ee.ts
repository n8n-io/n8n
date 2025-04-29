import type { Scope, ScopeLevels, MaskLevels } from '../types.ee';

/**
 * Combines user scopes from different levels into a single set, with optional masking.
 *
 * This function aggregates scopes from different levels (global, project, resource)
 * and applies masks if provided. Masks are used to filter out specific scopes
 * at certain levels - typically for sharing contexts.
 *
 * Note that masking is only applied to project and resource level scopes,
 * not to global scopes.
 *
 * @param {ScopeLevels} userScopes - The user's scopes organized by level
 * @param {MaskLevels} [masks] - Optional masks to filter scopes at non-global levels
 * @returns {Set<Scope>} A set containing all the user's scopes after masking
 *
 * @example
 * // Combine scopes without masking
 * const allScopes = combineScopes({
 *   global: ['user:list'],
 *   project: ['workflow:read', 'workflow:update'],
 *   resource: ['credential:read']
 * });
 *
 * @example
 * // Combine scopes with sharing mask
 * const maskedScopes = combineScopes(
 *   {
 *     global: ['user:list'],
 *     project: ['workflow:read', 'workflow:update', 'workflow:delete'],
 *     resource: ['credential:read']
 *   },
 *   { sharing: ['workflow:read', 'credential:read'] }
 * );
 * // Result will contain 'user:list', 'workflow:read', 'credential:read'
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
