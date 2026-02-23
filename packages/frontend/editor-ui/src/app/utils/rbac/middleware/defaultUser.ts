import type { RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';
import type { DefaultUserMiddlewareOptions } from '@/app/types/rbac';
import { isDefaultUser } from '@/app/utils/rbac/checks';

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
