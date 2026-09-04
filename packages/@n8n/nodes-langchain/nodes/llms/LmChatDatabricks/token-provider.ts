import { fetchFollowingRedirects } from '@n8n/ai-utilities';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type {
	INode,
	ISupplyDataFunctions,
	ILoadOptionsFunctions,
	NodeEgressFilter,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { OAuth2TokenData, RefreshingTokenSource } from '../../../utils/oauth2-token-provider';
import { createRefreshingOAuth2TokenProvider } from '../../../utils/oauth2-token-provider';

export const DATABRICKS_CREDENTIAL_TYPE = 'databricksOAuth2Api';

export interface DatabricksOAuth2Credential {
	host: string;
	grantType: 'clientCredentials' | 'authorizationCode';
	clientId: string;
	clientSecret: string;
	scope?: string;
	authentication?: 'header' | 'body';
	oauthTokenData?: OAuth2TokenData;
	tokenExpiredStatusCode?: number;
}

/**
 * A service principal re-mints from its permanent secret; a user login spends a
 * one-time-use refresh token, so it has to go through core to persist the rotation.
 */
export function getDatabricksTokenProvider(
	ctx: ISupplyDataFunctions | ILoadOptionsFunctions,
	credential: DatabricksOAuth2Credential,
	egressFilter?: NodeEgressFilter,
): RefreshingTokenSource {
	if (credential.grantType === 'authorizationCode') {
		return createRefreshingOAuth2TokenProvider({
			ctx,
			credentialType: DATABRICKS_CREDENTIAL_TYPE,
			credential,
			serviceName: 'Databricks',
		});
	}
	return getServicePrincipalTokenProvider(ctx.getNode(), credential, egressFilter);
}

// Partner User-Agent for Databricks traffic attribution (PWAF telemetry spec).
// Set here, not via ChatOpenAI's `defaultHeaders`, so it also wins over the
// OpenAI SDK's own User-Agent - Headers.set() overwrites case-insensitively.
export const CHAT_MODEL_USER_AGENT = 'n8n_DatabricksChatModel/1.0';

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
function getServicePrincipalTokenProvider(
	node: INode,
	credential: DatabricksOAuth2Credential,
	egressFilter?: NodeEgressFilter,
): RefreshingTokenSource {
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
				headers: { 'User-Agent': CHAT_MODEL_USER_AGENT },
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

	// No refresh hook: re-minting already covers expiry
	return {
		getToken: async () => {
			if (!cached || Date.now() >= expiresAt) {
				// Infinity until the mint resolves, so concurrent first callers join it
				expiresAt = Infinity;
				cached = mint();
			}
			return await cached;
		},
	};
}

/**
 * Wraps fetch to inject a fresh bearer token per request. Never reads or
 * clones the body, so streaming responses pass through untouched. Redirects
 * are followed manually so every hop is validated against the egress filter
 * before the token is sent to it, matching the MCP client's fetch wrapper;
 * the redirect helper also drops the bearer on cross-origin hops.
 */
export function createDatabricksFetch(
	tokenSource: RefreshingTokenSource,
	egressFilter?: NodeEgressFilter,
): typeof globalThis.fetch {
	const { getToken, refreshAfterRejection, expiredStatus } = tokenSource;

	return async (input, init) => {
		// The redirect loop takes a URL, so unwrap a Request input and carry its
		// method/body/signal over (init still wins, per fetch spec). The body is
		// buffered, which lets 307/308 hops and the retry below replay it.
		const requestInit: RequestInit = { ...init };
		if (input instanceof Request) {
			requestInit.method ??= input.method;
			requestInit.signal ??= input.signal;
			if (requestInit.body === undefined && input.body) {
				requestInit.body = await input.arrayBuffer();
			}
		}
		const startUrl = input instanceof Request ? input.url : input;

		const send = async (token: string) => {
			// Passing headers in init replaces a Request input's own headers, so
			// carry those over when init doesn't set any
			const headers = new Headers(
				init?.headers ?? (input instanceof Request ? input.headers : undefined),
			);
			headers.set('authorization', `Bearer ${token}`);
			headers.set('user-agent', CHAT_MODEL_USER_AGENT);
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

		const response = await send(await getToken());
		if (response.status !== expiredStatus || !refreshAfterRejection) return response;

		// The clock check missed it: revoked server-side, or clock skew
		const refreshed = await refreshAfterRejection();
		if (!refreshed) return response;

		await response.body?.cancel().catch(() => {});
		return await send(refreshed);
	};
}
