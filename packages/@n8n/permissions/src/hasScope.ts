import { combineScopes } from './combineScopes';
import type { Scope, ScopeLevels, GlobalScopes, ScopeOptions, MaskLevels } from './types';

export function hasScope(
	scope: Scope | Scope[],
	userScopes: GlobalScopes,
	masks?: MaskLevels,
	options?: ScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	masks?: MaskLevels,
	options?: ScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: GlobalScopes | ScopeLevels,
	masks?: MaskLevels,
	options: ScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const userScopeSet = combineScopes(userScopes, masks);

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
