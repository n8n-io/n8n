import { useUsersStore } from '@/stores/users.store';
import type { RBACPermissionCheck, AuthenticatedPermissionOptions } from '@/types/rbac';

export const isAuthenticated: RBACPermissionCheck<AuthenticatedPermissionOptions> = (options) => {
	if (options?.bypass?.()) {
		return true;
	}

	const usersStore = useUsersStore();
	return !!usersStore.currentUser;
};
