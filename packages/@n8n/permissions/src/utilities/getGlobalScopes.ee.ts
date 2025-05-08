import { GLOBAL_SCOPE_MAP } from '../roles/role-maps.ee';
import type { AuthPrincipal } from '../types.ee';

/**
 * Gets global scopes for a principal's role.
 * @param principal - Contains the role to look up
 * @returns Array of scopes for the role, or empty array if not found
 */
export const getGlobalScopes = (principal: AuthPrincipal) => GLOBAL_SCOPE_MAP[principal.role] ?? [];
