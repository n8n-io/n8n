import { ALL_SCOPES } from '../scope-information';
import type { AuthPrincipal } from '../types.ee';

/**
 * Gets global scopes for a principal's role.
 * @param principal - Contains the role to look up
 * @returns Array of scopes for the role, or empty array if not found
 */
export const getGlobalScopes = (principal: AuthPrincipal) => {
	// DEV MODE: Return all scopes if development enterprise mode is enabled
	if (process.env.N8N_DEV_ENTERPRISE_MODE === 'true') {
		return ALL_SCOPES;
	}
	return principal.role.scopes.map((scope) => scope.slug) ?? [];
};
