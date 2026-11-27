import { UserError } from '@n8n/errors';
import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INode,
	type INodeListSearchResult,
	type JsonObject,
} from 'n8n-workflow';

import { clientErrorMessage } from './error-handling';
import { createCustomModelEndpointConfig, pickCredentialType } from './gateway-config';
import { modelIdsIn } from './model-list';
import type { EndpointCredential } from './types';

const NO_LIST_HINT = 'Switch Model to "By ID" and type the model ID that your gateway expects.';
const MODEL_LIST_TIMEOUT_MS = 30_000;

export async function listGatewayModels(
	node: INode,
	endpoint: EndpointCredential,
	fetchModels: typeof fetch,
): Promise<string[]> {
	const deadline = AbortSignal.timeout(MODEL_LIST_TIMEOUT_MS);
	const whenDeadlinePassed = (error: unknown): never => {
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
	};

	const response = await fetchModels(`${endpoint.baseUrl}/models`, {
		method: 'GET',
		signal: deadline,
	}).catch(whenDeadlinePassed);
	// The body is the second place the gateway can stall: the headers can arrive and the
	// body never finish. The transport reads it to filter, so the deadline fires in the
	// call above and this await resolves what it already holds.
	const text = await response.text().catch(whenDeadlinePassed);
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
 * Bound as the `listSearch` method of the Model field. A failure
 * here leaves the user on "By ID", so a gateway without `/models` still works.
 */
export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = pickCredentialType(this.getNode());
	const credential = await this.getCredentials(credentialType);
	const { configuration, endpoint } = createCustomModelEndpointConfig(this, credential, {
		credentialType,
	});

	try {
		const ids = await listGatewayModels(
			this.getNode(),
			endpoint,
			configuration.fetch as typeof fetch,
		);
		const wanted = filter
			? ids.filter((id) => id.toLowerCase().includes(filter.toLowerCase()))
			: ids;
		wanted.sort((a, b) => a.localeCompare(b));
		return { results: wanted.map((id) => ({ name: id, value: id })) };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
