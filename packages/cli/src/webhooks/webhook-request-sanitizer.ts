import { AUTH_COOKIE_NAME } from '@/constants';
import type { Request } from 'express';

const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';

/**
 * Removes a cookie with the given name from the request header
 */
const removeCookiesFromHeader = (req: Request, cookieNames: string[]) => {
	const cookiesHeader = req.headers?.cookie;
	if (!cookiesHeader) {
		return;
	}

	const cookiesToSearchFor = cookieNames.map((cookieName) => `${cookieName}=`);
	const isSomeCookiePresent = cookiesToSearchFor.some((cookieToSearchFor) =>
		cookiesHeader.includes(cookieToSearchFor),
	);
	if (!isSomeCookiePresent) {
		return;
	}

	const cookies = cookiesHeader.split(';').map((cookie: string) => cookie.trim());
	const filteredCookies = cookies.filter((cookie: string) => {
		return !cookiesToSearchFor.some((cookieToSearchFor) => cookie.startsWith(cookieToSearchFor));
	});

	req.headers.cookie = filteredCookies.join(';');
};

/**
 * Removes a cookie with the given name from the parsed cookies object
 */
const removeCookiesFromParsedCookies = (req: Request, cookieNames: string[]) => {
	if (req.cookies && typeof req.cookies === 'object') {
		for (const cookieName of cookieNames) {
			delete req.cookies[cookieName];
		}
	}
};

export const sanitizeWebhookRequest = (req: Request) => {
	removeCookiesFromHeader(req, [AUTH_COOKIE_NAME, BROWSER_ID_COOKIE_NAME]);
	removeCookiesFromParsedCookies(req, [AUTH_COOKIE_NAME, BROWSER_ID_COOKIE_NAME]);
};
