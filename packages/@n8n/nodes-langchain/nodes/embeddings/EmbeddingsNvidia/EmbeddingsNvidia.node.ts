import type { ClientOptions } from '@langchain/openai';
import { getProxyAgent, logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { NvidiaEmbeddings } from './helpers';
import { DEFAULT_NVIDIA_EMBEDDING_MODEL, searchModels } from './methods/searchModels';
import type { OpenAICompatibleCredential } from '../../../types/types';

export class EmbeddingsNvidia implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'NVIDIA Nemotron Embeddings',
		name: 'embeddingsNvidia',
		icon: { light: 'file:nvidia.svg', dark: 'file:nvidia.dark.svg' },
		group: ['transform'],
		version: [1],
		description:
			'Use NVIDIA NeMo Retriever embedding models from build.nvidia.com or a self-hosted NIM',
		defaults: {
			name: 'NVIDIA Nemotron Embeddings',
		},
		credentials: [
			{
				name: 'nvidiaApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			alias: ['nvidia', 'nemotron', 'nemo', 'embeddings'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsnvidia/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials?.url }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: DEFAULT_NVIDIA_EMBEDDING_MODEL },
				required: true,
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
						placeholder: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
					},
				],
				description:
					'The NeMo Retriever embedding model. Choose from the list, or specify an ID for a self-hosted NIM. input_type is set automatically (passage when indexing, query when searching). <a href="https://build.nvidia.com/models">Learn more</a>.',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Batch Size',
						name: 'batchSize',
						default: 512,
						typeOptions: { maxValue: 2048 },
						description: 'Maximum number of documents to send in each request',
						type: 'number',
					},
					{
						displayName: 'Strip New Lines',
						name: 'stripNewLines',
						default: true,
						description: 'Whether to strip new lines from the input text',
						type: 'boolean',
					},
					{
						displayName: 'Dimensions',
						name: 'dimensions',
						default: undefined,
						description:
							'The number of dimensions the resulting output embeddings should have. Only supported by models with dynamic (Matryoshka) embeddings; leave unset to use the model default.',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: -1,
						description:
							'Maximum amount of time a request is allowed to take in seconds. Set to -1 for no timeout.',
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for NVIDIA Nemotron embeddings');
		const credentials = await this.getCredentials<OpenAICompatibleCredential>('nvidiaApi');

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			batchSize?: number;
			stripNewLines?: boolean;
			dimensions?: number;
			timeout?: number;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		const configuration: ClientOptions = {
			baseURL: credentials.url,
			fetchOptions: {
				dispatcher: getProxyAgent(credentials.url, {}),
			},
		};

		const embeddings = new NvidiaEmbeddings({
			apiKey: credentials.apiKey || 'unused',
			model: modelName,
			...options,
			configuration,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
