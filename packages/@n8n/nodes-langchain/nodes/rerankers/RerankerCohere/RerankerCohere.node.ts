import { CohereRerank } from '@langchain/cohere';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@n8n/ai-utilities';

import { getRequiredApiKey } from '@utils/helpers';

import { searchModels } from './methods/searchModels';

export class RerankerCohere implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Reranker Cohere',
		name: 'rerankerCohere',
		icon: { light: 'file:cohere.svg', dark: 'file:cohere.dark.svg' },
		group: ['transform'],
		version: [1, 2],
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
				// rerank-v3.5 is the default and must stay the first option, so the
				// dropdown's first entry matches the default (backward compatibility).
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
					{
						name: 'rerank-v4.0-pro',
						value: 'rerank-v4.0-pro',
					},
					{
						name: 'rerank-v4.0-fast',
						value: 'rerank-v4.0-fast',
					},
				],
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'rerank-v3.5' },
				required: true,
				description:
					'The model that should be used to rerank the documents. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'rerank-v4.0-pro',
					},
				],
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
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
		const modelName = this.getNodeParameter('modelName', itemIndex, 'rerank-v3.5', {
			extractValue: true,
		}) as string;
		const topN = this.getNodeParameter('topN', itemIndex, 3) as number;
		const credentials = await this.getCredentials<{ apiKey: string }>('cohereApi');

		const reranker = new CohereRerank({
			apiKey: getRequiredApiKey(this.getNode(), credentials.apiKey),
			model: modelName,
			topN,
		});

		return {
			response: logWrapper(reranker, this),
		};
	}
}
