export const APP_AUTH_PATH = '/apps-auth';
export const APP_LOGIN_ROUTE = `${APP_AUTH_PATH}/login/:namespace`;
export const APP_CALLBACK_PATH = `${APP_AUTH_PATH}/callback`;
export const APP_SERVING_PATH = '/apps';
export const APP_INSPECTOR_PATH = '/apps-inspector.js';
export const APP_COOKIE = 'n8n-apps';
export const APP_STATE_COOKIE = 'n8n-apps-state';

/** Keep regular n8n routes outside the app host. */
export function isAppRequestAllowed(requestPath: string, method: string): boolean {
	const read = method === 'GET' || method === 'HEAD';
	if (requestPath === APP_CALLBACK_PATH || requestPath === APP_INSPECTOR_PATH) return read;
	if (/^\/apps-auth\/login\/[^/]+\/?$/i.test(requestPath)) return read;
	const match = /^\/apps\/[^/]+(?:\/(.*))?$/i.exec(requestPath);
	if (!match) return false;
	const appPath = match[1] ?? '';
	if (!/^api(?:\/|$)/i.test(appPath)) return read;
	if (/^api\/me\/?$/i.test(appPath)) return read || method === 'OPTIONS';
	if (/^api\/workflows\/[^/]+\/?$/i.test(appPath)) return method === 'POST' || method === 'OPTIONS';
	if (/^api\/tables\/[^/]+\/rows\/?$/i.test(appPath)) {
		return ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'].includes(method);
	}
	if (/^api\/agents\/[^/]+\/chat(?:\/resume)?\/?$/i.test(appPath))
		return method === 'POST' || method === 'OPTIONS';
	if (/^api\/agents\/[^/]+\/messages\/?$/i.test(appPath)) return read || method === 'OPTIONS';
	return false;
}
