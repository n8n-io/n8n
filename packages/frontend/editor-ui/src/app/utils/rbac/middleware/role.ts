import type { RouterMiddleware } from '@/app/types/router';
import type { RolePermissionOptions } from '@/app/types/rbac';
import { VIEWS } from '@/app/constants';
import { hasRole } from '@/app/utils/rbac/checks';

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
