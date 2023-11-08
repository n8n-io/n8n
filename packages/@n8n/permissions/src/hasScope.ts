import type { AllScopes, ScopeLevels } from './types';

export type HasScopeMode = 'oneOf' | 'allOf';
export interface HasScopeOptions {
	mode: HasScopeMode;
}

export function hasScope(
	scope: AllScopes | AllScopes[],
	userScopes: ScopeLevels,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: AllScopes | AllScopes[],
	userScopes: Pick<ScopeLevels, 'global'>,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: AllScopes | AllScopes[],
	userScopes: Omit<ScopeLevels, 'resource'>,
	options?: HasScopeOptions,
): boolean;
export function hasScope(
	scope: AllScopes | AllScopes[],
	userScopes: Pick<ScopeLevels, 'global'> & Partial<ScopeLevels>,
	options: HasScopeOptions = { mode: 'oneOf' },
): boolean {
	if (!Array.isArray(scope)) {
		scope = [scope];
	}

	const scopeSet = new Set([
		...userScopes.global,
		...(userScopes.project ?? []),
		...(userScopes.resource ?? []),
	]);

	if (options.mode === 'allOf') {
		return scope.every((s) => scopeSet.has(s));
	}

	return scope.some((s) => scopeSet.has(s));
}
