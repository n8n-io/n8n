import type { CustomMiddlewareOptions, RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';

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
