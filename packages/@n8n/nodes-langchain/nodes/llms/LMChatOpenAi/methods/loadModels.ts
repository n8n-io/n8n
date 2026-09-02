import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

import { assertOpenAiCredentialAllowsUrl } from '../../../vendors/OpenAi/helpers/credentials';
import { shouldIncludeModel } from '../../../vendors/OpenAi/helpers/modelFiltering';
import { getProxyAgent } from '@utils/httpProxyAgent';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseUrlOverride = this.getNodeParameter('options.baseURL', '') as string;
	if (baseUrlOverride) {
		assertOpenAiCredentialAllowsUrl(this.getNode(), credentials, baseUrlOverride);
	}
	const baseURL = baseUrlOverride || (credentials.url as string) || 'https://api.openai.com/v1';

	const openai = new OpenAI({
		baseURL,
		apiKey: credentials.apiKey as string,
		fetchOptions: {
			dispatcher: getProxyAgent(baseURL),
		},
	});
	const { data: models = [] } = await openai.models.list();

	const url = baseURL && new URL(baseURL);
	const isCustomAPI = !!(url && !['api.openai.com', 'ai-assistant.n8n.io'].includes(url.hostname));

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
