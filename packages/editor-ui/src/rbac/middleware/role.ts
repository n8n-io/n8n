import type { RouterMiddleware } from '@/types/router';
import type { RolePermissionOptions } from '@/types/rbac';
import { VIEWS } from '@/constants';
import { hasRole } from '@/rbac/checks';

export const roleMiddleware: RouterMiddleware<RolePermissionOptions> = async (
	to,
	from,
	next,
	checkRoles,
) => {
	const valid = hasRole(checkRoles);
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
