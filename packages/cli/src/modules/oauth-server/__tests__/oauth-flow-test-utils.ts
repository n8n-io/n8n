import { OAUTH_SESSION_COOKIE_PREFIX } from '../oauth-session.service';

type ResponseWithHeaders = { headers: Record<string, string | string[] | undefined> };

/**
 * Read the pending authorization flow out of an /authorize redirect: the flow
 * id it sends the browser to the consent screen with, and the session cookie it
 * set for that flow.
 */
export const pendingFlowFrom = (response: ResponseWithHeaders) => {
	const location = String(response.headers.location ?? '');
	const flowId = new URL(location, 'http://localhost').searchParams.get('flow') ?? '';

	const rawSetCookie = response.headers['set-cookie'] ?? [];
	const setCookies = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
	const cookie = setCookies
		.map((setCookie) => setCookie.split(';')[0])
		.find((setCookie) => setCookie.startsWith(`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}=`));

	return { flowId, cookie };
};

/** Cookie header carrying one flow's session token. */
export const sessionCookieFor = (flowId: string, sessionToken: string) =>
	`${OAUTH_SESSION_COOKIE_PREFIX}${flowId}=${sessionToken}`;

/** A well-formed flow id for tests that mint their own session instead of calling /authorize. */
export const TEST_FLOW_ID = 'ktest00-0123456789abcdef01234567';
