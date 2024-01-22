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

	const maskedScopes: GlobalScopes | ScopeLevels = Object.fromEntries(
		Object.entries(userScopes).map((e) => [e[0], [...e[1]]]),
	) as GlobalScopes | ScopeLevels;

	if (masks?.sharing) {
		if ('project' in maskedScopes) {
			maskedScopes.project = maskedScopes.project.filter((v) => masks.sharing.includes(v));
		}
		if ('resource' in maskedScopes) {
			maskedScopes.resource = maskedScopes.resource.filter((v) => masks.sharing.includes(v));
		}
	}

	const userScopeSet = new Set(Object.values(maskedScopes).flat());

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
