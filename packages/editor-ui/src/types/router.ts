import type {
	NavigationGuardNext,
	NavigationGuardWithThis,
	RouteLocationNormalized,
} from 'vue-router';
import type {
	AuthenticatedPermissionOptions,
	CustomPermissionOptions,
	EnterprisePermissionOptions,
	GuestPermissionOptions,
	RBACPermissionOptions,
	RolePermissionOptions,
	PermissionType,
	DefaultUserMiddlewareOptions,
} from '@/types/rbac';

export type RouterMiddlewareType = Exclude<PermissionType, 'instanceOwner'>;
export type CustomMiddlewareOptions = CustomPermissionOptions<{
	to: RouteLocationNormalized;
	from: RouteLocationNormalized;
	next: NavigationGuardNext;
}>;
export type MiddlewareOptions = {
	authenticated: AuthenticatedPermissionOptions;
	custom: CustomMiddlewareOptions;
	defaultUser: DefaultUserMiddlewareOptions;
	enterprise: EnterprisePermissionOptions;
	guest: GuestPermissionOptions;
	rbac: RBACPermissionOptions;
	role: RolePermissionOptions;
};

export type RouterMiddlewareReturnType = ReturnType<NavigationGuardWithThis<undefined>>;

export interface RouterMiddleware<RouterMiddlewareOptions = {}> {
	(
		to: RouteLocationNormalized,
		from: RouteLocationNormalized,
		next: NavigationGuardNext,
		options: RouterMiddlewareOptions,
	): RouterMiddlewareReturnType;
}
