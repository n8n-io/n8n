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
	console.log('Running auth middleware');
	const redirect =
		to.query.redirect ?? encodeURIComponent(`${window.location.pathname}${window.location.search}`);

	const valid = isAuthenticated(options);
	if (!valid) {
		return next({ name: VIEWS.SIGNIN, query: { redirect } });
	}

	// If MFA is not enabled, and the instance enforces MFA, redirect to personal settings
	const mfaNeeded = shouldEnableMfa(options);
	if (mfaNeeded) {
		if (to.path !== '/settings/personal') {
			return next({ name: VIEWS.PERSONAL_SETTINGS, query: { redirect } });
		}
		return;
	}
};
