import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.openai.com/v1';

	const openai = new OpenAI({ baseURL, apiKey: credentials.apiKey as string });
	const { data: models = [] } = await openai.models.list();

	const filteredModels = models.filter((model: { id: string }) => {
		const isValidModel =
			(baseURL && !baseURL.includes('api.openai.com')) ||
			model.id.startsWith('ft:') ||
			model.id.startsWith('o1') ||
			(model.id.startsWith('gpt-') && !model.id.includes('instruct'));

		if (!filter) return isValidModel;

		return isValidModel && model.id.toLowerCase().includes(filter.toLowerCase());
	});

	const results = {
		results: filteredModels.map((model: { id: string }) => ({
			name: model.id,
			value: model.id,
		})),
	};

	return results;
}
