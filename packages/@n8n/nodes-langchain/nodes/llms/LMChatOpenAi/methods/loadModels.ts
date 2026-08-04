import { getProxyAgent } from '@n8n/ai-utilities';
import { listOpenAiModels } from '@n8n/ai-utilities/model-discovery';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { mergeCustomHeaders } from '../../../../utils/helpers';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.openai.com/v1';
	const { openAiDefaultHeaders } = Container.get(AiConfig);
	const headers = mergeCustomHeaders(credentials, openAiDefaultHeaders ?? {});

	// Shared with the agents model catalog: endpoint, auth, chat-model filtering
	// (including include-all on custom hosts) live in @n8n/ai-utilities/model-discovery.
	const models = await listOpenAiModels({
		apiKey: credentials.apiKey as string,
		baseURL,
		headers,
		fetch: async (url, init) =>
			await fetch(url, {
				...init,
				dispatcher: getProxyAgent(baseURL),
			} as RequestInit),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.id, value: model.id })),
	};
}
