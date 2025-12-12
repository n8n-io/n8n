import { CohereRerank } from '@langchain/cohere';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

export class RerankerCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reranker Cohere',
		name: 'rerankerCohere',
		icon: { light: 'file:cohere.svg', dark: 'file:cohere.dark.svg' },
		group: ['transform'],
		version: 1,
		description:
			'Use Cohere Reranker to reorder documents after retrieval from a vector store by relevance to the given query.',
		defaults: {
			name: 'Reranker Cohere',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.host }}',
		},
		credentials: [
			{
				name: 'cohereApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Rerankers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.rerankercohere/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiReranker],
		outputNames: ['Reranker'],
		properties: [
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model that should be used to rerank the documents. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
				default: 'rerank-v3.5',
				options: [
					{
						name: 'rerank-v3.5',
						value: 'rerank-v3.5',
					},
					{
						name: 'rerank-english-v3.0',
						value: 'rerank-english-v3.0',
					},
					{
						name: 'rerank-multilingual-v3.0',
						value: 'rerank-multilingual-v3.0',
					},
				],
			},
			{
				displayName: 'Top N',
				name: 'topN',
				type: 'number',
				description: 'The maximum number of documents to return after reranking',
				default: 3,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for reranking Cohere');
		const modelName = this.getNodeParameter('modelName', itemIndex, 'rerank-v3.5') as string;
		const topN = this.getNodeParameter('topN', itemIndex, 3) as number;
		const credentials = await this.getCredentials<{ apiKey: string }>('cohereApi');

		const reranker = new CohereRerank({
			apiKey: credentials.apiKey,
			model: modelName,
			topN,
		});

		return {
			response: logWrapper(reranker, this),
		};
	}
}
