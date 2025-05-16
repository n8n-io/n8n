import type { RBACPermissionCheck, CustomPermissionOptions } from '@/types/rbac';

export const isValid: RBACPermissionCheck<CustomPermissionOptions> = (fn) => {
	return fn ? fn() : false;
};
