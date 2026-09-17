import type { ClientOptions } from '@langchain/openai';
import { createRefreshingAuthFetch, getProxyAgent } from '@n8n/ai-utilities';
import {
	assertUrlAllowed,
	getCredentialAllowedDomains,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import {
	assertHttpsHost,
	DATABRICKS_REQUEST_TIMEOUT_MS,
	databricksAuthHeaders,
	gatewayBaseUrl,
} from './constants';
import { wrapDatabricksErrorFetch } from './error-handling';
import type { RefreshingTokenSource } from '../oauth2-token-provider';
import { getDatabricksTokenProvider, type DatabricksOAuth2Credential } from './token-provider';

/**
 * Builds the OpenAI-client transport for the Unity AI Gateway: the gateway
 * base URL, an authenticating fetch that keeps the token fresh and reshapes
 * Databricks error bodies, and a proxy dispatcher honouring the egress policy.
 *
 * The token source comes back so the caller can build its own failed-attempt
 * handler, which needs `expiredStatus`. The resolved timeout comes back too, so
 * the model client and this transport cannot disagree about it.
 */
export function createDatabricksGatewayConfig(
	ctx: ISupplyDataFunctions,
	credential: DatabricksOAuth2Credential,
	timeout?: number,
): { configuration: ClientOptions; tokenSource: RefreshingTokenSource; timeout: number } {
	assertHttpsHost(ctx, credential.host);

	const requestTimeout = timeout ?? DATABRICKS_REQUEST_TIMEOUT_MS;

	const baseURL = gatewayBaseUrl(credential.host);
	const node = ctx.getNode();
	// baseURL derives from the credential's own host, so credentialOwnedSurface joins it to the allowlist
	const allowedDomains = getCredentialAllowedDomains({
		node,
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: baseURL,
	});

	const egressFilter = ctx.helpers.getSecureEgressFilter();
	const tokenSource = getDatabricksTokenProvider(ctx, credential, egressFilter);
	const { refreshAfterRejection } = tokenSource;

	const configuration: ClientOptions = {
		baseURL,
		// The model client builds its own transport, so it never reaches the
		// request helpers: `resolveHeaders` runs the expiry clock before every
		// request, and `refreshHeaders` covers the rejection the clock missed -
		// revoked server-side, or clock skew
		fetch: wrapDatabricksErrorFetch(
			createRefreshingAuthFetch({
				baseFetch: fetch,
				expiredStatus: tokenSource.expiredStatus,
				resolveHeaders: async () => databricksAuthHeaders(await tokenSource.getToken()),
				...(refreshAfterRejection && {
					refreshHeaders: async () => {
						const refreshed = await refreshAfterRejection();
						return refreshed ? databricksAuthHeaders(refreshed) : null;
					},
				}),
				assertAllowedUrl: async (hopUrl) => {
					assertUrlAllowed({ url: hopUrl, allowedDomains, node });
					if (!egressFilter) return;
					const result = await egressFilter.validateUrl(hopUrl);
					if (!result.ok) throw result.error;
				},
			}),
		),
		fetchOptions: {
			dispatcher: getProxyAgent(
				baseURL,
				{
					headersTimeout: requestTimeout,
					bodyTimeout: requestTimeout,
				},
				egressFilter,
			),
		},
	};

	return { configuration, tokenSource, timeout: requestTimeout };
}
