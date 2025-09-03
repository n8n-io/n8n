import { OpenAIEmbeddings } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { lemonadeDescription, lemonadeModel } from '../../llms/LMLemonade/description';

export class EmbeddingsLemonade implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Lemonade',
		name: 'embeddingsLemonade',
		icon: 'file:lemonade.svg',
		group: ['transform'],
		version: 1,
		description: 'Use Lemonade Embeddings',
		defaults: {
			name: 'Embeddings Lemonade',
		},
		...lemonadeDescription,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingslemonade/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]), lemonadeModel],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings Lemonade');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const credentials = await this.getCredentials('lemonadeApi');

		// Ensure we have an API key for OpenAI client validation
		const apiKey = credentials.apiKey || 'lemonade-placeholder-key';

		// Build configuration with explicit apiKey
		const config: any = {
			apiKey,
			modelName,
			configuration: {
				baseURL: credentials.baseUrl as string,
			},
		};

		// Add custom headers if API key is provided
		if (credentials.apiKey) {
			config.configuration.defaultHeaders = {
				Authorization: `Bearer ${credentials.apiKey as string}`,
			};
		}

		const embeddings = new OpenAIEmbeddings(config);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
