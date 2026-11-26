import type { ClientOptions } from '@langchain/openai';
import { UserError } from '@n8n/errors';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';

import type { CustomModelEndpointFetchContext } from './auth-fetch';
import {
	createCustomModelEndpointAuthFetch,
	createCustomModelEndpointTokenSource,
	createEndpointBaseFetch,
} from './auth-fetch';
import { readCustomModelEndpointCredential, readOpenAiCredential } from './credential-data';
import type { AccessTokenSource } from './oauth2';
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
function assertAbsoluteHttpUrl(url: string, field: 'Base URL' | 'Token URL'): void {
	const parsed = URL.parse(url);
	if (parsed === null || !['http:', 'https:'].includes(parsed.protocol)) {
		throw new UserError(`The credential has no usable ${field}`, {
			description:
				field === 'Base URL'
					? 'Set Base URL to the root of your gateway, such as https://gateway.example.com/v1.'
					: 'Set Token URL to the token endpoint of your login server, such as https://login.example.com/oauth2/token.',
		});
	}

	// The transport refuses a URL that carries a login and repeats the whole URL, password
	// included, in the error it throws. The credential has its own fields for a login.
	if (parsed.username !== '' || parsed.password !== '') {
		throw new UserError(`The ${field} of the credential carries a user name or a password`, {
			description:
				'Take them out of the URL, and set the login on the credential with Authentication.',
		});
	}
}

/** The login server is a second host the credential names, so it takes the same check. */
function assertEndpointUrls(endpoint: EndpointCredential): void {
	assertAbsoluteHttpUrl(endpoint.baseUrl, 'Base URL');
	if (endpoint.login.type === 'oauth2') {
		assertAbsoluteHttpUrl(endpoint.login.tokenUrl, 'Token URL');
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
		/** n8n's own context headers, which name the workflow and the execution. */
		contextHeaders?: Record<string, string>;
		/** The headers the user typed on the node, any of which can hold a key. */
		userHeaders?: Record<string, string>;
		tokenSource?: AccessTokenSource;
	},
): { configuration: ClientOptions; endpoint: EndpointCredential } {
	const endpoint = readEndpointCredential(options.credentialType, credential);
	assertEndpointUrls(endpoint);
	const egressFilter = ctx.helpers.getSecureEgressFilter();

	const authFetch = createCustomModelEndpointAuthFetch(ctx, credential, {
		endpoint,
		egressFilter,
		baseFetch: createEndpointBaseFetch(egressFilter, options.timeout),
		contextHeaders: options.contextHeaders,
		userHeaders: options.userHeaders,
		tokenSource: options.tokenSource,
	});

	return {
		endpoint,
		configuration: {
			baseURL: endpoint.baseUrl,
			fetch: authFetch,
		},
	};
}

/**
 * One sign-in for a whole run. A caller that builds a config for each item passes the
 * result back in as `tokenSource`, or every item signs in again.
 */
export function createRunTokenSource(
	ctx: CustomModelEndpointFetchContext,
	credential: ICredentialDataDecryptedObject,
	credentialType: AcceptedCredential,
): AccessTokenSource | undefined {
	const endpoint = readEndpointCredential(credentialType, credential);
	// The whole check, not the base URL alone: this is an entry point of its own, and the
	// source it builds talks to the token URL.
	assertEndpointUrls(endpoint);

	return createCustomModelEndpointTokenSource(ctx, credential, {
		endpoint,
		egressFilter: ctx.helpers.getSecureEgressFilter(),
	});
}
