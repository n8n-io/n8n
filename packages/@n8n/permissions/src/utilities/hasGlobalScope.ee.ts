import { getGlobalScopes } from './getGlobalScopes.ee';
import { hasScope } from './hasScope.ee';
import type { AuthPrincipal, Scope, ScopeOptions } from '../types.ee';

/**
 * Checks if an authentication principal has the specified global scope(s).
 *
 * This is a convenience function that combines getGlobalScopes and hasScope
 * to determine if a principal has specific permissions at the global level.
 * It supports checking for one or multiple scopes with configurable options.
 *
 * @param {AuthPrincipal} principal - The authentication principal to check permissions for
 * @param {Scope | Scope[]} scope - A single scope or array of scopes to check
 * @param {ScopeOptions} [scopeOptions] - Optional configuration for scope checking behavior
 * @returns {boolean} True if the principal has the required scope(s) according to the options
 *
 * @example
 * // Check if user has workflow read permission
 * const canReadWorkflows = hasGlobalScope(
 *   { id: '1', role: 'global:member' },
 *   'workflow:read'
 * );
 *
 * @example
 * // Check if user has both create and delete permissions
 * const canCreateAndDelete = hasGlobalScope(
 *   { id: '2', role: 'global:admin' },
 *   ['workflow:create', 'workflow:delete'],
 *   { mode: 'allOf' }
 * );
 */
export const hasGlobalScope = (
	principal: AuthPrincipal,
	scope: Scope | Scope[],
	scopeOptions?: ScopeOptions,
): boolean => {
	const global = getGlobalScopes(principal);
	return hasScope(scope, { global }, undefined, scopeOptions);
};
