import { createRefreshingAuthFetch } from '@n8n/ai-utilities';
import {
	assertUrlAllowed,
	getCredentialAllowedDomains,
	type ICredentialDataDecryptedObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
	type NodeEgressFilter,
} from 'n8n-workflow';

import { buildRequestHeaders } from './headers';
import type { EndpointCredential } from './types';

export type CustomModelEndpointFetchContext =
	| IExecuteFunctions
	| ISupplyDataFunctions
	| ILoadOptionsFunctions;

/**
 * The AI library signs every request the OpenAI way, `Authorization: Bearer
 * <key>`, before the transport sees it. A gateway that reads its key from
 * another header, or needs none, must not receive that one: the user never
 * configured it, and a gateway that reads both may prefer it.
 */
function withoutInheritedAuthorization(
	input: RequestInfo | URL,
	init: RequestInit | undefined,
): { input: RequestInfo | URL; init: RequestInit | undefined } {
	const source = init?.headers ?? (input instanceof Request ? input.headers : undefined);
	if (source === undefined) return { input, init };

	const headers = new Headers(source);
	if (!headers.has('authorization')) return { input, init };

	headers.delete('authorization');
	return { input, init: { ...init, headers } };
}

/**
 * The fetch both Custom Model Endpoint nodes and the model list send their
 * requests through. It carries the credential's own login and gateway headers,
 * and checks every host it reaches, including each redirect hop.
 *
 * Redirects are followed here rather than by the platform, which is what
 * withholds the headers once a hop leaves the starting origin.
 */
export function createCustomModelEndpointAuthFetch(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	options: {
		endpoint: EndpointCredential;
		egressFilter: NodeEgressFilter;
		baseFetch: typeof fetch;
		requestHeaders?: Record<string, string>;
	},
): typeof fetch {
	const { endpoint, egressFilter, baseFetch, requestHeaders } = options;
	const node = ctx.getNode();
	// The base URL is the credential's own, so credentialOwnedSurface joins its host to the allowlist
	const allowedDomains = getCredentialAllowedDomains({
		node,
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: endpoint.baseUrl,
	});

	const authFetch = createRefreshingAuthFetch({
		baseFetch,
		resolveHeaders: async () => buildRequestHeaders({ endpoint, requestHeaders }),
		assertAllowedUrl: async (hopUrl) => {
			assertUrlAllowed({ url: hopUrl, allowedDomains, node });
			if (!egressFilter) return;
			const result = await egressFilter.validateUrl(hopUrl);
			if (!result.ok) throw result.error;
		},
	});

	return async (input, init) => {
		const stripped = withoutInheritedAuthorization(input, init);
		return await authFetch(stripped.input, stripped.init);
	};
}
