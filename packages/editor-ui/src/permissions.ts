import type { Scope, RESOURCES } from '@n8n/permissions';
import { isObject } from '@/utils/objectUtils';

type ExtractScopePrefixSuffix<T> = T extends `${infer Prefix}:${infer Suffix}`
	? [Prefix, Suffix]
	: never;
type ActionBooleans<T extends readonly string[]> = {
	[K in T[number]]?: boolean;
};
export type PermissionsRecord = {
	[K in keyof typeof RESOURCES]?: ActionBooleans<(typeof RESOURCES)[K]>;
};

export const getResourcePermissions = (resourceScopes: Scope[] = []): PermissionsRecord => {
	return resourceScopes.reduce((permissions, scope) => {
		const [prefix, suffix] = scope.split(':') as ExtractScopePrefixSuffix<Scope>;

		return {
			...permissions,
			[prefix]: {
				...(isObject(permissions[prefix as keyof typeof permissions])
					? permissions[prefix as keyof typeof permissions]
					: {}),
				[suffix]: true,
			},
		};
	}, {});
};
