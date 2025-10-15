import { useUsersStore } from '@/features/users/users.store';
import type { RBACPermissionCheck, GuestPermissionOptions } from '@/types/rbac';

export const isGuest: RBACPermissionCheck<GuestPermissionOptions> = () => {
	const usersStore = useUsersStore();
	return !usersStore.currentUser;
};
