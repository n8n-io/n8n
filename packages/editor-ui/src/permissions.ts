import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type {
	CredentialScope,
	ProjectScope,
	Scope,
	WorkflowScope,
	VariableScope,
} from '@n8n/permissions';
import type { Project } from '@/types/projects.types';

type ExtractAfterColon<T> = T extends `${infer _Prefix}:${infer Suffix}` ? Suffix : never;
export type PermissionsMap<T> = {
	[K in ExtractAfterColon<T>]: boolean;
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
