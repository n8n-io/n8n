import type { Request, NextFunction, Response } from 'express';

const AUTH_COOKIE_NAME = 'n8n-auth';

/**
 * Removes a cookie with the given name from the request header
 */
const removeCookieFromHeader = (req: Request, cookieName: string) => {
	const cookiesHeader = req.headers.cookie;
	if (!cookiesHeader) {
		return;
	}

	// First a quick check to see if the cookie is in the header
	const cookieToSearchFor = `${cookieName}=`;
	if (!cookiesHeader.includes(cookieToSearchFor)) {
		return;
	}

	const cookies = cookiesHeader.split(';').map((cookie: string) => cookie.trim());
	const filteredCookies = cookies.filter((cookie: string) => {
		return !cookie.startsWith(cookieToSearchFor);
	});

	req.headers.cookie = filteredCookies.join(';');
};

/**
 * Removes a cookie with the given name from the parsed cookies object
 */
const removeCookieFromParsedCookies = (req: Request, cookieName: string) => {
	if (req.cookies && typeof req.cookies === 'object') {
		delete req.cookies[cookieName];
	}
};

export const webhookRequestSanitizer = (req: Request, _res: Response, next: NextFunction) => {
	removeCookieFromHeader(req, AUTH_COOKIE_NAME);
	removeCookieFromParsedCookies(req, AUTH_COOKIE_NAME);

	next();
};
