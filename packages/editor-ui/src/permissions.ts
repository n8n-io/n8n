import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type {
	CredentialScope,
	ProjectScope,
	Scope,
	WorkflowScope,
	VariableScope,
} from '@n8n/permissions';
import type { Project } from './features/projects/projects.types';

type ExtractAfterColon<T> = T extends `${infer _Prefix}:${infer Suffix}` ? Suffix : never;
export type PermissionsMap<T> = {
	[K in ExtractAfterColon<T>]: boolean;
};

const mapScopesToPermissions = (scopes: Scope[], scopeSet: Set<Scope>): PermissionsMap<Scope> =>
	scopes.reduce(
		(permissions: PermissionsMap<Scope>, scope: Scope) => ({
			...permissions,
			[scope.split(':')[1]]: scopeSet.has(scope),
		}),
		{},
	);

export const getCredentialPermissions = (
	user: IUser | null,
	project: Project | null,
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
		],
		new Set([
			...(user?.globalScopes ?? []),
			...(project?.scopes ?? []),
			...(credential?.scopes ?? []),
		]),
	);

export const getWorkflowPermissions = (
	user: IUser | null,
	project: Project | null,
	workflow: IWorkflowDb,
): PermissionsMap<WorkflowScope> =>
	mapScopesToPermissions(
		[
			'workflow:create',
			'workflow:read',
			'workflow:update',
			'workflow:delete',
			'workflow:list',
			'workflow:share',
			'workflow:execute',
		],
		new Set([
			...(user?.globalScopes ?? []),
			...(project?.scopes ?? []),
			...(workflow?.scopes ?? []),
		]),
	);

export const getProjectPermissions = (
	user: IUser | null,
	project: Project | null,
): PermissionsMap<ProjectScope> =>
	mapScopesToPermissions(
		['project:create', 'project:read', 'project:update', 'project:delete', 'project:list'],
		new Set([...(user?.globalScopes ?? []), ...(project?.scopes ?? [])]),
	);

export const getVariablesPermissions = (user: IUser | null): PermissionsMap<VariableScope> =>
	mapScopesToPermissions(
		['variable:create', 'variable:read', 'variable:update', 'variable:delete', 'variable:list'],
		new Set([...(user?.globalScopes ?? [])]),
	);
