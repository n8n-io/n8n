import { ChatOpenAI } from '@langchain/openai';
import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import OpenAI, { type ClientOptions } from 'openai';

import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';
import { LmChatOpenAi } from '../LMChatOpenAi/LmChatOpenAi.node';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

type DeepSeekCredential = {
	url: string;
	apiKey: string;
};

export class LmChatDeepSeek extends LmChatOpenAi {
	methods = {
		listSearch: {
			async searchModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials<DeepSeekCredential>('deepseekApi');

				const openai = new OpenAI({
					baseURL: credentials.url,
					apiKey: credentials.apiKey,
				});
				const { data: models = [] } = await openai.models.list();

				const filteredModels = !filter
					? models
					: models.filter((model: { id: string }) =>
							model.id.toLowerCase().includes(filter.toLowerCase()),
						);

				return {
					results: filteredModels.map(({ id }) => ({ name: id, value: id })),
				};
			},
		},
	};

	description: INodeTypeDescription = {
		...this.description,
		displayName: 'DeepSeek Chat Model',
		name: 'lmChatDeepSeek',
		icon: 'file:deepseek.svg',
		iconColor: 'light-blue',
		defaults: {
			name: 'DeepSeek Chat Model',
		},
		credentials: [{ name: 'deepseekApi', required: true }],
		version: [1.2],
		requestDefaults: {
			baseURL: '={{ $credentials?.url?.split("/").slice(0,-1).join("/") }}',
		},
	};

	constructor() {
		super();

		this.description.properties = this.description.properties.filter((property) => {
			if (property.name === 'model') {
				property.default = 'deepseek-chat';
			}
			return ['model', 'options'].includes(property.name);
		});
	}

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<DeepSeekCredential>('deepseekApi');
		const modelName = this.getNodeParameter('model.value', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
		};

		const configuration: ClientOptions = {
			baseURL: credentials.url,
		};

		const model = new ChatOpenAI({
			openAIApiKey: credentials.apiKey,
			modelName,
			...options,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: options.responseFormat
				? {
						response_format: { type: options.responseFormat },
					}
				: undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return { response: model };
	}
}
