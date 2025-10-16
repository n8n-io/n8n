import { useUsersStore } from '@/features/users/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/types/rbac';

export const isInstanceOwner: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () =>
	useUsersStore().isInstanceOwner;
