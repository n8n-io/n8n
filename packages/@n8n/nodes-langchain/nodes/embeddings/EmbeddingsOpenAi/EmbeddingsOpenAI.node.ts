/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { logWrapper } from '../../../utils/logWrapper';

export class EmbeddingsOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings OpenAI',
		name: 'embeddingsOpenAi',
		icon: 'file:openAi.svg',
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Use Embeddings OpenAI',
		defaults: {
			name: 'Embeddings OpenAI',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['embedding'],
		outputNames: ['Embeddings'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply data for embeddings');
		const credentials = await this.getCredentials('openAiApi');

		const embeddings = new OpenAIEmbeddings({
			openAIApiKey: credentials.apiKey as string,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
