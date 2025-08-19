import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

import { getProxyAgent } from '@utils/httpProxyAgent';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('siliconFlowApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.siliconflow.com/v1';

	const openai = new OpenAI({
		baseURL,
		apiKey: credentials.apiKey as string,
		fetchOptions: {
			dispatcher: getProxyAgent(baseURL),
		},
	});
	// Filter out TTS, embedding, image generation, and other models
	const textChatFilter = { type: 'text', sub_type: 'chat' };
	const { data: models = [] } = await openai.models.list({ query: textChatFilter });
	const filteredModels = models.filter(
		(model: { id: string }) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()),
	);

	filteredModels.sort((a, b) => a.id.localeCompare(b.id));

	return {
		results: filteredModels.map((model: { id: string }) => ({
			name: model.id,
			value: model.id,
		})),
	};
}
