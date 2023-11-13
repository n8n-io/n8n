import { useUsersStore } from '@/stores';
import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';

export type AuthenticatedMiddlewareOptions = {};

export const authenticated: RouterMiddleware<AuthenticatedMiddlewareOptions> = async (
	to,
	from,
	next,
) => {
	const usersStore = useUsersStore();
	const redirect =
		to.query.redirect ?? encodeURIComponent(`${window.location.pathname}${window.location.search}`);

	if (!usersStore.currentUser) {
		return next({ name: VIEWS.SIGNIN, query: { redirect } });
	}
};
