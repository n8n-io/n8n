import { useUsersStore } from '@/stores/users.store';
import type { RBACPermissionCheck, RolePermissionOptions } from '@/types/rbac';
import { ROLE } from '@/constants';
import type { IRole } from '@/Interface';

export const hasRole: RBACPermissionCheck<RolePermissionOptions> = (checkRoles) => {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	if (currentUser && checkRoles) {
		const userRole = currentUser.isDefaultUser ? ROLE.Default : currentUser.role;
		return checkRoles.includes(userRole as IRole);
	}

	return false;
};
