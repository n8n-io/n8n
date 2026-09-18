import { createRefreshingAuthFetch } from '@n8n/ai-utilities';
import {
	assertUrlAllowed,
	getCredentialAllowedDomains,
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INode,
	type ISupplyDataFunctions,
	type NodeEgressFilter,
} from 'n8n-workflow';

import type { RefreshingTokenSource } from '../../../utils/oauth2-token-provider';
import { databricksAuthHeaders } from './constants';
import type { DatabricksOAuth2Credential } from './token-provider';
import { getDatabricksTokenProvider } from './token-provider';

export type DatabricksFetchContext =
	| IExecuteFunctions
	| ISupplyDataFunctions
	| ILoadOptionsFunctions;

// Every request carries a secret (bearer token, or the client secret on the
// mint path), so an http host would ship it in cleartext
export function assertHttpsHost(ctx: { getNode(): INode }, host: string) {
	if (!URL.canParse(host) || new URL(host).protocol !== 'https:') {
		throw new NodeOperationError(ctx.getNode(), 'Databricks host must use https');
	}
}

/**
 * The token-refreshing fetch every Databricks AI node sends its requests through.
 * The caller owns the transport (`baseFetch`) and the egress filter; the token
 * source comes back so the caller can read `expiredStatus`.
 */
export function createDatabricksAuthFetch(
	ctx: DatabricksFetchContext,
	credential: DatabricksOAuth2Credential,
	options: { endpointUrl: string; egressFilter: NodeEgressFilter; baseFetch: typeof fetch },
): { fetch: typeof fetch; tokenSource: RefreshingTokenSource } {
	const { endpointUrl, egressFilter } = options;
	const node = ctx.getNode();
	// endpointUrl derives from the credential's own host, so credentialOwnedSurface joins it to the allowlist
	const allowedDomains = getCredentialAllowedDomains({
		node,
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: endpointUrl,
	});

	const tokenSource = getDatabricksTokenProvider(ctx, credential, egressFilter);
	const { refreshAfterRejection } = tokenSource;
	// The caller builds its own transport, so it never reaches the
	// request helpers: `resolveHeaders` runs the expiry clock before every
	// request, and `refreshHeaders` covers the rejection the clock missed -
	// revoked server-side, or clock skew
	const authFetch = createRefreshingAuthFetch({
		baseFetch: options.baseFetch,
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
	});

	return { fetch: authFetch, tokenSource };
}
