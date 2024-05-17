import type {
	NavigationGuardNext,
	NavigationGuardWithThis,
	RouteLocationNormalized,
	RouteLocation,
} from 'vue-router';
import type { IPermissions } from '@/Interface';
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

export interface RouteConfig {
	meta: {
		nodeView?: boolean;
		templatesEnabled?: boolean;
		getRedirect?: () => { name: string } | false;
		permissions?: IPermissions;
		middleware?: RouterMiddlewareType[];
		middlewareOptions?: Partial<MiddlewareOptions>;
		telemetry?: {
			disabled?: true;
			getProperties: (route: RouteLocation) => object;
		};
		scrollOffset?: number;
		setScrollPosition?: (position: number) => void;
		readOnlyCanvas?: boolean;
	};
}

export type RouterMiddlewareReturnType = ReturnType<NavigationGuardWithThis<undefined>>;

export interface RouterMiddleware<RouterMiddlewareOptions = {}> {
	(
		to: RouteLocationNormalized,
		from: RouteLocationNormalized,
		next: NavigationGuardNext,
		options: RouterMiddlewareOptions,
	): RouterMiddlewareReturnType;
}
