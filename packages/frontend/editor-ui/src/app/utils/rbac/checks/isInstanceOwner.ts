import { useUsersStore } from '@/features/settings/users/users.store';
import type { DefaultUserMiddlewareOptions, RBACPermissionCheck } from '@/app/types/rbac';

export const isInstanceOwner: RBACPermissionCheck<DefaultUserMiddlewareOptions> = () =>
	useUsersStore().isInstanceOwner;
