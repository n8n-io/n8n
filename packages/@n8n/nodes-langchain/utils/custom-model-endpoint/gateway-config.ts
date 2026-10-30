import type { ClientOptions } from '@langchain/openai';
import { aiClientFetch, getProxyAgent } from '@n8n/ai-utilities';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import { readCustomModelEndpointCredential, readOpenAiCredential } from './credential-data';
import { endpointSecrets, wrapCustomModelEndpointErrorFetch } from './error-handling';
import type { EndpointCredential } from './types';

export const CUSTOM_MODEL_ENDPOINT_CREDENTIAL = 'customModelEndpointApi';
export const OPENAI_CREDENTIAL = 'openAiApi';

export type AcceptedCredential = typeof CUSTOM_MODEL_ENDPOINT_CREDENTIAL | typeof OPENAI_CREDENTIAL;

/** Both nodes take either credential and have no Authentication field, so the choice is whichever one the user filled in. */
export function pickCredentialType(node: INode): AcceptedCredential {
	const configured = node.credentials ?? {};
	if (CUSTOM_MODEL_ENDPOINT_CREDENTIAL in configured) return CUSTOM_MODEL_ENDPOINT_CREDENTIAL;
	if (OPENAI_CREDENTIAL in configured) return OPENAI_CREDENTIAL;

	throw new UserError('This node has no credential', {
		description: 'Select a Custom Model Endpoint credential, or an OpenAI one.',
	});
}

export function readEndpointCredential(
	type: AcceptedCredential,
	data: ICredentialDataDecryptedObject,
): EndpointCredential {
	return type === OPENAI_CREDENTIAL
		? readOpenAiCredential(data)
		: readCustomModelEndpointCredential(data);
}

/**
 * The OpenAI-client transport both nodes share: the gateway's own base URL, a
 * fetch that carries the credential and reshapes the gateway's errors, and a
 * dispatcher that honours the proxy and egress policy.
 */
export function createCustomModelEndpointConfig(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	options: {
		credentialType: AcceptedCredential;
		timeout?: number;
		requestHeaders?: Record<string, string>;
	},
): { configuration: ClientOptions; endpoint: EndpointCredential } {
	const endpoint = readEndpointCredential(options.credentialType, credential);
	const egressFilter = ctx.helpers.getSecureEgressFilter();

	const authFetch = createCustomModelEndpointAuthFetch(ctx, credential, {
		endpoint,
		egressFilter,
		baseFetch: aiClientFetch,
		requestHeaders: options.requestHeaders,
	});

	return {
		endpoint,
		configuration: {
			baseURL: endpoint.baseUrl,
			fetch: wrapCustomModelEndpointErrorFetch(authFetch, {
				secrets: endpointSecrets(endpoint),
			}),
			fetchOptions: {
				dispatcher: getProxyAgent(
					endpoint.baseUrl,
					{ headersTimeout: options.timeout, bodyTimeout: options.timeout },
					egressFilter,
				),
			},
		},
	};
}
