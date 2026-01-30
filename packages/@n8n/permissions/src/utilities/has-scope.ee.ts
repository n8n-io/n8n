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
	  // Normalise input to an array
    const requiredScopes = Array.isArray(scope) ? scope : [scope];

    // Combine the raw user scopes with optional masks into a Set for O(1) look‑ups
    const userScopeSet = combineScopes(userScopes, masks);

    // Guard against empty `requiredScopes` – no scopes to check => false
    if (requiredScopes.length === 0) {
        return false;
    }

    // -----------------------------------------------------------------
    // Mode handling
    // -----------------------------------------------------------------
    // * allOf – every requested scope must be present
    // * anyOf (default) – at least one requested scope must be present
    // -----------------------------------------------------------------
    if (options.mode === 'allOf') {
        return requiredScopes.every((s) => userScopeSet.has(s));
    }

    // default: anyOf (or any unrecognised mode falls back to anyOf)
    return requiredScopes.some((s) => userScopeSet.has(s));
};
