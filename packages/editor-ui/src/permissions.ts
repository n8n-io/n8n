import {IUser, ICredentialsResponse, IRootState} from "@/Interface";
import {Zammad} from "n8n-nodes-base/nodes/Zammad/types";
import User = Zammad.User;
import {Store} from "vuex";
import {EnterpriseEditionFeature} from "@/constants";

/**
 * Permissions table implementation
 *
 * @usage permissions.credential(user, credential).isOwner;
 */

enum UserRole {
	Owner = 'owner',
	Editor = 'editor',
	Sharee = 'sharee',
	None = 'none',
}

export interface IUserRole {
	name: UserRole;
	test: () => boolean;
}

export type IPermissions = Record<string, boolean>;

export type IPermissionsTable = {
	[key in UserRole]?: (IPermissions | string[]);
};

/**
 * Return permissions are <string, boolean> key-value pairs
 *
 * @param permissions
 */
export const normalizePermissions = (permissions: IPermissionsTable[UserRole]): IPermissions => {
	if (Array.isArray(permissions)) {
		return permissions.reduce((acc: IPermissions, action) => {
			acc[action] = true;
			return acc;
		}, {});
	}

	return permissions as IPermissions;
};

/**
 * Get actions based on permissions table and user roles
 *
 * @param table
 * @param roles
 */
export const getActionsForUserRole = (table: IPermissionsTable, roles: IUserRole[]): IPermissions => {
	const role = roles.find(({ test }) => test());

	return role ? normalizePermissions(table[role.name]) : {};
};

/**
 * User permissions definition
 */

export const getCredentialPermissions = (user: IUser, credential: ICredentialsResponse | null, store: Store<IRootState>) => {
	const roles: IUserRole[] = [
		{
			name: UserRole.Owner,
			test: () => {
				const isNewCredential = !credential;
				const isOwner = credential && credential.ownedBy.id === user.id;
				const isSharingDisabled = !store.getters['settings/isEnterpriseFeatureEnabled'](EnterpriseEditionFeature.CredentialsSharing);

				return isNewCredential || isOwner || isSharingDisabled;
			},
		},
		{
			name: UserRole.Sharee,
			test: () => !!(credential && credential.sharedWith.find((sharee) => sharee.id === user.id)),
		},
	];

	const table: IPermissionsTable = {
		[UserRole.Owner]: ['isOwner', 'canRead', 'canUpdate', 'canDelete'],
		[UserRole.Sharee]: ['isSharee', 'canRead'],
	};

	return getActionsForUserRole(table, roles);
};
