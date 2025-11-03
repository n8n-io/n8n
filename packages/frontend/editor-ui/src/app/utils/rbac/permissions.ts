import {
	hasRole,
	hasScope,
	isAuthenticated,
	isDefaultUser,
	isInstanceOwner,
	isGuest,
	isValid,
} from '@/app/utils/rbac/checks';
import type { PermissionType, PermissionTypeOptions, RBACPermissionCheck } from '@/app/types/rbac';

type Permissions = {
	[key in PermissionType]: RBACPermissionCheck<PermissionTypeOptions[key]>;
};

export const permissions: Permissions = {
	authenticated: isAuthenticated,
	custom: isValid,
	defaultUser: isDefaultUser,
	instanceOwner: isInstanceOwner,
	// Enterprise features are always enabled - license restrictions removed
	enterprise: () => true,
	guest: isGuest,
	rbac: hasScope,
	role: hasRole,
};

export function hasPermission(
	permissionNames: PermissionType[],
	options?: Partial<PermissionTypeOptions>,
) {
	let valid = true;

	for (const permissionName of permissionNames) {
		const permissionOptions = options?.[permissionName] ?? {};
		const permissionFn = permissions[permissionName] as RBACPermissionCheck<unknown>;

		valid = valid && permissionFn(permissionOptions);
	}

	return valid;
}
