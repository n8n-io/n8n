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

/** The Authentication field decides. A node saved before it existed falls back to whichever credential is attached. */
export function pickCredentialType(node: INode): AcceptedCredential {
	const chosen = node.parameters?.authentication;
	if (chosen === CUSTOM_MODEL_ENDPOINT_CREDENTIAL || chosen === OPENAI_CREDENTIAL) return chosen;

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

/** Without this the client falls back to its own default host, which is not the user's gateway. */
function assertAbsoluteHttpUrl(baseUrl: string): void {
	const parsed = URL.parse(baseUrl);
	if (parsed === null || !['http:', 'https:'].includes(parsed.protocol)) {
		throw new UserError('The credential has no usable Base URL', {
			description:
				'Set Base URL to the root of your gateway, such as https://gateway.example.com/v1.',
		});
	}
}

/**
 * The shared transport: the gateway's own base URL, and one fetch that
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
	assertAbsoluteHttpUrl(endpoint.baseUrl);
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
