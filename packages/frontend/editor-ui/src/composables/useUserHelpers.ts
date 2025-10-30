import type { PermissionTypeOptions } from '@/types/rbac';
import { hasPermission } from '@/utils/rbac/permissions';
import type { RouteLocation, Router } from 'vue-router';

export function useUserHelpers(router: Router) {
	const canUserAccessRouteByName = (name: string) => {
		const resolvedRoute = router.resolve({ name });

		return canUserAccessRoute(resolvedRoute);
	};

	const canUserAccessRoute = (route: RouteLocation) => {
		const middleware = route.meta?.middleware;
		const middlewareOptions = route.meta?.middlewareOptions;

		if (!middleware) {
			return true;
		}

		return hasPermission(middleware, middlewareOptions as PermissionTypeOptions | undefined);
	};

	return {
		canUserAccessRouteByName,
	};
}
