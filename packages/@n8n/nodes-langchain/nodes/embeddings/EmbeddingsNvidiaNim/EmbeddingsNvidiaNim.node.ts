import { OpenAIEmbeddings } from '@langchain/openai';
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { getProxyAgent } from '@n8n/nodes-langchain/utils/proxy';

export class EmbeddingsNvidiaNim implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NVIDIA NIM Embeddings',
		name: 'embeddingsNvidiaNim',
		icon: 'file:nvidia-nim.svg',
		group: ['transform'],
		version: 1,
		description: 'Embeddings model provider for NVIDIA NIM GPU-accelerated inference',
		defaults: {
			name: 'NVIDIA NIM Embeddings',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.nvidia.com/nim/index.html',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['ai_embedding'],
		outputs: ['ai_embedding'],
		credentials: [
			{
				name: 'nvidiaNimApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{$credentials.baseUrl.replace(/\/$/, "")}}',
		},
		properties: [
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'id', value: 'nvidia/llama-3.2-nv-embedqa-1b-v2' },
				description: 'The NVIDIA NIM embeddings model to use',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'getModels',
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. nvidia/llama-3.2-nv-embedqa-1b-v2',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				properties: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 60000,
						description: 'The maximum time in milliseconds to wait for a response',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						typeOptions: { minValue: 0 },
						default: 2,
						description: 'The maximum number of times to retry a failed request',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('nvidiaNimApi');
				const baseUrl = (credentials.baseUrl as string) || 'https://integrate.api.nvidia.com/v1';
				const response = await this.helpers.requestWithAuthentication.call(this, 'nvidiaNimApi', {
					method: 'GET',
					uri: `${baseUrl.replace(/\/$/, '')}/models`,
					json: true,
				});

				return {
					results: (response.data as Array<{ id: string }>)
						.filter((model) => model.id.includes('embed'))
						.map((model) => ({
							name: model.id,
							value: model.id,
						})),
				};
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions): Promise<OpenAIEmbeddings> {
		const credentials = await this.getCredentials('nvidiaNimApi');
		const modelName = this.getNodeParameter('model', 0, { extractValue: true }) as string;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		const baseUrl = (credentials.baseUrl as string) || 'https://integrate.api.nvidia.com/v1';

		const model = new OpenAIEmbeddings({
			openAIApiKey: credentials.apiKey as string,
			modelName,
			timeout: options.timeout as number,
			maxRetries: options.maxRetries as number,
			configuration: {
				baseURL: baseUrl.replace(/\/$/, ''),
			},
			httpAgent: getProxyAgent(this),
		});

		return model;
	}
}
