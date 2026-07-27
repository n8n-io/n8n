import { getProxyAgent } from '@n8n/ai-utilities';
import { listAnthropicModels } from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { mergeCustomHeaders } from '../../../../utils/helpers';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('anthropicApi');
	const baseURL = (credentials.url as string) ?? 'https://api.anthropic.com';

	// Shared with the agents model catalog: endpoint, auth, and newest-first
	// ordering live in @n8n/ai-utilities/model-discovery. The credential's
	// optional custom header (for gateway/proxy-backed credentials) is merged in,
	// matching what the credential's `authenticate` applies on other requests.
	const models = await listAnthropicModels({
		apiKey: (credentials.apiKey as string) ?? '',
		baseURL,
		headers: mergeCustomHeaders(credentials, {}),
		fetch: async (url, init) =>
			await fetch(url, {
				...init,
				dispatcher: getProxyAgent(baseURL),
			} as RequestInit),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.name, value: model.id })),
	};
}
