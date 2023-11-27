import type { Scope, ScopeLevels, GlobalScopes, ScopeOptions } from './types';

export function hasScope(
	scope: Scope | Scope[],
	userScopes: GlobalScopes,
	options?: ScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	options?: ScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: GlobalScopes | ScopeLevels,
	options: ScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const userScopeSet = new Set(Object.values(userScopes).flat());

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
