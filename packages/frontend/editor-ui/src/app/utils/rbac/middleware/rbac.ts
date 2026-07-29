import type { RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';
import {
	inferProjectIdFromRoute,
	inferResourceIdFromRoute,
	inferResourceTypeFromRoute,
} from '@/app/utils/rbacUtils';
import type { RBACPermissionOptions } from '@/app/types/rbac';
import { hasScope } from '@/app/utils/rbac/checks';

export const rbacMiddleware: RouterMiddleware<RBACPermissionOptions> = async (
	to,
	_from,
	next,
	{ scope, options },
) => {
	const projectId = inferProjectIdFromRoute(to);
	const resourceType = inferResourceTypeFromRoute(to);
	const resourceId = resourceType ? inferResourceIdFromRoute(to) : undefined;

	const valid = hasScope({ scope, projectId, resourceType, resourceId, options });
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
