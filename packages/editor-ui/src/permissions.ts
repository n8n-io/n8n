/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { hasPermission } from './rbac/permissions';
import { isUserGlobalOwner } from './utils/userUtils';
import type { CredentialScope, ProjectScope, Scope, WorkflowScope } from '@n8n/permissions';
import type { Project } from './features/projects/projects.types';

/**
 * Old permissions implementation
 * @deprecated
 */

export const enum UserRole {
	InstanceOwner = 'isInstanceOwner',
	ResourceOwner = 'isOwner',
	ResourceEditor = 'isEditor',
	ResourceSharee = 'isSharee',
}

export type IPermissions = Record<string, boolean>;

type IPermissionsTableRowTestFn = (permissions: IPermissions) => boolean;

export interface IPermissionsTableRow {
	name: string;
	test: string[] | IPermissionsTableRowTestFn;
}

export type IPermissionsTable = IPermissionsTableRow[];

type ExtractAfterColon<T> = T extends `${infer _Prefix}:${infer Suffix}` ? Suffix : never;
type PermissionsMap<T> = {
	[K in ExtractAfterColon<T>]: boolean;
};

/**
 * Returns the permissions for the given user and resource
 *
 * @param user
 * @param table
 */
export const parsePermissionsTable = (
	user: IUser | null,
	table: IPermissionsTable,
): IPermissions => {
	const genericTable: IPermissionsTable = [
		{ name: UserRole.InstanceOwner, test: () => (user ? isUserGlobalOwner(user) : false) },
	];

	return [...genericTable, ...table].reduce(
		(permissions: IPermissions, row: IPermissionsTableRow) => {
			permissions[row.name] = Array.isArray(row.test)
				? row.test.some((ability) => permissions[ability])
				: row.test(permissions);

			return permissions;
		},
		{},
	);
};

/**
 * User permissions definition
 */

export const getCredentialPermissions = (
	user: IUser | null,
	project: Project | null,
	credential: ICredentialsResponse,
): PermissionsMap<CredentialScope> => {
	const credentialScopes: CredentialScope[] = [
		'credential:create',
		'credential:read',
		'credential:update',
		'credential:delete',
		'credential:list',
		'credential:share',
	];
	const projectPermissions = getProjectPermissions(user, project);

	return credentialScopes.reduce((permissions, scope: Scope) => {
		const action = scope.split(':')[1] as keyof PermissionsMap<ProjectScope>;

		return {
			...permissions,
			[action]: projectPermissions[action] || !!credential.scopes?.includes(scope),
		};
	}, {} as PermissionsMap<CredentialScope>);
};

export const getWorkflowPermissions = (
	user: IUser | null,
	project: Project | null,
	workflow: IWorkflowDb,
): PermissionsMap<WorkflowScope> => {
	const workflowScopes: WorkflowScope[] = [
		'workflow:create',
		'workflow:read',
		'workflow:update',
		'workflow:delete',
		'workflow:list',
		'workflow:share',
	];

	const projectPermissions = getProjectPermissions(user, project);

	return workflowScopes.reduce((permissions, scope: Scope) => {
		const action = scope.split(':')[1] as keyof PermissionsMap<ProjectScope>;

		return {
			...permissions,
			[action]: projectPermissions[action] || !!workflow.scopes?.includes(scope),
		};
	}, {} as PermissionsMap<WorkflowScope>);
};

export const getProjectPermissions = (
	user: IUser | null,
	project: Project | null,
): PermissionsMap<ProjectScope> => {
	const projectScopes: ProjectScope[] = [
		'project:create',
		'project:read',
		'project:update',
		'project:delete',
		'project:list',
	];

	const scopeSet = new Set([...(user?.globalScopes ?? []), ...(project?.scopes ?? [])]);

	return projectScopes.reduce(
		(permissions, scope: Scope) => ({
			...permissions,
			[scope.split(':')[1]]: scopeSet.has(scope),
		}),
		{} as PermissionsMap<ProjectScope>,
	);
};

export const getVariablesPermissions = (user: IUser | null) => {
	const table: IPermissionsTable = [
		{ name: 'create', test: () => hasPermission(['rbac'], { rbac: { scope: 'variable:create' } }) },
		{ name: 'edit', test: () => hasPermission(['rbac'], { rbac: { scope: 'variable:update' } }) },
		{ name: 'delete', test: () => hasPermission(['rbac'], { rbac: { scope: 'variable:delete' } }) },
		{ name: 'use', test: () => hasPermission(['rbac'], { rbac: { scope: 'variable:read' } }) },
	];

	return parsePermissionsTable(user, table);
};
