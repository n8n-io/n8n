import type { RBACPermissionCheck, CustomPermissionOptions } from '@/app/types/rbac';

export const isValid: RBACPermissionCheck<CustomPermissionOptions> = (fn) => {
	return fn ? fn() : false;
};
