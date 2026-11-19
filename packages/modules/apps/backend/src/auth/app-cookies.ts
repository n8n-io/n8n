import { isRecord } from '@n8n/utils/is-record';
import type { CookieOptions, Request } from 'express';

export function appCookieName(baseUrl: URL, suffix: string): string {
	return `${baseUrl.protocol === 'https:' ? '__Host-' : ''}n8n-app-${suffix}`;
}

export function appCookieOptions(baseUrl: URL): CookieOptions {
	return {
		httpOnly: true,
		secure: baseUrl.protocol === 'https:',
		sameSite: 'lax',
		path: '/',
	};
}

export function embeddedAppCookieOptions(baseUrl: URL): CookieOptions {
	if (baseUrl.protocol !== 'https:') return appCookieOptions(baseUrl);
	return { httpOnly: true, secure: true, sameSite: 'none', partitioned: true, path: '/' };
}

export function readCookie(req: Request, name: string): string | undefined {
	const value: unknown = isRecord(req.cookies) ? req.cookies[name] : undefined;
	return typeof value === 'string' ? value : undefined;
}
