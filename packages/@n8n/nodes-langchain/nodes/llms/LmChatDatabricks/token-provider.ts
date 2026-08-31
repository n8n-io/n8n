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
 * Returns a function that mints Databricks service-principal access tokens on
 * demand, caching the in-flight promise (single-flight) so concurrent callers
 * don't stampede the token endpoint, and re-minting 60s before expiry so a
 * request fired near the end of the token window doesn't die mid-flight with
 * a non-retryable 403.
 *
 * Self-mints instead of reading core's `oauthTokenData` access token: the
 * model client's HTTP bypasses core's refresh machinery, so a core-issued
 * token would expire mid-run with no way to renew it.
 *
 * The mint URL is derived from `host` (https-enforced in supplyData) rather
 * than the credential's stored `accessTokenUrl`, so a tampered credential
 * cannot redirect the client secret elsewhere; it matches the credential's
 * default `={{$self["host"]}}/oidc/v1/token`.
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

/**
 * Wraps fetch to inject a fresh bearer token per request. Never reads or
 * clones the body, so streaming responses pass through untouched.
 */
export function createDatabricksFetch(getToken: () => Promise<string>): typeof globalThis.fetch {
	return async (input, init) => {
		const headers = new Headers(init?.headers);
		headers.set('authorization', `Bearer ${await getToken()}`);
		return await fetch(input, { ...init, headers });
	};
}
