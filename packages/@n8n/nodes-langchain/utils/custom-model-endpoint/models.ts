import { isRecord } from '@n8n/utils/is-record';
import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INode,
	type INodeListSearchResult,
	type JsonObject,
} from 'n8n-workflow';

import { createCustomModelEndpointAuthFetch, createEndpointBaseFetch } from './auth-fetch';
import { readCustomModelEndpointCredential } from './credential-data';
import { clientErrorMessage } from './error-handling';
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
	node: INode,
	endpoint: EndpointCredential,
	fetchModels: typeof fetch,
): Promise<string[]> {
	const response = await fetchModels(`${endpoint.baseUrl}/models`, { method: 'GET' });
	const text = await response.text();
	const httpCode = String(response.status);

	if (response.status === 404) {
		throw new NodeApiError(
			node,
			{},
			{
				message: 'This gateway does not publish a model list',
				description: NO_LIST_HINT,
				httpCode,
			},
		);
	}
	if (!response.ok) {
		const reason = clientErrorMessage(text) ?? `it answered ${response.status}`;
		throw new NodeApiError(
			node,
			{},
			{
				message: `The gateway could not list its models: ${reason}`,
				description: NO_LIST_HINT,
				httpCode,
			},
		);
	}

	try {
		return modelIdsIn(JSON.parse(text));
	} catch {
		throw new NodeApiError(
			node,
			{},
			{
				message: 'The gateway answered the model list with something that is not JSON',
				description: NO_LIST_HINT,
			},
		);
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

	const egressFilter = this.helpers.getSecureEgressFilter();
	const transport = createCustomModelEndpointAuthFetch(this, credential, {
		endpoint,
		egressFilter,
		baseFetch: createEndpointBaseFetch(egressFilter),
	});

	try {
		const ids = await listGatewayModels(this.getNode(), endpoint, transport.fetch);
		const wanted = filter
			? ids.filter((id) => id.toLowerCase().includes(filter.toLowerCase()))
			: ids;
		return { results: wanted.map((id) => ({ name: id, value: id })) };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
