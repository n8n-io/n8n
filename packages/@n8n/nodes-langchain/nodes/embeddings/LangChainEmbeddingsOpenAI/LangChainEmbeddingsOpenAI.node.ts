/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { OpenAIEmbeddings, } from 'langchain/embeddings/openai'
import { logWrapper } from '../../../utils/logWrapper';

export class LangChainEmbeddingsOpenAI implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Embeddings OpenAI',
		name: 'langChainEmbeddingsOpenAI',
		icon: 'file:openAi.svg',
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		group: ['transform'],
		version: 1,
		description: 'Embeddings OpenAI',
		defaults: {
			name: 'LangChain - Embeddings OpenAI',
			color: '#412080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['embedding'],
		outputNames: ['Embeddings'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		console.log('Supply data for embeddings')
		const credentials = await this.getCredentials('openAiApi');

		const embeddings = new OpenAIEmbeddings({
			openAIApiKey: credentials.apiKey as string,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
