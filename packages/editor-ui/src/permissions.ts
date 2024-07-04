import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type { Scope, RESOURCES } from '@n8n/permissions';
import type { Project } from '@/types/projects.types';
import { isObject } from '@/utils/objectUtils';

type ExtractScopePrefixSuffix<T> = T extends `${infer Prefix}:${infer Suffix}`
	? [Prefix, Suffix]
	: never;
export type PermissionsMap<T> = {
	[K in ExtractScopePrefixSuffix<T>[1]]: boolean;
};

type ActionBooleans<T extends readonly string[]> = {
	[K in T[number]]: boolean;
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

export const getCredentialPermissions = (
	credential: ICredentialsResponse,
): PermissionsRecord['credential'] => getResourcePermissions(credential.scopes).credential;

export const getWorkflowPermissions = (workflow: IWorkflowDb): PermissionsRecord['workflow'] =>
	getResourcePermissions(workflow.scopes).workflow;

export const getProjectPermissions = (
	project: Project | null,
): PermissionsRecord['project'] | null => getResourcePermissions(project?.scopes).project ?? null;

export const getVariablesPermissions = (user: IUser | null): PermissionsRecord['variable'] | null =>
	getResourcePermissions(user?.globalScopes).variable ?? null;
