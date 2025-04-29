import { combineScopes } from './combineScopes.ee';
import type { Scope, ScopeLevels, ScopeOptions, MaskLevels } from '../types.ee';

/**
 * Checks if a user has the required scope(s) based on their assigned scopes and optional masks.
 *
 * The function supports two modes of operation:
 * - 'oneOf': Returns true if the user has at least one of the requested scopes (default)
 * - 'allOf': Returns true if the user has all of the requested scopes
 *
 * Masks can be used to restrict which scopes are valid for certain operations,
 * especially useful for sharing contexts.
 *
 * @param {Scope | Scope[]} scope - The scope(s) to check for
 * @param {ScopeLevels} userScopes - The user's assigned scopes, organized by level
 * @param {MaskLevels} [masks] - Optional mask to restrict which scopes are valid
 * @param {ScopeOptions} [options={ mode: 'oneOf' }] - Options to control the scope checking behavior
 * @returns {boolean} True if the user has the required scope(s) based on the specified mode
 *
 * @example
 * // Check if user has 'workflow:read' permission
 * const canReadWorkflow = hasScope('workflow:read', userScopes);
 *
 * @example
 * // Check if user has both 'workflow:update' and 'workflow:execute' permissions
 * const canUpdateAndExecute = hasScope(
 *   ['workflow:update', 'workflow:execute'],
 *   userScopes,
 *   undefined,
 *   { mode: 'allOf' }
 * );
 *
 * @example
 * // Check permission with sharing masks
 * const canShareWorkflow = hasScope(
 *   'workflow:share',
 *   userScopes,
 *   { sharing: ['workflow:read', 'workflow:share'] }
 * );
 */
export const hasScope = (
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	masks?: MaskLevels,
	options: ScopeOptions = { mode: 'oneOf' },
): boolean => {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const userScopeSet = combineScopes(userScopes, masks);

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
};
