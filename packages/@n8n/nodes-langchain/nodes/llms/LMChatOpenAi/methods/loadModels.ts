import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

import { shouldIncludeModel } from '../../../vendors/OpenAi/helpers/modelFiltering';
import { getProxyAgent } from '@utils/httpProxyAgent';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseURL =
		(this.getNodeParameter('options.baseURL', '') as string) ||
		(credentials.url as string) ||
		'https://api.openai.com/v1';

	const openai = new OpenAI({
		baseURL,
		apiKey: credentials.apiKey as string,
		fetchOptions: {
			dispatcher: getProxyAgent(baseURL),
		},
	});
	const { data: models = [] } = await openai.models.list();

	const url = baseURL && new URL(baseURL);
	const isCustomAPI = !!(url && url.hostname !== 'api.openai.com');

	const filteredModels = models.filter((model: { id: string }) => {
		const includeModel = shouldIncludeModel(model.id, isCustomAPI);

		if (!filter) return includeModel;

		return includeModel && model.id.toLowerCase().includes(filter.toLowerCase());
	});

	filteredModels.sort((a, b) => a.id.localeCompare(b.id));

	return {
		results: filteredModels.map((model: { id: string }) => ({
			name: model.id,
			value: model.id,
		})),
	};
}
