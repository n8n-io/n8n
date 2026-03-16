import { OpenAIEmbeddings } from '@langchain/openai';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { ClientOptions } from 'openai';

import { checkDomainRestrictions } from '@utils/checkDomainRestrictions';
import { mergeCustomHeaders } from '@utils/helpers';
import { getProxyAgent, logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

const modelParameter: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	description:
		'The model which will generate the embeddings. <a href="https://help.aliyun.com/zh/model-studio/embedding">Learn more</a>.',
	options: [
		{
			name: 'text-embedding-v4',
			value: 'text-embedding-v4',
		},
		{
			name: 'text-embedding-v3',
			value: 'text-embedding-v3',
		},
		{
			name: 'text-embedding-v2',
			value: 'text-embedding-v2',
		},
		{
			name: 'text-embedding-async-v2',
			value: 'text-embedding-async-v2',
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'model',
		},
	},
	default: 'text-embedding-v4',
};

export class EmbeddingsQwen implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Embeddings Qwen',
		name: 'embeddingsQwen',
		icon: { light: 'file:light.svg', dark: 'file:light.dark.svg' },
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Use Embeddings Qwen',
		defaults: {
			name: 'Embeddings Qwen',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://help.aliyun.com/zh/model-studio/embedding',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials.url?.split("/").slice(0,-1).join("/") || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				...modelParameter,
				default: 'text-embedding-v4',
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
						default: 1024,
						description: 'The number of dimensions the resulting output embeddings should have',
						type: 'options',
						options: [
							{
								name: '64',
								value: 64,
							},
							{
								name: '128',
								value: 128,
							},
							{
								name: '256',
								value: 256,
							},
							{
								name: '512',
								value: 512,
							},
							{
								name: '768',
								value: 768,
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
								name: '2048',
								value: 2048,
							},
						],
					},
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
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
						default: 10,
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
					{
						displayName: 'Encoding Format',
						name: 'encodingFormat',
						type: 'options',
						description: 'The format to return the embeddings in',
						default: 'float',
						options: [
							{
								name: 'Float',
								value: 'float',
							},
							{
								name: 'Base64',
								value: 'base64',
							},
						],
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
			encodingFormat?: 'float' | 'base64' | undefined;
		};

		if (options.timeout === -1) {
			options.timeout = undefined;
		}

		const { openAiDefaultHeaders: defaultHeaders } = Container.get(AiConfig);

		const configuration: ClientOptions = {
			defaultHeaders,
		};
		if (options.baseURL) {
			checkDomainRestrictions(this, credentials, options.baseURL);
			configuration.baseURL = options.baseURL;
		} else if (credentials.url) {
			configuration.baseURL = credentials.url as string;
		}

		configuration.fetchOptions = {
			dispatcher: getProxyAgent(
				configuration.baseURL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
				{},
			),
		};

		configuration.defaultHeaders = mergeCustomHeaders(
			credentials,
			(configuration.defaultHeaders ?? {}) as Record<string, string>,
		);

		const embeddings = new OpenAIEmbeddings({
			model: this.getNodeParameter('model', itemIndex, 'text-embedding-3-small') as string,
			apiKey: credentials.apiKey as string,
			...options,
			configuration,
		});

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
