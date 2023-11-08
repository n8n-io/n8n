import type { Scope, ScopeLevels } from './types';

export type HasScopeMode = 'oneOf' | 'allOf';
export interface HasScopeOptions {
	mode: HasScopeMode;
}

export function hasScope(
	scope: Scope | Scope[],
	userScopes: ScopeLevels,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: Pick<ScopeLevels, 'global'>,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: Omit<ScopeLevels, 'resource'>,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: Scope | Scope[],
	userScopes: Pick<ScopeLevels, 'global'> & Partial<ScopeLevels>,
	options: HasScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const userScopeSet = new Set([
		...userScopes.global,
		...(userScopes.project ?? []),
		...(userScopes.resource ?? []),
	]);

	if (options.mode === 'allOf') {
		return scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
