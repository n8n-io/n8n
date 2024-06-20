import { useUsersStore } from '@/stores/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/types/rbac';

export const isInstanceOwner: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () =>
	useUsersStore().isInstanceOwner;
