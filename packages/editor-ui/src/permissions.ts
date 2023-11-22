/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import type { IUser, ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { EnterpriseEditionFeature, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useRBACStore } from '@/stores/rbac.store';

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
		{ name: UserRole.InstanceOwner, test: () => !!user?.isOwner },
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
		{ name: 'save', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateName', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: [UserRole.ResourceOwner] },
		{ name: 'updateSharing', test: [UserRole.ResourceOwner] },
		{ name: 'updateNodeAccess', test: [UserRole.ResourceOwner] },
		{ name: 'delete', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'use', test: [UserRole.ResourceOwner, UserRole.ResourceSharee] },
	];

	return parsePermissionsTable(user, table);
};

export const getWorkflowPermissions = (user: IUser | null, workflow: IWorkflowDb) => {
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();
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
			test: (permissions) => rbacStore.hasScope('workflow:update') || !!permissions.isOwner,
		},
		{
			name: 'delete',
			test: (permissions) => rbacStore.hasScope('workflow:delete') || !!permissions.isOwner,
		},
	];

	return parsePermissionsTable(user, table);
};

export const getVariablesPermissions = (user: IUser | null) => {
	const rbacStore = useRBACStore();
	const table: IPermissionsTable = [
		{ name: 'create', test: () => rbacStore.hasScope('variable:create') },
		{ name: 'edit', test: () => rbacStore.hasScope('variable:update') },
		{ name: 'delete', test: () => rbacStore.hasScope('variable:delete') },
		{ name: 'use', test: () => rbacStore.hasScope('variable:read') },
	];

	return parsePermissionsTable(user, table);
};
