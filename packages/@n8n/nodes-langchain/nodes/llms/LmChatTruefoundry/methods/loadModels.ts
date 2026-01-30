import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import OpenAI from 'openai';

import { getProxyAgent } from '@utils/httpProxyAgent';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('truefoundryAiGatewayApi');
	const baseURL = credentials.url as string;

	const openaiConfig: ConstructorParameters<typeof OpenAI>[0] = {
		baseURL,
		apiKey: credentials.apiKey as string,
		fetchOptions: {
			dispatcher: getProxyAgent(baseURL),
		},
	};

	// Add custom headers if configured in credentials
	if (
		credentials.header &&
		typeof credentials.headerName === 'string' &&
		credentials.headerName &&
		typeof credentials.headerValue === 'string'
	) {
		openaiConfig.defaultHeaders = {
			[credentials.headerName]: credentials.headerValue,
		};
	}

	const openai = new OpenAI(openaiConfig);
	const { data: models = [] } = await openai.models.list();

	// For TrueFoundry, we include all models (it's a custom API)
	const filteredModels = models.filter((model: { id: string }) => {
		if (!filter) return true;
		return model.id.toLowerCase().includes(filter.toLowerCase());
	});

	filteredModels.sort((a, b) => a.id.localeCompare(b.id));

	return {
		results: filteredModels.map((model: { id: string }) => ({
			name: model.id,
			value: model.id,
		})),
	};
}
