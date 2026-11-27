import { createRefreshingAuthFetch, proxyFetch } from '@n8n/ai-utilities';
import {
	assertUrlAllowed,
	getCredentialAllowedDomains,
	type ICredentialDataDecryptedObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
	type NodeEgressFilter,
} from 'n8n-workflow';

import { wrapCustomModelEndpointErrorFetch } from './error-handling';
import { asSent, buildRequestHeaders, credentialSecrets } from './headers';
import type { AccessTokenSource } from './oauth2';
import { createClientCredentialsTokenSource } from './oauth2';
import type { EndpointCredential } from './types';

/**
 * Every hop has to go out through this, the token request included. `validateUrl`
 * only resolves the name; the dispatcher is what pins that answer for the
 * connection that follows, so a name that answers twice cannot land elsewhere.
 */
export function createEndpointBaseFetch(
	egressFilter: NodeEgressFilter,
	timeout?: number,
): typeof fetch {
	return async (input, init) =>
		await proxyFetch({
			input,
			init,
			egressFilter,
			...(timeout !== undefined && {
				timeoutOptions: { headersTimeout: timeout, bodyTimeout: timeout },
			}),
		});
}

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

function allowedUrlAssertion(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	endpoint: EndpointCredential,
	egressFilter: NodeEgressFilter,
) {
	const node = ctx.getNode();
	const allowedDomains = getCredentialAllowedDomains({
		node,
		credentialData: credential,
		credentialOwnedSurface: true,
		nodeEndpointUrl: endpoint.baseUrl,
	});

	return async (hopUrl: string) => {
		assertUrlAllowed({ url: hopUrl, allowedDomains, node });
		const result = await egressFilter.validateUrl(hopUrl);
		if (!result.ok) throw result.error;
	};
}

/**
 * The token lives in the source, so a caller that builds a transport for each item has to
 * hold one of these across them or it signs in again for every item. The login server is a
 * host of its own, so the user has to allow it too.
 */
export function createCustomModelEndpointTokenSource(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	options: {
		endpoint: EndpointCredential;
		egressFilter: NodeEgressFilter;
		/**
		 * Defaults to a transport of its own, for a source shared by several of them. The
		 * token request carries its own deadline, so that one takes no timeout.
		 */
		baseFetch?: typeof fetch;
	},
): AccessTokenSource | undefined {
	const { endpoint, egressFilter } = options;
	if (endpoint.login.type !== 'oauth2') return undefined;

	return createClientCredentialsTokenSource(
		endpoint.login,
		createRefreshingAuthFetch({
			baseFetch: options.baseFetch ?? createEndpointBaseFetch(egressFilter),
			assertAllowedUrl: allowedUrlAssertion(ctx, credential, endpoint, egressFilter),
		}),
	);
}

export function createCustomModelEndpointAuthFetch(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	options: {
		endpoint: EndpointCredential;
		egressFilter: NodeEgressFilter;
		baseFetch: typeof fetch;
		/**
		 * n8n's own context headers carry the workflow name and the execution id. They are
		 * not secrets, and filtering them would cut the names out of any error that uses them.
		 */
		contextHeaders?: Record<string, string>;
		/** The headers the user typed on the node, any of which can hold a key. */
		userHeaders?: Record<string, string>;
		/** Pass one in to sign in once across transports. See the factory above. */
		tokenSource?: AccessTokenSource;
	},
): typeof fetch {
	const { endpoint, egressFilter, baseFetch, contextHeaders = {}, userHeaders = {} } = options;
	// Built here from the one list, so a header cannot be sent without also being filtered
	const requestHeaders = { ...contextHeaders, ...userHeaders };
	const assertAllowedUrl = allowedUrlAssertion(ctx, credential, endpoint, egressFilter);

	const tokenSource =
		options.tokenSource ?? createCustomModelEndpointTokenSource(ctx, credential, options);

	const resolveHeaders = async () =>
		buildRequestHeaders({
			endpoint,
			requestHeaders,
			bearerToken: await tokenSource?.getToken(),
		});

	const authFetch = createRefreshingAuthFetch({
		baseFetch: wrapCustomModelEndpointErrorFetch(baseFetch, [
			...credentialSecrets(endpoint),
			...Object.values(userHeaders)
				.map(asSent)
				.filter((value) => value.length > 0),
		]),
		resolveHeaders,
		...(tokenSource && {
			// The retry is a whole request again, so it needs the gateway headers too
			refreshHeaders: async () => {
				tokenSource.forgetToken();
				return await resolveHeaders();
			},
		}),
		assertAllowedUrl,
	});

	return async (input, init) => {
		const stripped = withoutInheritedAuthorization(input, init);
		return await authFetch(stripped.input, stripped.init);
	};
}
