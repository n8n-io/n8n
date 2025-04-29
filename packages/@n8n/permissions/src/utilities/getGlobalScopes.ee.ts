import { GLOBAL_SCOPE_MAP } from '../roles/role-maps.ee';
import type { AuthPrincipal } from '../types.ee';

/**
 * Retrieves the global scopes associated with an authenticated principal's role.
 *
 * This utility function returns the set of global permission scopes that are
 * assigned to a specific global role. If the principal's role is not found
 * in the global scope map, an empty array is returned.
 *
 * @param {AuthPrincipal} principal - The authentication principal containing the role
 * @returns {Scope[]} Array of global permission scopes for the principal's role,
 *                    or an empty array if the role doesn't exist in the global scope map
 *
 * @example
 * // Get global scopes for an owner
 * const ownerScopes = getGlobalScopes({ role: 'global:owner' });
 *
 * @example
 * // Get global scopes for a member
 * const memberScopes = getGlobalScopes({ role: 'global:member' });
 */
export const getGlobalScopes = (principal: AuthPrincipal) => GLOBAL_SCOPE_MAP[principal.role] ?? [];
