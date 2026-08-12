import { useUsersStore } from '@n8n/stores/users.store';
import type { RBACPermissionCheck, GuestPermissionOptions } from '@/app/types/rbac';

export const isGuest: RBACPermissionCheck<GuestPermissionOptions> = () => {
	const usersStore = useUsersStore();
	return !usersStore.currentUser;
};
