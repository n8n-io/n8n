import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';
import { UserError } from 'n8n-workflow';

/**
 * n8n credential type the AI Gateway serves each fallback web-search provider
 * under. Only providers the gateway can mint a managed credential for appear
 * here; SearXNG is self-hosted and has no managed path.
 */
export const WEB_SEARCH_GATEWAY_CREDENTIAL_TYPES: Record<string, string> = {
	brave: 'braveSearchApi',
};

/**
 * A `CredentialProvider` that can also mint the n8n Connect (AI Gateway)
 * synthetic credential for a web-search provider, keyed by n8n credential type
 * (e.g. `braveSearchApi`). Mirrors `AiGatewayModelCredentialResolver` — the
 * capability lives on the provider so no gateway resolver is threaded through
 * the build path.
 */
export interface AiGatewaySearchCredentialResolver {
	resolveAiGatewaySearchCredential(credentialType: string): Promise<ResolvedCredential>;
}

/** Proxy config shape `braveSearch` expects for a gateway-routed search. */
export interface WebSearchGatewayProxyConfig {
	apiUrl: string;
	getAuthHeaders: () => Promise<Record<string, string>>;
}

/**
 * The gateway's Brave URL already ends in the `/res/v1` version segment, which
 * `braveSearch` re-appends together with the operation path. Drop it here so the
 * two path conventions join into a single `/res/v1/web/search`.
 */
const BRAVE_GATEWAY_URL_SUFFIX = /\/res\/v1$/;

/**
 * Mint an AI Gateway proxy config for a managed (n8n Connect) web search. The
 * gateway authenticates the tenant token from Brave's `X-Subscription-Token`
 * header — the same field the Brave credential normally carries — so the minted
 * token is passed there rather than as a bearer token.
 */
export async function resolveWebSearchGatewayProxyConfig(
	provider: string,
	credentialProvider: CredentialProvider & Partial<AiGatewaySearchCredentialResolver>,
): Promise<WebSearchGatewayProxyConfig> {
	const credentialType = WEB_SEARCH_GATEWAY_CREDENTIAL_TYPES[provider];
	if (!credentialType) {
		throw new UserError(`Gateway credits do not support the "${provider}" web search provider.`);
	}
	if (!credentialProvider.resolveAiGatewaySearchCredential) {
		throw new UserError(
			'This credential provider cannot resolve Gateway credits web search credentials.',
		);
	}

	const credential = await credentialProvider.resolveAiGatewaySearchCredential(credentialType);
	const token = typeof credential.apiKey === 'string' ? credential.apiKey : '';
	const baseUrl = typeof credential.baseUrl === 'string' ? credential.baseUrl : '';
	if (!token || !baseUrl) {
		throw new UserError('Gateway credits returned an incomplete web search credential.');
	}

	return {
		apiUrl: baseUrl.replace(BRAVE_GATEWAY_URL_SUFFIX, ''),
		getAuthHeaders: async () => ({ 'X-Subscription-Token': token }),
	};
}
