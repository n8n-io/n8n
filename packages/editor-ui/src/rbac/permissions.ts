import { hasRole } from '@/rbac/checks/hasRole';
import { hasScope } from '@/rbac/checks/hasScope';
import { isGuest } from '@/rbac/checks/isGuest';
import { isAuthenticated } from '@/rbac/checks/isAuthenticated';
import { isEnterpriseFeatureEnabled } from '@/rbac/checks/isEnterpriseFeatureEnabled';
import { isValid } from '@/rbac/checks/isValid';
import type { PermissionType, PermissionTypeOptions, RBACPermissionCheck } from '@/types/rbac';

type Permissions = {
	[key in PermissionType]: RBACPermissionCheck<PermissionTypeOptions[key]>;
};

export const permissions: Permissions = {
	authenticated: isAuthenticated,
	custom: isValid,
	enterprise: isEnterpriseFeatureEnabled,
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
