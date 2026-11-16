import { UserError } from '@n8n/errors';
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
const MODEL_LIST_TIMEOUT_MS = 30_000;

function idOf(entry: unknown): string | undefined {
	if (typeof entry === 'string') return entry;
	if (isRecord(entry) && typeof entry.id === 'string') return entry.id;
	return undefined;
}

/**
 * OpenAI answers `{ data: [{ id }] }`; gateways that trim it answer a bare array. Anything else
 * is a shape this does not know, which is not the same as a gateway that lists no models.
 */
function modelIdsIn(body: unknown): string[] | undefined {
	const entries = Array.isArray(body)
		? body
		: isRecord(body) && Array.isArray(body.data)
			? body.data
			: undefined;
	return entries?.flatMap((entry) => {
		const id = idOf(entry);
		return id ? [id] : [];
	});
}

export async function listGatewayModels(
	node: INode,
	endpoint: EndpointCredential,
	fetchModels: typeof fetch,
): Promise<string[]> {
	const deadline = AbortSignal.timeout(MODEL_LIST_TIMEOUT_MS);
	const response = await fetchModels(`${endpoint.baseUrl}/models`, {
		method: 'GET',
		signal: deadline,
	}).catch((error: unknown) => {
		// The login has its own deadline and states which host refused. Relabelling it here
		// would point the user at the gateway for a failure of the token endpoint.
		if (error instanceof UserError) throw error;
		if (!deadline.aborted) throw error;
		throw new NodeApiError(
			node,
			{},
			{
				message: `The gateway did not answer the model list within ${MODEL_LIST_TIMEOUT_MS / 1000} seconds`,
				description: NO_LIST_HINT,
			},
		);
	});
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

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
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

	const ids = modelIdsIn(parsed);
	if (!ids) {
		throw new NodeApiError(
			node,
			{},
			{
				message: 'The gateway answered the model list in a shape this node does not read',
				description: NO_LIST_HINT,
			},
		);
	}

	return ids;
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
	const authFetch = createCustomModelEndpointAuthFetch(this, credential, {
		endpoint,
		egressFilter,
		baseFetch: createEndpointBaseFetch(egressFilter),
	});

	try {
		const ids = await listGatewayModels(this.getNode(), endpoint, authFetch);
		const wanted = filter
			? ids.filter((id) => id.toLowerCase().includes(filter.toLowerCase()))
			: ids;
		wanted.sort((a, b) => a.localeCompare(b));
		return { results: wanted.map((id) => ({ name: id, value: id })) };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
