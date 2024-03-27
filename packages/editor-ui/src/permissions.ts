/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { hasPermission } from './rbac/permissions';
import { isUserGlobalOwner } from './utils/userUtils';
import type { CredentialScope, WorkflowScope } from '@n8n/permissions';

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

export const getCredentialPermissions = (user: IUser | null, credential: ICredentialsResponse) => {
	const credentialScopes: CredentialScope[] = [
		'credential:create',
		'credential:read',
		'credential:update',
		'credential:delete',
		'credential:list',
		'credential:share',
	];
	const table: IPermissionsTable = credentialScopes.map((scope) => ({
		name: scope.split(':').pop() ?? '',
		test: () =>
			hasPermission(['rbac'], { rbac: { scope } }) || !!credential.scopes?.includes(scope),
	}));
	return parsePermissionsTable(user, table);
};

export const getWorkflowPermissions = (user: IUser | null, workflow: IWorkflowDb) => {
	const workflowScopes: WorkflowScope[] = [
		'workflow:create',
		'workflow:read',
		'workflow:update',
		'workflow:delete',
		'workflow:list',
		'workflow:share',
	];
	const table: IPermissionsTable = workflowScopes.map((scope) => ({
		name: scope.split(':').pop() ?? '',
		test: () => hasPermission(['rbac'], { rbac: { scope } }) || !!workflow.scopes?.includes(scope),
	}));

	return parsePermissionsTable(user, table);
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
