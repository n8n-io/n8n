import { ClientOAuth2 } from '@n8n/client-oauth2';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
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
 *
 * This holds for the mint path only. The user-login path hands the refresh to
 * core, which posts to `accessTokenUrl` as stored, so the guarantee here does
 * not extend to the whole node.
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
				headers: { 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
			});
			const token = await oAuthClient.credentials.getToken();
			const expiresIn = Number(token.data.expires_in);
			// ponytail: early-expiry buffer only; if server-side revocation mid-run
			// ever matters, this source needs a `refreshAfterRejection` hook too
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
