import type { Scope, ScopeLevelOrder, ScopeLevels } from './types';

export type HasScopeMode = 'oneOf' | 'allOf';
export interface HasScopeOptions {
	mode: HasScopeMode;
}

export function hasScope(
	scope: Scope | Scope[],
	userScopes: Partial<ScopeLevels>,
	options: HasScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const scopeLevelOrder: ScopeLevelOrder = ['global', 'project', 'resource'];
	const userScopeSet = new Set(scopeLevelOrder.flatMap((level) => userScopes[level] ?? []));

	if (options.mode === 'allOf') {
		return !!scope.length && scope.every((s) => userScopeSet.has(s));
	}

	return scope.some((s) => userScopeSet.has(s));
}
