/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import {
	IUser,
	ICredentialsResponse,
	IRootState,
	IWorkflowDb,
	EnvironmentVariable,
} from '@/Interface';
import { EnterpriseEditionFeature, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useSettingsStore } from './stores/settings';

export enum UserRole {
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
	const genericTable = [{ name: UserRole.InstanceOwner, test: () => user?.isOwner }];

	return [...genericTable, ...table].reduce((permissions: IPermissions, row) => {
		permissions[row.name] = Array.isArray(row.test)
			? row.test.some((ability) => permissions[ability])
			: (row.test as IPermissionsTableRowTestFn)(permissions);

		return permissions;
	}, {});
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
			test: () =>
				!!(credential && credential.ownedBy && credential.ownedBy.id === user?.id) ||
				!isSharingEnabled,
		},
		{
			name: UserRole.ResourceSharee,
			test: () =>
				!!(
					credential &&
					credential.sharedWith &&
					credential.sharedWith.find((sharee) => sharee.id === user?.id)
				),
		},
		{
			name: 'read',
			test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceSharee],
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
	const isSharingEnabled = settingsStore.isEnterpriseFeatureEnabled(
		EnterpriseEditionFeature.Sharing,
	);
	const isNewWorkflow = workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;

	const table: IPermissionsTable = [
		{
			name: UserRole.ResourceOwner,
			test: () =>
				!!(isNewWorkflow || (workflow && workflow.ownedBy && workflow.ownedBy.id === user?.id)) ||
				!isSharingEnabled,
		},
		{
			name: UserRole.ResourceSharee,
			test: () =>
				!!(
					workflow &&
					workflow.sharedWith &&
					workflow.sharedWith.find((sharee) => sharee.id === user?.id)
				),
		},
		{
			name: 'read',
			test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceSharee],
		},
		{ name: 'save', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateName', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: [UserRole.ResourceOwner] },
		{ name: 'updateSharing', test: [UserRole.ResourceOwner] },
		{ name: 'updateNodeAccess', test: [UserRole.ResourceOwner] },
		{ name: 'delete', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{
			name: 'use',
			test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceSharee],
		},
	];

	return parsePermissionsTable(user, table);
};

export const getVariablesPermissions = (user: IUser | null) => {
	const table: IPermissionsTable = [
		{
			name: 'create',
			test: [UserRole.InstanceOwner],
		},
		{
			name: 'edit',
			test: [UserRole.InstanceOwner],
		},
		{
			name: 'delete',
			test: [UserRole.InstanceOwner],
		},
		{ name: 'use', test: () => true },
	];

	return parsePermissionsTable(user, table);
};
