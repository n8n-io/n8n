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
	const result = new Set<Scope>();
	const sharingMask = masks?.sharing;

	for (const key in userScopes) {
		const scopes = userScopes[key as keyof ScopeLevels];
		if (!scopes) continue;

		const shouldMask = sharingMask && (key === 'project' || key === 'resource');

		for (const scope of scopes) {
			if (!shouldMask || sharingMask.includes(scope)) {
				result.add(scope);
			}
		}
	}

	return result;
}
