import type { CustomMiddlewareOptions, RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';

export const customMiddleware: RouterMiddleware<CustomMiddlewareOptions> = async (
	to,
	from,
	next,
	isValid,
) => {
	const valid = isValid({ to, from, next });
	if (!valid) {
		return next({ name: VIEWS.HOMEPAGE });
	}
};
