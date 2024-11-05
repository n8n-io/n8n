import type { Scope, ScopeLevels, GlobalScopes, MaskLevels } from './types';

export function combineScopes(userScopes: GlobalScopes, masks?: MaskLevels): Set<Scope>;
export function combineScopes(userScopes: ScopeLevels, masks?: MaskLevels): Set<Scope>;
export function combineScopes(
	userScopes: GlobalScopes | ScopeLevels,
	masks?: MaskLevels,
): Set<Scope> {
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

	return new Set(Object.values(maskedScopes).flat());
}
