import { useUsersStore } from '@/features/settings/users/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/app/types/rbac';

export const isDefaultUser: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () => {
	const usersStore = useUsersStore();
	const currentUser = usersStore.currentUser;

	if (currentUser) {
		return currentUser.isDefaultUser;
	}
	return false;
};
