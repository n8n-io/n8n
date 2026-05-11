import { useUsersStore } from '@/features/settings/users/users.store';
import type { RBACPermissionCheck, GuestPermissionOptions } from '@/app/types/rbac';

export const isGuest: RBACPermissionCheck<GuestPermissionOptions> = () => {
	const usersStore = useUsersStore();
	return !usersStore.currentUser;
};
