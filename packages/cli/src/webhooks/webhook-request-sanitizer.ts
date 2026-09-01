import type { Request } from 'express';

import { AUTH_COOKIE_NAME, FORM_AUTH_COOKIE_PREFIX, FORM_OAUTH_COOKIE_NAME } from '@/constants';

const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';

// The form cookies belong to the form endpoints, which skip sanitizing entirely
// for their own node types (see `authAllowlistedNodes`), so a form page still
// receives them. Every other webhook has no use for them.
const DISALLOWED_COOKIES = new Set([
	AUTH_COOKIE_NAME,
	BROWSER_ID_COOKIE_NAME,
	FORM_OAUTH_COOKIE_NAME,
]);

// The form auth cookie's name appends the workflow or execution it was minted
// for (`<prefix>-…`), so it is matched by prefix rather than listed above. The
// separator is required so an unrelated cookie that merely begins with the
// prefix (e.g. `n8n-form-authentic`) passes through untouched.
const isDisallowedCookie = (name: string) =>
	DISALLOWED_COOKIES.has(name) || name.startsWith(`${FORM_AUTH_COOKIE_PREFIX}-`);

/**
 * Removes a cookie with the given name from the request header
 */
const removeCookiesFromHeader = (req: Request) => {
	const cookiesHeader = req.headers.cookie;
	if (typeof cookiesHeader !== 'string') {
		return;
	}

	const cookies = cookiesHeader.split(';').map((cookie) => cookie.trim());
	const filteredCookies = cookies.filter((cookie) => {
		const cookieName = cookie.split('=')[0];
		return !isDisallowedCookie(cookieName);
	});

	if (filteredCookies.length !== cookies.length) {
		req.headers.cookie = filteredCookies.join('; ');
	}
};

/**
 * Removes a cookie with the given name from the parsed cookies object
 */
const removeCookiesFromParsedCookies = (req: Request) => {
	if (req.cookies !== null && typeof req.cookies === 'object') {
		for (const cookieName of Object.keys(req.cookies)) {
			if (isDisallowedCookie(cookieName)) delete req.cookies[cookieName];
		}
	}
};

export const sanitizeWebhookRequest = (req: Request) => {
	removeCookiesFromHeader(req);
	removeCookiesFromParsedCookies(req);
};
