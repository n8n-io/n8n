import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';
import { getConnectionHintNoticeField } from '@utils/sharedFields';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

type LmRegoloOptions = {
	baseURL?: string;
	frequencyPenalty?: number;
	maxTokens?: number;
	presencePenalty?: number;
	temperature?: number;
	timeout?: number;
	maxRetries?: number;
	topP?: number;
	responseFormat?: 'text' | 'json_object';
};

export class LmChatRegoloAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Regolo AI Chat Model',
		name: 'lmChatRegoloAi',
		icon: { light: 'file:regoloAiLight.svg', dark: 'file:regoloAiLight.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain (LangChain provider for Regolo)',
		defaults: { name: 'Regolo AI Chat Model' },
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [{ url: 'https://docs.regolo.ai/' }],
			},
		},

		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],

		credentials: [{ name: 'regoloApi', required: true }],

		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || $credentials?.url?.split("/").slice(0,-1).join("/") || "https://api.regolo.ai" }}',
		},

		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),

			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'Llama-3.3-70B-Instruct' },
				required: true,
				description: 'The model. Choose from the list, or specify an ID.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
						placeholder: 'Select a model…',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. Llama-3.3-70B-Instruct',
					},
				],
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
						displayName: 'Base URL',
						name: 'baseURL',
						type: 'string',
						default: 'https://api.regolo.ai/v1',
						description: 'Override the default base URL for the Regolo API',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description: 'Controls randomness',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description: 'Nucleus sampling',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						type: 'number',
						default: -1,
						typeOptions: { maxValue: 32768 },
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						default: 'text',
						options: [
							{ name: 'Text', value: 'text', description: 'Regular text response' },
							{ name: 'JSON', value: 'json_object', description: 'Force JSON output' },
						],
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 60000,
						description: 'Max request time in ms',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						description: 'Maximum number of retries to attempt',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async searchModels(this: ILoadOptionsFunctions) {
				const results: Array<{ name: string; value: string }> = [];

				const options = (this.getNodeParameter('options', {}, {}) || {}) as LmRegoloOptions;

				let modelsUrl = 'https://api.regolo.ai/v1/models';
				if (options.baseURL) {
					const trimmed = options.baseURL.replace(/\/+$/, '');
					modelsUrl = `${trimmed}/models`;
				}

				const response = (await this.helpers.requestWithAuthentication.call(this, 'regoloApi', {
					method: 'GET',
					uri: modelsUrl,
					json: true,
				})) as { data?: Array<{ id: string }> } | Array<{ id: string }>;

				const list = Array.isArray(response) ? response : (response?.data ?? []);

				for (const m of list) {
					if (!m?.id) continue;

					results.push({ name: m.id, value: m.id });
				}

				results.sort((a, b) => a.name.localeCompare(b.name));

				return { results };
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('regoloApi');

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as LmRegoloOptions;

		const configuration: ClientOptions = {};

		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		} else if (credentials.url) {
			configuration.baseURL = credentials.url as string;
		}

		if (configuration.baseURL) {
			configuration.fetchOptions = {
				dispatcher: getProxyAgent(configuration.baseURL ?? 'https://api.regolo.ai/v1'),
			};
		}

		const modelKwargs: { response_format?: object } = {};
		if (options.responseFormat) {
			modelKwargs.response_format = { type: options.responseFormat };
		}

		const model = new ChatOpenAI({
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature,
			topP: options.topP,
			presencePenalty: options.presencePenalty,
			frequencyPenalty: options.frequencyPenalty,
			maxTokens: options.maxTokens,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return { response: model };
	}
}
