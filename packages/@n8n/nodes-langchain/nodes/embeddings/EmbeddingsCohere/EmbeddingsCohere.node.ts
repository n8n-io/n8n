import { CohereEmbeddings } from '@langchain/cohere';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

import { getRequiredApiKey } from '@utils/helpers';

import { EMBEDDING_MODELS, searchModels } from './methods/searchModels';

export class EmbeddingsCohere implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Embeddings Cohere',
		name: 'embeddingsCohere',
		icon: { light: 'file:cohere.svg', dark: 'file:cohere.dark.svg' },
		group: ['transform'],
		version: [1, 2],
		description: 'Use Cohere Embeddings',
		defaults: {
			name: 'Embeddings Cohere',
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
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingscohere/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName:
					'Each model is using different dimensional density for embeddings. Please make sure to use the same dimensionality for your vector store. The default model is using 768-dimensional embeddings.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model which will generate the embeddings. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
				default: 'embed-english-v2.0',
				options: EMBEDDING_MODELS,
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
				default: { mode: 'list', value: 'embed-english-v2.0' },
				required: true,
				description:
					'The model which will generate the embeddings. RAG query and document input types are applied automatically by the Cohere integration. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. <a href="https://docs.cohere.com/docs/models">Learn more</a>.',
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
						placeholder: 'embed-v4.0',
					},
				],
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for embeddings Cohere');
		const modelName = this.getNodeParameter('modelName', itemIndex, 'embed-english-v2.0', {
			extractValue: true,
		}) as string;
		const credentials = await this.getCredentials<{ apiKey: string }>('cohereApi');
		const embeddings = new CohereEmbeddings({
			apiKey: getRequiredApiKey(this.getNode(), credentials.apiKey),
			model: modelName,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
