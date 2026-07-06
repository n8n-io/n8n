import { getProxyAgent } from '@n8n/ai-utilities';
import { listAnthropicModels } from '@n8n/ai-utilities/model-discovery';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ apiKey?: string; url?: string }>('anthropicApi');
	const baseURL = credentials.url ?? 'https://api.anthropic.com';

	// Shared with the agents model catalog: endpoint, auth, and newest-first
	// ordering live in @n8n/ai-utilities/model-discovery.
	const models = await listAnthropicModels({
		apiKey: credentials.apiKey ?? '',
		baseURL,
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
