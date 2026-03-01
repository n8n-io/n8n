import { OpenAIEmbeddings } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import type { LemonadeApiCredentialsType } from '../../../credentials/LemonadeApi.credentials';

import { logWrapper } from '@n8n/ai-utilities';
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
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const credentials = (await this.getCredentials('lemonadeApi')) as LemonadeApiCredentialsType;

		// Ensure we have an API key for OpenAI client validation
		const apiKey = credentials.apiKey || 'lemonade-placeholder-key';

		// Build configuration object separately like official OpenAI nodes
		const configuration: any = {
			baseURL: credentials.baseUrl,
		};

		// Add custom headers if API key is provided
		if (credentials.apiKey) {
			configuration.defaultHeaders = {
				Authorization: `Bearer ${credentials.apiKey}`,
			};
		}

		const embeddings = new OpenAIEmbeddings({
			apiKey,
			model: modelName,
			configuration,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
