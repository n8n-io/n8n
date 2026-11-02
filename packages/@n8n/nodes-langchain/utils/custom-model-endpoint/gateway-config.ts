import type { ClientOptions } from '@langchain/openai';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { CustomModelEndpointFetchContext } from './auth-fetch';
import { createCustomModelEndpointAuthFetch, createEndpointBaseFetch } from './auth-fetch';
import { readCustomModelEndpointCredential, readOpenAiCredential } from './credential-data';
import { wrapCustomModelEndpointErrorFetch } from './error-handling';
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
 * The transport both nodes share: the gateway's own base URL, and one fetch that
 * carries the credential, reshapes the gateway's errors, and honours the proxy
 * and egress policy. Every hop goes through it, the OAuth2 token request and the
 * model list included, so none of them can reach the network unpinned.
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

	const transport = createCustomModelEndpointAuthFetch(ctx, credential, {
		endpoint,
		egressFilter,
		baseFetch: createEndpointBaseFetch(egressFilter, options.timeout),
		requestHeaders: options.requestHeaders,
	});

	return {
		endpoint,
		configuration: {
			baseURL: endpoint.baseUrl,
			fetch: wrapCustomModelEndpointErrorFetch(transport.fetch, { secrets: transport.secrets }),
		},
	};
}
