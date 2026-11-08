import type { EmbeddingProviderOptions } from '@n8n/agents';
import { buildProxyHeaders } from '@n8n/api-types';
import type { OutboundHttp } from '@n8n/backend-network';

import { N8N_VERSION } from '@/constants';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

type ProxyToken = ConstructorParameters<typeof ProxyTokenManager>[0];

/**
 * Embedding provider options that send requests through the AI service proxy.
 * Agents and Instance AI share this so auth and proxy headers stay the same.
 */
export function createProxyEmbeddingProviderOptions({
	proxyBaseUrl,
	feature,
	fetchToken,
	outboundHttp,
}: {
	proxyBaseUrl: string;
	feature: Parameters<typeof buildProxyHeaders>[0]['feature'];
	fetchToken: ProxyToken;
	outboundHttp: OutboundHttp;
}): EmbeddingProviderOptions {
	// TODO: switch to n8n connect endpoints, don't use ai-proxy endpoints
	const baseURL = proxyBaseUrl.replace(/\/$/, '') + '/openai/';
	const tokenManager = new ProxyTokenManager(fetchToken);
	const proxyFetch = createAiProxyFetch(outboundHttp);

	return {
		baseURL,
		apiKey: 'proxy-managed',
		fetch: async (
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) => {
			const headers = new Headers(init?.headers);
			for (const [key, value] of Object.entries({
				...(await tokenManager.getAuthHeaders()),
				...buildProxyHeaders({ feature, n8nVersion: N8N_VERSION }),
			})) {
				headers.set(key, value);
			}
			return await proxyFetch(input, { ...init, headers });
		},
	};
}
