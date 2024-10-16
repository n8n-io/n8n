import { useRBACStore } from '@/stores/rbac.store';
import type { RBACPermissionCheck, RBACPermissionOptions } from '@/types/rbac';

export const hasScope: RBACPermissionCheck<RBACPermissionOptions> = (opts) => {
	if (!opts?.scope) {
		return true;
	}
	const { projectId, resourceType, resourceId, scope, options } = opts;

	const rbacStore = useRBACStore();
	return rbacStore.hasScope(
		scope,
		{
			projectId,
			resourceType,
			resourceId,
		},
		options,
	);
};
