/**
 * Permissions table implementation
 *
 * @usage getCredentialPermissions(user, credential).isOwner;
 */

import {IUser, ICredentialsResponse, IRootState, IWorkflowDb} from "@/Interface";
import {Store} from "vuex";
import {EnterpriseEditionFeature} from "@/constants";

export enum UserRole {
	InstanceOwner = 'isInstanceOwner',
	ResourceOwner = 'isOwner',
	ResourceEditor = 'isEditor',
	ResourceReader = 'isReader',
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
export const parsePermissionsTable = (user: IUser, table: IPermissionsTable): IPermissions => {
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
		{ name: UserRole.ResourceOwner, test: () => !!(credential && credential.ownedBy && credential.ownedBy.id === user.id) || !store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.Sharing) },
		{ name: UserRole.ResourceReader, test: () => !!(credential && credential.sharedWith && credential.sharedWith.find((sharee) => sharee.id === user.id)) },
		{ name: 'read', test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceReader] },
		{ name: 'save', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateName', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: [UserRole.ResourceOwner]  },
		{ name: 'updateSharing', test: [UserRole.ResourceOwner]  },
		{ name: 'updateNodeAccess', test: [UserRole.ResourceOwner]  },
		{ name: 'delete', test: [UserRole.ResourceOwner, UserRole.InstanceOwner]  },
		{ name: 'use', test: [UserRole.ResourceOwner, UserRole.ResourceReader]  },
	];

	return parsePermissionsTable(user, table);
};

export const getWorkflowPermissions = (user: IUser, workflow: IWorkflowDb, store: Store<IRootState>) => {
	const table: IPermissionsTable = [
		// { name: UserRole.ResourceOwner, test: () => !!(workflow && workflow.ownedBy && workflow.ownedBy.id === user.id) || !store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.Sharing) },
		{ name: UserRole.ResourceOwner, test: () => true },
		// { name: UserRole.ResourceReader, test: () => !!(workflow && workflow.sharedWith && workflow.sharedWith.find((sharee) => sharee.id === user.id)) },
		{ name: UserRole.ResourceReader, test: () => true },
		{ name: 'read', test: [UserRole.ResourceOwner, UserRole.InstanceOwner, UserRole.ResourceReader] },
		{ name: 'save', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateName', test: [UserRole.ResourceOwner, UserRole.InstanceOwner] },
		{ name: 'updateConnection', test: [UserRole.ResourceOwner]  },
		{ name: 'updateSharing', test: [UserRole.ResourceOwner]  },
		{ name: 'updateNodeAccess', test: [UserRole.ResourceOwner]  },
		{ name: 'delete', test: [UserRole.ResourceOwner, UserRole.InstanceOwner]  },
		{ name: 'use', test: [UserRole.ResourceOwner, UserRole.ResourceReader]  },
	];

	return parsePermissionsTable(user, table);
};
