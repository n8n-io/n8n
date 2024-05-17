import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';
import type { DefaultUserMiddlewareOptions } from '@/types/rbac';
import { isDefaultUser } from '@/rbac/checks';

export const defaultUserMiddleware: RouterMiddleware<DefaultUserMiddlewareOptions> = async (
	_to,
	_from,
	next,
) => {
	const valid = isDefaultUser();
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
