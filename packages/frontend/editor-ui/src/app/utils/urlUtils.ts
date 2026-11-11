// Strips an existing `redirect` query param to avoid infinite-redirect nesting.
export function getSanitizedCurrentPath(route: { fullPath: string }): string {
	const url = new URL(route.fullPath, 'http://placeholder');
	url.searchParams.delete('redirect');
	return `${url.pathname}${url.search}`;
}

// The backend stores the return path in the OIDC state cookie. Browsers drop a cookie that is
// larger than 4 KB, and the sign-in then fails. 2 KB leaves room for the rest of the cookie.
const MAX_SSO_REDIRECT_BYTES = 2048;

// The route guards encode the path, and vue-router encodes the query again, so a
// `redirect` value can still be percent-encoded once. Returns '' when there is no in-app path.
export function getSsoRedirectPath(redirect: unknown): string {
	if (typeof redirect !== 'string') return '';

	let path = redirect;
	// A value that starts with `/` is already decoded. A second decode would corrupt its query.
	if (!path.startsWith('/')) {
		try {
			path = decodeURIComponent(path);
		} catch {
			return '';
		}
	}

	// The backend validates the path again. This check only drops values that are clearly
	// not in-app paths.
	if (!path.startsWith('/') || path.startsWith('//')) return '';

	return new TextEncoder().encode(path).length <= MAX_SSO_REDIRECT_BYTES ? path : '';
}
