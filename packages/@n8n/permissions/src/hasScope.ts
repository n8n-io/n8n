import type { Scope, ScopeLevels, GlobalScopes, ProjectScopes, ResourceScopes } from './types';

export type HasScopeMode = 'oneOf' | 'allOf';
export type HasScopeOptions = {
	mode: HasScopeMode;
};

export function hasScope(
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: GlobalScopes,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: unknown,
	options: HasScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const userScopeSet = new Set(Object.values(userScopes ?? {}).flat());

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
