/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { OpenAIEmbeddings } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	type ISupplyDataFunctions,
	type INodeProperties,
} from 'n8n-workflow';
import type { ClientOptions } from 'openai';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

const modelParameter: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	description:
		'The model which will generate the embeddings. <a href="https://platform.openai.com/docs/models/overview">Learn more</a>.',
	typeOptions: {
		loadOptions: {
			routing: {
				request: {
					method: 'GET',
					url: '={{ $parameter.options?.baseURL?.split("/").slice(-1).pop() || $credentials?.url?.split("/").slice(-1).pop() || "v1" }}/models',
				},
				output: {
					postReceive: [
						{
							type: 'rootProperty',
							properties: {
								property: 'data',
							},
						},
						{
							type: 'filter',
							properties: {
								pass: "={{ $responseItem.id.includes('embed') }}",
							},
						},
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.id}}',
								value: '={{$responseItem.id}}',
							},
						},
						{
							type: 'sort',
							properties: {
								key: 'name',
							},
						},
					],
				},
			},
		},
	},
	routing: {
		send: {
			type: 'body',
			property: 'model',
		},
	},
	default: 'text-embedding-3-small',
};

export class EmbeddingsOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings OpenAI',
		name: 'embeddingsOpenAi',
		icon: { light: 'file:openAiLight.svg', dark: 'file:openAiLight.dark.svg' },
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Use Embeddings OpenAI',
		defaults: {
			name: 'Embeddings OpenAI',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.embeddingsopenai/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials.url?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				...modelParameter,
				default: 'text-embedding-ada-002',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				...modelParameter,
				displayOptions: {
					hide: {
						'@version': [1],
					},
				},
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
						displayName: 'Dimensions',
						name: 'dimensions',
						default: undefined,
						description:
							'The number of dimensions the resulting output embeddings should have. Only supported in text-embedding-3 and later models.',
						type: 'options',
						options: [
							{
								name: '256',
								value: 256,
							},
							{
								name: '512',
								value: 512,
							},
							{
								name: '1024',
								value: 1024,
							},
							{
								name: '1536',
								value: 1536,
							},
							{
								name: '3072',
								value: 3072,
							},
						],
					},
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://api.openai.com/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
						displayOptions: {
							hide: {
								'@version': [{ _cnd: { gte: 1.2 } }],
							},
						},
					},
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
		this.logger.debug('Supply data for embeddings');
		const credentials = await this.getCredentials('openAiApi');

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			baseURL?: string;
			batchSize?: number;
			stripNewLines?: boolean;
			timeout?: number;
			dimensions?: number | undefined;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		const configuration: ClientOptions = {};
		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		} else if (credentials.url) {
			configuration.baseURL = credentials.url as string;
		}

		const embeddings = new OpenAIEmbeddings({
			modelName: this.getNodeParameter('model', itemIndex, 'text-embedding-3-small') as string,
			openAIApiKey: credentials.apiKey as string,
			...options,
			configuration,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
