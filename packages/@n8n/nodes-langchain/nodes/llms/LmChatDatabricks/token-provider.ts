import { fetchFollowingRedirects } from '@n8n/ai-utilities';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { INode, NodeEgressFilter } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export interface DatabricksOAuth2Credential {
	host: string;
	grantType: 'clientCredentials' | 'authorizationCode';
	clientId: string;
	clientSecret: string;
	scope?: string;
	authentication?: 'header' | 'body';
}

/**
 * Mints Databricks service-principal tokens on demand. Concurrent callers
 * share one in-flight mint, and tokens re-mint 60s before expiry so requests
 * near the end of the token window don't fail.
 *
 * Self-mints (instead of using core's `oauthTokenData`) because the model
 * client bypasses core's refresh machinery, so a core-issued token would
 * expire mid-run. The mint URL is derived from the https-validated `host`
 * (matching the credential's default) so a stored `accessTokenUrl` cannot
 * redirect the client secret elsewhere.
 */
export function getDatabricksTokenProvider(
	node: INode,
	credential: DatabricksOAuth2Credential,
	egressFilter?: NodeEgressFilter,
): () => Promise<string> {
	const tokenUrl = `${credential.host.replace(/\/$/, '')}/oidc/v1/token`;

	let cached: Promise<string> | undefined;
	let expiresAt = 0;

	const mint = async (): Promise<string> => {
		try {
			// The bridge enforces the egress policy inside the client: pre-flight
			// URL validation, connect-time DNS pinning, and per-redirect checks
			const oAuthClient = new ClientOAuth2({
				clientId: credential.clientId,
				clientSecret: credential.clientSecret,
				accessTokenUri: tokenUrl,
				scopes: credential.scope?.split(' '),
				authentication: credential.authentication,
				ssrfBridge: egressFilter,
			});
			const token = await oAuthClient.credentials.getToken();
			const expiresIn = Number(token.data.expires_in);
			// ponytail: early-expiry buffer only; if server-side revocation mid-run
			// ever matters, add invalidate-and-retry-once on 401/403 in createDatabricksFetch
			expiresAt = Number.isNaN(expiresIn) ? 0 : Date.now() + (expiresIn - 60) * 1000;
			return token.accessToken;
		} catch (error) {
			cached = undefined;
			expiresAt = 0;
			// The description is persisted in execution error JSON; scrub the secret
			// in case the token endpoint or a proxy echoes the request back
			const message = error instanceof Error ? error.message : undefined;
			throw new NodeOperationError(node, 'Failed to retrieve Databricks access token', {
				description:
					message && credential.clientSecret
						? message.replaceAll(credential.clientSecret, '***')
						: message,
			});
		}
	};

	return async () => {
		if (!cached || Date.now() >= expiresAt) {
			// Infinity until the mint resolves, so concurrent first callers join it
			expiresAt = Infinity;
			cached = mint();
		}
		return await cached;
	};
}

// Partner User-Agent for Databricks traffic attribution (PWAF telemetry spec).
// Set here, not via ChatOpenAI's `defaultHeaders`, so it also wins over the
// OpenAI SDK's own User-Agent - Headers.set() overwrites case-insensitively.
export const CHAT_MODEL_USER_AGENT = 'n8n_DatabricksChatModel/1.0';

/**
 * Wraps fetch to inject a fresh bearer token per request. Never reads or
 * clones the body, so streaming responses pass through untouched. Redirects
 * are followed manually so every hop is validated against the egress filter
 * before the token is sent to it, matching the MCP client's fetch wrapper;
 * the redirect helper also drops the bearer on cross-origin hops.
 */
export function createDatabricksFetch(
	getToken: () => Promise<string>,
	egressFilter?: NodeEgressFilter,
): typeof globalThis.fetch {
	return async (input, init) => {
		// Passing headers in init replaces a Request input's own headers, so
		// carry those over when init doesn't set any
		const headers = new Headers(
			init?.headers ?? (input instanceof Request ? input.headers : undefined),
		);
		headers.set('authorization', `Bearer ${await getToken()}`);
		headers.set('user-agent', CHAT_MODEL_USER_AGENT);
		// The redirect loop takes a URL, so unwrap a Request input and carry its
		// method/body/signal over (init still wins, per fetch spec). The body is
		// buffered, which also lets 307/308 hops replay it.
		const requestInit: RequestInit = { ...init };
		if (input instanceof Request) {
			requestInit.method ??= input.method;
			requestInit.signal ??= input.signal;
			if (requestInit.body === undefined && input.body) {
				requestInit.body = await input.arrayBuffer();
			}
		}
		const startUrl = input instanceof Request ? input.url : input;
		return await fetchFollowingRedirects(
			fetch,
			startUrl,
			{ ...requestInit, headers },
			{
				onBeforeHop: async (hopUrl) => {
					if (egressFilter) {
						const result = await egressFilter.validateUrl(hopUrl);
						if (!result.ok) throw result.error;
					}
				},
			},
		);
	};
}
