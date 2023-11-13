import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';
import type { HasScopeOptions, Scope } from '@n8n/permissions';
import { useRBACStore } from '@/stores/rbac.store';
import {
	inferProjectIdFromRoute,
	inferResourceIdFromRoute,
	inferResourceTypeFromRoute,
} from '@/utils/rbacUtils';

export type RBACMiddlewareOptions = {
	scope: Scope | Scope[];
	options?: HasScopeOptions;
};

export const rbac: RouterMiddleware<RBACMiddlewareOptions> = async (
	to,
	from,
	next,
	{ scope, options },
) => {
	const rbacStore = useRBACStore();

	const projectId = inferProjectIdFromRoute(to);
	const resourceType = inferResourceTypeFromRoute(to);
	const resourceId = resourceType ? inferResourceIdFromRoute(to) : undefined;

	const valid = rbacStore.hasScope(
		scope,
		{
			projectId,
			resourceType,
			resourceId,
		},
		options,
	);

	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
