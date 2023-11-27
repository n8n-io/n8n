import { useUsersStore } from '@/stores';
import type { RBACPermissionCheck, GuestPermissionOptions } from '@/types/rbac';

export const isGuest: RBACPermissionCheck<GuestPermissionOptions> = () => {
	const usersStore = useUsersStore();
	return !usersStore.currentUser;
};
