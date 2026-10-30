import { aiClientFetch } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';
import {
	NodeOperationError,
	UserError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch } from './auth-fetch';
import { readCustomModelEndpointCredential } from './credential-data';
import {
	clientErrorMessage,
	endpointSecrets,
	wrapCustomModelEndpointErrorFetch,
} from './error-handling';
import type { EndpointCredential } from './types';

export const CUSTOM_MODEL_ENDPOINT_CREDENTIAL = 'customModelEndpointApi';

const NO_LIST_HINT = 'Switch Model to "By ID" and type the model ID that your gateway expects.';

function idOf(entry: unknown): string | undefined {
	if (typeof entry === 'string') return entry;
	if (isRecord(entry) && typeof entry.id === 'string') return entry.id;
	return undefined;
}

/** OpenAI answers `{ data: [{ id }] }`; gateways that trim it answer a bare array. */
function modelIdsIn(body: unknown): string[] {
	const entries = Array.isArray(body)
		? body
		: isRecord(body) && Array.isArray(body.data)
			? body.data
			: [];
	return entries.flatMap((entry) => {
		const id = idOf(entry);
		return id ? [id] : [];
	});
}

export async function listGatewayModels(
	endpoint: EndpointCredential,
	fetchModels: typeof fetch,
): Promise<string[]> {
	const response = await fetchModels(`${endpoint.baseUrl}/models`, { method: 'GET' });
	const text = await response.text();

	if (response.status === 404) {
		throw new UserError('This gateway does not publish a model list', {
			description: NO_LIST_HINT,
		});
	}
	if (!response.ok) {
		const reason = clientErrorMessage(text) ?? `it answered ${response.status}`;
		throw new UserError(`The gateway could not list its models: ${reason}`, {
			description: NO_LIST_HINT,
		});
	}

	try {
		return modelIdsIn(JSON.parse(text));
	} catch {
		throw new UserError('The gateway answered the model list with something that is not JSON', {
			description: NO_LIST_HINT,
		});
	}
}

/**
 * Bound as the `listSearch` method of the Model field on both nodes. A failure
 * here leaves the user on "By ID", so a gateway without `/models` still works.
 */
export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credential = await this.getCredentials(CUSTOM_MODEL_ENDPOINT_CREDENTIAL);
	const endpoint = readCustomModelEndpointCredential(credential);

	const fetchModels = wrapCustomModelEndpointErrorFetch(
		createCustomModelEndpointAuthFetch(this, credential, {
			endpoint,
			egressFilter: this.helpers.getSecureEgressFilter(),
			baseFetch: aiClientFetch,
		}),
		{ secrets: endpointSecrets(endpoint) },
	);

	try {
		const ids = await listGatewayModels(endpoint, fetchModels);
		const wanted = filter
			? ids.filter((id) => id.toLowerCase().includes(filter.toLowerCase()))
			: ids;
		return { results: wanted.map((id) => ({ name: id, value: id })) };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}
