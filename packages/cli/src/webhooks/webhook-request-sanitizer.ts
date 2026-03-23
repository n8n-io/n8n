import type { Request } from 'express';

import { AUTH_COOKIE_NAME } from '@/constants';

const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';

const DISALLOWED_COOKIES = new Set([AUTH_COOKIE_NAME, BROWSER_ID_COOKIE_NAME]);

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
		return !DISALLOWED_COOKIES.has(cookieName);
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
		for (const cookieName of DISALLOWED_COOKIES) {
			delete req.cookies[cookieName];
		}
	}
};

export const sanitizeWebhookRequest = (req: Request) => {
	removeCookiesFromHeader(req);
	removeCookiesFromParsedCookies(req);
};
