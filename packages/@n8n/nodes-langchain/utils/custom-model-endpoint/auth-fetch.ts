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
import { createClientCredentialsTokenSource } from './oauth2';
import type { EndpointCredential } from './types';

export type CustomModelEndpointFetchContext =
	| IExecuteFunctions
	| ISupplyDataFunctions
	| ILoadOptionsFunctions;

// The AI library signs every request `Authorization: Bearer <key>` before the transport sees it
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
	const allowedDomains = getCredentialAllowedDomains({
		node,
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: endpoint.baseUrl,
	});

	const assertAllowedUrl = async (hopUrl: string) => {
		assertUrlAllowed({ url: hopUrl, allowedDomains, node });
		if (!egressFilter) return;
		const result = await egressFilter.validateUrl(hopUrl);
		if (!result.ok) throw result.error;
	};

	// The login server is a host of its own, so the user has to allow it too
	const tokenSource =
		endpoint.login.type === 'oauth2'
			? createClientCredentialsTokenSource(
					endpoint.login,
					createRefreshingAuthFetch({ baseFetch, assertAllowedUrl }),
				)
			: undefined;

	const authorization = tokenSource
		? async () => ({ authorization: `Bearer ${await tokenSource.getToken()}` })
		: undefined;

	const authFetch = createRefreshingAuthFetch({
		baseFetch,
		resolveHeaders: async () => ({
			...buildRequestHeaders({ endpoint, requestHeaders }),
			...(await authorization?.()),
		}),
		...(tokenSource &&
			authorization && {
				refreshHeaders: async () => {
					tokenSource.forgetToken();
					return await authorization();
				},
			}),
		assertAllowedUrl,
	});

	return async (input, init) => {
		const stripped = withoutInheritedAuthorization(input, init);
		return await authFetch(stripped.input, stripped.init);
	};
}
