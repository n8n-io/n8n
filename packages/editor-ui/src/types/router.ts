import type {
	NavigationGuardNext,
	NavigationGuardWithThis,
	RouteLocationNormalized,
} from 'vue-router';
import type { AuthenticatedMiddlewareOptions } from '@/middleware/authenticated';
import type { EnterpriseMiddlewareOptions } from '@/middleware/enterprise';
import type { GuestMiddlewareOptions } from '@/middleware/guest';
import type { RBACMiddlewareOptions } from '@/middleware/rbac';
import type { IPermissions } from '@/Interface';
import type { RouteLocation } from 'vue-router';

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
	};
}

export type RouterMiddlewareType = 'authenticated' | 'enterprise' | 'guest';

export type RouterMiddlewareReturnType = ReturnType<NavigationGuardWithThis<undefined>>;

export interface RouterMiddleware<RouterMiddlewareOptions extends Record<string, unknown> = {}> {
	(
		to: RouteLocationNormalized,
		from: RouteLocationNormalized,
		next: NavigationGuardNext,
		options: RouterMiddlewareOptions,
	): RouterMiddlewareReturnType;
}

/**
 * Middleware type options
 */

export type MiddlewareOptions = {
	authenticated: AuthenticatedMiddlewareOptions;
	enterprise: EnterpriseMiddlewareOptions;
	guest: GuestMiddlewareOptions;
	rbac: RBACMiddlewareOptions;
};
