import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';
import type { GuestPermissionOptions } from '@/types/rbac';
import { isGuest } from '@/rbac/checks';

export const guestMiddleware: RouterMiddleware<GuestPermissionOptions> = async (
	to,
	_from,
	next,
) => {
	const valid = isGuest();
	if (!valid) {
		const redirect = to.query.redirect as string;
		if (redirect && (redirect.startsWith('/') || redirect.startsWith(window.location.origin))) {
			return next(redirect);
		}

		return next({ name: VIEWS.HOMEPAGE });
	}
};
