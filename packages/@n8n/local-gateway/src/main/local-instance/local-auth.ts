import type { LocalOwnerCredentials } from './local-instance-store';
import {
	buildAuthorizeUrl,
	discover,
	exchangeCode,
	fetchWithTimeout,
	type OAuthTokens,
} from '../oauth/oauth-client';
import { OAUTH_CONFIG } from '../oauth/oauth-config';
import { createCodeVerifier, createState, deriveCodeChallenge } from '../oauth/pkce';

/**
 * Headless authentication against the embedded local instance: cookie-based owner
 * setup/login, then the same OAuth2 authorization-code + PKCE flow the browser
 * sign-in uses — driven entirely over HTTP, with the consent step approved via
 * the REST API instead of a consent page.
 */

export type LocalAuthErrorCode =
	| 'invalid_credentials'
	| 'request_failed'
	| 'missing_cookie'
	| 'state_mismatch';

export class LocalAuthError extends Error {
	constructor(
		readonly code: LocalAuthErrorCode,
		description: string,
	) {
		super(`${code}: ${description}`);
		this.name = 'LocalAuthError';
	}
}

/** Promote the instance's pre-created shell user to owner. Returns the `n8n-auth` cookie pair. */
export async function setupOwner(
	baseUrl: string,
	credentials: LocalOwnerCredentials,
): Promise<string> {
	const response = await postJson(`${baseUrl}/rest/owner/setup`, {
		email: credentials.email,
		firstName: 'Local',
		lastName: 'Owner',
		password: credentials.password,
	});
	if (!response.ok) {
		throw new LocalAuthError('request_failed', `owner setup returned ${response.status}`);
	}
	return requireCookie(response, 'n8n-auth');
}

/** Sign in with the stored owner credentials. Returns the `n8n-auth` cookie pair. */
export async function login(baseUrl: string, credentials: LocalOwnerCredentials): Promise<string> {
	const response = await postJson(`${baseUrl}/rest/login`, {
		emailOrLdapLoginId: credentials.email,
		password: credentials.password,
	});
	if (response.status === 401 || response.status === 403) {
		throw new LocalAuthError('invalid_credentials', 'stored owner credentials were rejected');
	}
	if (!response.ok) {
		throw new LocalAuthError('request_failed', `login returned ${response.status}`);
	}
	return requireCookie(response, 'n8n-auth');
}

/**
 * Run the authorization-code + PKCE flow without a browser: request authorization
 * (capturing the OAuth session cookie instead of following the redirect to the
 * consent page), approve consent via the REST API as the signed-in owner, then
 * exchange the code from the returned redirect URL.
 */
export async function acquireTokens(baseUrl: string, authCookie: string): Promise<OAuthTokens> {
	const metadata = await discover(baseUrl);
	const codeVerifier = createCodeVerifier();
	const state = createState();

	const authorizeResponse = await fetchWithTimeout(
		buildAuthorizeUrl(metadata, {
			codeChallenge: deriveCodeChallenge(codeVerifier),
			state,
			scopes: [...OAUTH_CONFIG.scopes],
		}),
		{ redirect: 'manual' },
	);
	const sessionCookie = requireCookie(authorizeResponse, 'n8n-oauth-session');

	const consentResponse = await postJson(
		`${baseUrl}/rest/consent/approve`,
		{ approved: true },
		`${authCookie}; ${sessionCookie}`,
	);
	if (!consentResponse.ok) {
		throw new LocalAuthError('request_failed', `consent returned ${consentResponse.status}`);
	}
	const consentBody = (await consentResponse.json()) as { data?: { redirectUrl?: string } };
	const redirectUrl = consentBody.data?.redirectUrl;
	if (!redirectUrl) {
		throw new LocalAuthError('request_failed', 'consent response carried no redirect URL');
	}

	const callbackParams = new URL(redirectUrl).searchParams;
	const code = callbackParams.get('code');
	if (callbackParams.get('state') !== state || !code) {
		throw new LocalAuthError('state_mismatch', 'consent redirect did not match the request');
	}

	return await exchangeCode(metadata, { code, codeVerifier });
}

async function postJson(url: string, body: unknown, cookie?: string): Promise<Response> {
	return await fetchWithTimeout(url, {
		method: 'POST',
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			'content-type': 'application/json',
			accept: 'application/json',
			...(cookie ? { cookie } : {}),
		},
		body: JSON.stringify(body),
	});
}

/** Extract a `name=value` cookie pair from the response's Set-Cookie headers. */
function requireCookie(response: Response, name: string): string {
	for (const header of response.headers.getSetCookie()) {
		if (header.startsWith(`${name}=`)) return header.split(';', 1)[0];
	}
	throw new LocalAuthError('missing_cookie', `response did not set the ${name} cookie`);
}
