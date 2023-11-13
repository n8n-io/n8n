import { useUsersStore } from '@/stores';
import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';

export type GuestMiddlewareOptions = {};

export const guest: RouterMiddleware<GuestMiddlewareOptions> = async (to, from, next) => {
	const usersStore = useUsersStore();
	const redirect = to.query.redirect as string;

	if (usersStore.currentUser) {
		if (redirect && redirect.startsWith('/')) {
			next(redirect);
		}

		return next({ name: VIEWS.HOMEPAGE });
	}
};
