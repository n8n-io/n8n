import { useUsersStore } from '@/stores/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/types/rbac';

export const isDefaultUser: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () => {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	if (currentUser) {
		return currentUser.isDefaultUser;
	}
	return false;
};
