import { useUsersStore } from '@/features/settings/users/users.store';
import type { RBACPermissionCheck, RolePermissionOptions } from '@/app/types/rbac';
import { ROLE, type Role } from '@n8n/api-types';

export const hasRole: RBACPermissionCheck<RolePermissionOptions> = (checkRoles) => {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	if (currentUser && checkRoles) {
		const userRole = currentUser.isDefaultUser ? ROLE.Default : currentUser.role;
		return checkRoles.includes(userRole as Role);
	}

	return false;
};
