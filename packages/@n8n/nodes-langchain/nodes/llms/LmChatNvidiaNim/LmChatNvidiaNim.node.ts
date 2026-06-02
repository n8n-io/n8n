import { ChatOpenAI } from '@langchain/openai';
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
import { N8nLlmTracing } from '@n8n/nodes-langchain/utils/tracing';
import { makeN8nLlmFailedAttemptHandler } from '@n8n/nodes-langchain/utils/failedAttemptHandler';

export class LmChatNvidiaNim implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NVIDIA NIM Chat Model',
		name: 'lmChatNvidiaNim',
		icon: 'file:nvidia-nim.svg',
		group: ['transform'],
		version: 1,
		description: 'Language model provider for NVIDIA NIM GPU-accelerated inference',
		defaults: {
			name: 'NVIDIA NIM Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Chat Models'],
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
		inputs: ['ai_languageModel'],
		outputs: ['ai_languageModel'],
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
				default: { mode: 'id', value: 'meta/llama-3.1-8b-instruct' },
				description: 'The NVIDIA NIM model to use',
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
						placeholder: 'e.g. meta/llama-3.1-8b-instruct',
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
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						typeOptions: { minValue: -2, maxValue: 2 },
						default: 0,
						description: 'Positive values penalize new tokens based on their existing frequency in the text so far',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 1024,
						description: 'The maximum number of tokens to generate',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						typeOptions: { minValue: -2, maxValue: 2 },
						default: 0,
						description: 'Positive values penalize new tokens based on whether they appear in the text so far',
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						options: [
							{ name: 'Text', value: 'text' },
							{ name: 'JSON Object', value: 'json_object' },
						],
						default: 'text',
						description: 'The format of the response from the model',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 0,
						description: 'If specified, the system will make a best effort to sample deterministically',
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 2 },
						default: 0.7,
						description: 'Controls randomness: Lowering results in less random completions',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 1 },
						default: 1,
						description: 'Controls diversity via nucleus sampling',
					},
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
						// Filter out embeddings and rerank models to only show chat models in this node
						.filter((model) => !model.id.includes('embed') && !model.id.includes('rerank'))
						.map((model) => ({
							name: model.id,
							value: model.id,
						})),
				};
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions): Promise<ChatOpenAI> {
		const credentials = await this.getCredentials('nvidiaNimApi');
		const modelName = this.getNodeParameter('model', 0, { extractValue: true }) as string;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		const baseUrl = (credentials.baseUrl as string) || 'https://integrate.api.nvidia.com/v1';

		const model = new ChatOpenAI({
			openAIApiKey: credentials.apiKey as string,
			modelName,
			temperature: options.temperature as number,
			maxTokens: options.maxTokens as number,
			topP: options.topP as number,
			frequencyPenalty: options.frequencyPenalty as number,
			presencePenalty: options.presencePenalty as number,
			timeout: options.timeout as number,
			maxRetries: options.maxRetries as number,
			configuration: {
				baseURL: baseUrl.replace(/\/$/, ''),
			},
			modelKwargs: {
				seed: options.seed as number,
				response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
			},
			callbacks: [new N8nLlmTracing(this)],
			httpAgent: getProxyAgent(this),
		});

		model.caller.onFailedAttempt = makeN8nLlmFailedAttemptHandler(this);

		return model;
	}
}
