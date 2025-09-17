import type { RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';
import type { AuthenticatedPermissionOptions } from '@/app/types/rbac';
import { isAuthenticated, shouldEnableMfa } from '@/app/utils/rbac/checks';

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
	// Safely get the base path, defaulting to '/' if undefined
	const basePath = window.BASE_PATH ?? '/';

	// Remove the base path from the current pathname if it exists
	let pathname = url.pathname;
	if (basePath !== '/' && (pathname === basePath || pathname.indexOf(basePath + '/') === 0)) {
		pathname = pathname.substring(basePath.length);
		// Normalize empty pathname to '/' and ensure the resulting path starts with '/' if it's not empty
		if (!pathname || pathname === '') {
			pathname = '/';
		} else if (pathname.indexOf('/') !== 0) {
			pathname = '/' + pathname;
		}
	}
	// Ensure the resulting path starts with '/'
	if (!pathname.startsWith('/')) {
		pathname = '/' + pathname;
	}

	const redirect = to.query.redirect ?? encodeURIComponent(`${pathname}${url.search}`);

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
