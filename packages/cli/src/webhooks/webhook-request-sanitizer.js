'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sanitizeWebhookRequest = void 0;
const constants_1 = require('@/constants');
const BROWSER_ID_COOKIE_NAME = 'n8n-browserId';
const DISALLOWED_COOKIES = new Set([constants_1.AUTH_COOKIE_NAME, BROWSER_ID_COOKIE_NAME]);
const removeCookiesFromHeader = (req) => {
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
const removeCookiesFromParsedCookies = (req) => {
	if (req.cookies !== null && typeof req.cookies === 'object') {
		for (const cookieName of DISALLOWED_COOKIES) {
			delete req.cookies[cookieName];
		}
	}
};
const sanitizeWebhookRequest = (req) => {
	removeCookiesFromHeader(req);
	removeCookiesFromParsedCookies(req);
};
exports.sanitizeWebhookRequest = sanitizeWebhookRequest;
//# sourceMappingURL=webhook-request-sanitizer.js.map
