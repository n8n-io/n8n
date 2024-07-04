import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type {
	CredentialScope,
	ProjectScope,
	Scope,
	WorkflowScope,
	VariableScope,
	RESOURCES,
} from '@n8n/permissions';
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

const mapScopesToPermissions = <T extends Scope>(scopes: T[], scopeSet: Set<T>) =>
	scopes.reduce(
		(permissions, scope) => ({
			...permissions,
			[scope.split(':')[1]]: scopeSet.has(scope),
		}),
		{} as PermissionsMap<T>,
	);

export const getCredentialPermissions = (
	credential: ICredentialsResponse,
): PermissionsMap<CredentialScope> =>
	mapScopesToPermissions(
		[
			'credential:create',
			'credential:read',
			'credential:update',
			'credential:delete',
			'credential:list',
			'credential:share',
			'credential:move',
		],
		new Set(credential?.scopes ?? []),
	);

export const getWorkflowPermissions = (workflow: IWorkflowDb): PermissionsMap<WorkflowScope> =>
	mapScopesToPermissions(
		[
			'workflow:create',
			'workflow:read',
			'workflow:update',
			'workflow:delete',
			'workflow:list',
			'workflow:share',
			'workflow:execute',
			'workflow:move',
		],
		new Set(workflow?.scopes ?? []),
	);

export const getProjectPermissions = (project: Project | null): PermissionsMap<ProjectScope> =>
	mapScopesToPermissions(
		['project:create', 'project:read', 'project:update', 'project:delete', 'project:list'],
		new Set(project?.scopes ?? []),
	);

export const getVariablesPermissions = (user: IUser | null): PermissionsMap<VariableScope> =>
	mapScopesToPermissions(
		['variable:create', 'variable:read', 'variable:update', 'variable:delete', 'variable:list'],
		new Set(user?.globalScopes ?? []),
	);

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
