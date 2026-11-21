import { RESOURCES } from '../constants.ee';
import type { Scope } from '../types.ee';

type ExtractScopePrefixSuffix<T> = T extends `${infer Prefix}:${infer Suffix}`
	? [Prefix, Suffix]
	: never;
type ActionBooleans<T extends readonly string[]> = {
	[K in T[number]]?: boolean;
};
export type PermissionsRecord = {
	[K in keyof typeof RESOURCES]: ActionBooleans<(typeof RESOURCES)[K]>;
};

export const getResourcePermissions = (resourceScopes: readonly Scope[] = []): PermissionsRecord =>
	Object.fromEntries(
		Object.keys(RESOURCES).map((key) => [
			key,
			resourceScopes.reduce<Record<string, true>>((resourcePermissions, scope) => {
				const [prefix, suffix] = scope.split(':') as ExtractScopePrefixSuffix<Scope>;

				if (prefix === key) {
					resourcePermissions[suffix] = true;
				}

				return resourcePermissions;
			}, {}),
		]),
	) as PermissionsRecord;
