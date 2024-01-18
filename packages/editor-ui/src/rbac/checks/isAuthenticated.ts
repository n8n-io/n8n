import { useUsersStore } from '@/stores/users.store';
import type { RBACPermissionCheck, AuthenticatedPermissionOptions } from '@/types/rbac';

export const isAuthenticated: RBACPermissionCheck<AuthenticatedPermissionOptions> = () => {
	const usersStore = useUsersStore();
	return !!usersStore.currentUser;
};
