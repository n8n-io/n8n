/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { EnterpriseEditionFeature, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from './rbac/permissions';
import { isUserGlobalOwner } from './utils/userUtils';

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
	const settingsStore = useSettingsStore();
	const isSharingEnabled = settingsStore.isEnterpriseFeatureEnabled(
		EnterpriseEditionFeature.Sharing,
	);

	const table: IPermissionsTable = [
		{
			name: UserRole.ResourceOwner,
			test: () => !!(credential?.ownedBy?.id === user?.id) || !isSharingEnabled,
		},
		{
			name: UserRole.ResourceSharee,
			test: () => !!credential?.sharedWith?.find((sharee) => sharee.id === user?.id),
		},
		{
			name: 'read',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'credential:read' } }) || !!permissions.isOwner,
		},
		{
			name: 'save',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'credential:create' } }) || !!permissions.isOwner,
		},
		{
			name: 'update',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'credential:update' } }) || !!permissions.isOwner,
		},
		{
			name: 'share',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'credential:share' } }) || !!permissions.isOwner,
		},
		{
			name: 'delete',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'credential:delete' } }) || !!permissions.isOwner,
		},
		{
			name: 'use',
			test: (permissions) => !!permissions.isOwner || !!permissions.isSharee,
		},
	];

	return parsePermissionsTable(user, table);
};

export const getWorkflowPermissions = (user: IUser | null, workflow: IWorkflowDb) => {
	const settingsStore = useSettingsStore();
	const isSharingEnabled = settingsStore.isEnterpriseFeatureEnabled(
		EnterpriseEditionFeature.Sharing,
	);
	const isNewWorkflow = workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;

	const table: IPermissionsTable = [
		{
			name: UserRole.ResourceOwner,
			test: () => !!(isNewWorkflow || workflow?.ownedBy?.id === user?.id) || !isSharingEnabled,
		},
		{
			name: 'updateSharing',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'workflow:share' } }) || !!permissions.isOwner,
		},
		{
			name: 'delete',
			test: (permissions) =>
				hasPermission(['rbac'], { rbac: { scope: 'workflow:delete' } }) || !!permissions.isOwner,
		},
	];

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
