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
const parsePermissionsTable = (user: IUser, table: IPermissionsTable): IPermissions => {
	const genericTable = [
		{ name: UserRole.InstanceOwner, test: () => user.isOwner },
	];

	return [
		...genericTable,
		...table,
	].reduce((permissions: IPermissions, row) => {
		permissions[row.name] = Array.isArray(row.test)
			? row.test.some((ability) => permissions[ability])
			: (row.test as IPermissionsTableRowTestFn)(permissions);

		return permissions;
	}, {});
};

/**
 * User permissions definition
 */

export const getCredentialPermissions = (user: IUser, credential: ICredentialsResponse, store: Store<IRootState>) => {
	const table: IPermissionsTable = [
		{ name: UserRole.ResourceOwner, test: () => credential.ownedBy.id === user.id || !store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.CredentialsSharing) },
		{ name: UserRole.ResourceSharee, test: () => !!credential.sharedWith.find((sharee) => sharee.id === user.id) },
		{ name: 'read', test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceSharee] },
		{ name: 'save', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateName', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: [UserRole.ResourceOwner]  },
		{ name: 'updateSharing', test: [UserRole.ResourceOwner]  },
		{ name: 'updateNodeAccess', test: [UserRole.ResourceOwner]  },
		{ name: 'delete', test: [UserRole.ResourceOwner, UserRole.InstanceOwner]  },
	];

	return parsePermissionsTable(user, table);
};
