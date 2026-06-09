import { OAUTH_CONFIG } from './oauth-config';

/** Abort external OAuth requests that stall, so the sign-in flow can't hang indefinitely. */
const REQUEST_TIMEOUT_MS = 15_000;

/** Subset of RFC 8414 authorization-server metadata this client relies on. */
export interface AuthServerMetadata {
	authorization_endpoint: string;
	token_endpoint: string;
	scopes_supported?: string[];
	code_challenge_methods_supported?: string[];
}

/** RFC 6749 §5.1 token response (the fields we use). */
export interface OAuthTokens {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	token_type?: string;
}

/** A typed OAuth error carrying the RFC 6749 §5.2 `error` code (e.g. `invalid_grant`). */
export class OAuthError extends Error {
	constructor(
		readonly code: string,
		description?: string,
	) {
		super(description ? `${code}: ${description}` : code);
		this.name = 'OAuthError';
	}
}

interface AuthorizeUrlParams {
	codeChallenge: string;
	state: string;
	scopes: string[];
}

interface ExchangeCodeParams {
	code: string;
	codeVerifier: string;
}

/** Fetch the authorization-server metadata document for an instance (RFC 8414). */
export async function discover(baseUrl: string): Promise<AuthServerMetadata> {
	const response = await fetchWithTimeout(`${baseUrl}${OAUTH_CONFIG.discoveryPath}`, {
		headers: { accept: 'application/json' },
	});
	if (!response.ok) {
		throw new OAuthError('discovery_failed', `${response.status} from ${baseUrl}`);
	}
	return (await response.json()) as AuthServerMetadata;
}

/** Build the authorization-request URL the user opens in their browser (no `resource`: the
 * server fixes the token audience and bounds access by the scope ceiling). */
export function buildAuthorizeUrl(
	metadata: AuthServerMetadata,
	params: AuthorizeUrlParams,
): string {
	const url = new URL(metadata.authorization_endpoint);
	// Set our params individually so any query component the AS already put on its
	// authorization_endpoint (RFC 6749 §3.1) is retained rather than overwritten.
	const requestParams: Record<string, string> = {
		response_type: 'code',
		client_id: OAUTH_CONFIG.clientId,
		redirect_uri: OAUTH_CONFIG.redirectUri,
		code_challenge: params.codeChallenge,
		code_challenge_method: 'S256',
		state: params.state,
		scope: params.scopes.join(' '),
	};
	for (const [key, value] of Object.entries(requestParams)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
}

/** Exchange an authorization code for tokens (authorization_code grant). */
export async function exchangeCode(
	metadata: AuthServerMetadata,
	params: ExchangeCodeParams,
): Promise<OAuthTokens> {
	return await postToken(metadata.token_endpoint, {
		grant_type: 'authorization_code',
		code: params.code,
		code_verifier: params.codeVerifier,
		client_id: OAUTH_CONFIG.clientId,
		redirect_uri: OAUTH_CONFIG.redirectUri,
	});
}

/** Mint a fresh access token from a refresh token (refresh_token grant, rotating). */
export async function refreshTokens(
	metadata: AuthServerMetadata,
	refreshToken: string,
): Promise<OAuthTokens> {
	return await postToken(metadata.token_endpoint, {
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		client_id: OAUTH_CONFIG.clientId,
	});
}

async function postToken(endpoint: string, fields: Record<string, string>): Promise<OAuthTokens> {
	const response = await fetchWithTimeout(endpoint, {
		method: 'POST',
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
			'content-type': 'application/x-www-form-urlencoded',
			accept: 'application/json',
		},
		body: new URLSearchParams(fields).toString(),
	});

	const body = (await response.json().catch(() => ({}))) as Partial<OAuthTokens> & {
		error?: string;
		error_description?: string;
	};

	if (!response.ok || !body.access_token) {
		throw new OAuthError(body.error ?? 'token_request_failed', body.error_description);
	}

	return body as OAuthTokens;
}

/** `fetch` with a hard timeout, normalizing network/timeout failures to `OAuthError`. */
async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
	try {
		return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
	} catch (error) {
		const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
		const reason = error instanceof Error ? error.message : String(error);
		throw new OAuthError(isTimeout ? 'request_timeout' : 'network_error', reason);
	}
}
