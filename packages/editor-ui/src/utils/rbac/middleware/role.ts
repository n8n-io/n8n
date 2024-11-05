import type { RouterMiddleware } from '@/types/router';
import type { RolePermissionOptions } from '@/types/rbac';
import { VIEWS } from '@/constants';
import { hasRole } from '@/utils/rbac/checks';

export const roleMiddleware: RouterMiddleware<RolePermissionOptions> = async (
	_to,
	_from,
	next,
	checkRoles,
) => {
	const valid = hasRole(checkRoles);
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
