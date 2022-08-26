/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import {IUser, ICredentialsResponse, IRootState} from "@/Interface";
import {Store} from "vuex";
import {EnterpriseEditionFeature} from "@/constants";

export enum UserRole {
	InstanceOwner = 'isInstanceOwner',
	ResourceOwner = 'isOwner',
	ResourceEditor = 'isEditor',
	ResourceSharee = 'isSharee',
}

export type IPermissions = Record<string, boolean>;

export interface IPermissionsTableRow {
	name: string;
	test (permissions: IPermissions): boolean;
}

export type IPermissionsTable = IPermissionsTableRow[];

/**
 * Returns the permissions for the given user and resource
 *
 * @param user
 * @param table
 */
const parsePermissionsTable = (user: IUser, table: IPermissionsTable): IPermissions => {
	const genericTable = [
		{ name: UserRole.InstanceOwner, test: () => user.isOwner },
	];

	return [
		...genericTable,
		...table,
	].reduce((acc: IPermissions, row) => {
		acc[row.name] = row.test(acc);
		return acc;
	}, {});
};

/**
 * User permissions definition
 */

export const getCredentialPermissions = (user: IUser, credential: ICredentialsResponse, store: Store<IRootState>) => {
	const table: IPermissionsTable = [
		{ name: UserRole.ResourceOwner, test: () => credential.ownedBy.id === user.id || !store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.CredentialsSharing) },
		{ name: UserRole.ResourceSharee, test: () => !!credential.sharedWith.find((sharee) => sharee.id === user.id) },
		{ name: 'read', test: (permissions) => permissions[UserRole.ResourceOwner] || permissions[UserRole.InstanceOwner] || permissions[UserRole.ResourceSharee] },
		{ name: 'save', test: (permissions) => permissions[UserRole.ResourceOwner] || permissions[UserRole.InstanceOwner] },
		{ name: 'updateName', test: (permissions) => permissions[UserRole.ResourceOwner] || permissions[UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: (permissions) => permissions[UserRole.ResourceOwner]  },
		{ name: 'updateSharing', test: (permissions) => permissions[UserRole.ResourceOwner]  },
		{ name: 'updateNodeAccess', test: (permissions) => permissions[UserRole.ResourceOwner]  },
		{ name: 'delete', test: (permissions) => permissions[UserRole.ResourceOwner] || permissions[UserRole.InstanceOwner]  },
	];

	return parsePermissionsTable(user, table);
};
