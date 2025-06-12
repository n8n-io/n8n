import { combineScopes } from './combine-scopes.ee';
import type { Scope, ScopeLevels, ScopeOptions, MaskLevels } from '../types.ee';

/**
 * Checks if scopes exist in user's permissions.
 * @param scope - Scope(s) to check
 * @param userScopes - User's permission levels
 * @param masks - Optional scope filters
 * @param options - Checking mode (default: oneOf)
 */
export const hasScope = (
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	masks?: MaskLevels,
	options: ScopeOptions = { mode: 'oneOf' },
): boolean => {
	if (!Array.isArray(scope)) scope = [scope];
	const userScopeSet = combineScopes(userScopes, masks);
	return options.mode === 'allOf'
		? !!scope.length && scope.every((s) => userScopeSet.has(s))
		: scope.some((s) => userScopeSet.has(s));
};
