import type { RouterMiddleware } from '@/types/router';
import { VIEWS } from '@/constants';
import type { AuthenticatedPermissionOptions } from '@/types/rbac';
import { isAuthenticated, shouldEnableMfa } from '@/utils/rbac/checks';

export const authenticatedMiddleware: RouterMiddleware<AuthenticatedPermissionOptions> = async (
	to,
	_from,
	next,
	options,
) => {
	// ensure that we are removing the already existing redirect query parameter
	// to avoid infinite redirect loops
	const url = new URL(window.location.href);
	url.searchParams.delete('redirect');
	const redirect = to.query.redirect ?? encodeURIComponent(`${url.pathname}${url.search}`);

	const valid = isAuthenticated(options);
	if (!valid) {
		return next({ name: VIEWS.SIGNIN, query: { redirect } });
	}

	// If MFA is not enabled, and the instance enforces MFA, redirect to personal settings
	const mfaNeeded = shouldEnableMfa();
	if (mfaNeeded) {
		if (to.name !== VIEWS.PERSONAL_SETTINGS) {
			return next({ name: VIEWS.PERSONAL_SETTINGS, query: { redirect } });
		}
		return;
	}
};
