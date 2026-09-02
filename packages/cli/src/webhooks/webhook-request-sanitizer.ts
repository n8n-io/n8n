import type { Request } from 'express';

import {
	AUTH_COOKIE_NAME,
	FORM_AUTH_COOKIE_PREFIX,
	FORM_OAUTH_COOKIE_NAME,
	OIDC_NONCE_COOKIE_NAME,
	OIDC_STATE_COOKIE_NAME,
} from '@/constants';
import { OAUTH_SESSION_COOKIE_NAME } from '@/modules/oauth-server/oauth-session.service';
import { OIDC_ID_TOKEN_COOKIE_NAME } from '@/modules/sso-oidc/constants';
import { OAUTH_BINDING_COOKIE_NAME } from '@/oauth/oauth-browser-binding.service';

const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';

/**
 * Cookies n8n issues for its own UI and sign-in flows. They are set without a `path`, so
 * browsers send them to `/webhook/*` too.
 *
 * `n8n-form-oauth` is excluded: the form OAuth2 flow reads it back off the raw header on the
 * redirect hop, so it has to keep flowing. Hence an explicit list of names rather than an
 * `n8n-` prefix rule, which would take that cookie with it.
 */
const DISALLOWED_COOKIES = new Set([
	AUTH_COOKIE_NAME,
	BROWSER_ID_COOKIE_NAME,
	OAUTH_SESSION_COOKIE_NAME,
	OAUTH_BINDING_COOKIE_NAME,
	OIDC_ID_TOKEN_COOKIE_NAME,
	OIDC_STATE_COOKIE_NAME,
	OIDC_NONCE_COOKIE_NAME,
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
