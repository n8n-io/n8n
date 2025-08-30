import { OpenAI, type ClientOptions } from '@langchain/openai';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

type LmRegoloAiOptions = {
	baseURL?: string;
	frequencyPenalty?: number;
	maxTokens?: number;
	presencePenalty?: number;
	temperature?: number;
	timeout?: number;
	maxRetries?: number;
	topP?: number;
};

export class LmRegoloAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Regolo AI Model',
		name: 'LmRegoloAi',
		hidden: true,
		icon: { light: 'file:regoloAiLight.svg', dark: 'file:regoloAiLight.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: { name: 'Regolo AI Model' },
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Text Completion Models'],
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
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || "https://api.regolo.ai" }}',
		},

		properties: [
			{
				displayName:
					'This node uses text completions (legacy). Prefer the Chat Model when possible.',
				name: 'deprecated',
				type: 'notice',
				default: '',
			},

			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The model which will generate the completion.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'regoloModelSearch',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'model',
						value: '={{ $parameter.model.value }}',
					},
				},
			},

			{
				displayName:
					'When using Base URL override, ensure the selected model supports text completions.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { '/options.baseURL': [{ _cnd: { exists: true } }] } },
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
						default: 'https://api.regolo.ai/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description: 'Penalize frequent tokens to reduce verbatim repetition',
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description: 'Maximum tokens to generate in the completion',
						type: 'number',
						typeOptions: { maxValue: 32768 },
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description: 'Encourage the model to talk about new topics',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description: 'Controls randomness',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum request time in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description: 'Nucleus sampling',
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async regoloModelSearch(this: ILoadOptionsFunctions) {
				const opts = (await this.getNodeParameter('options', 0, {})) as LmRegoloAiOptions;

				const effectiveBase = (opts.baseURL || 'https://api.regolo.ai/v1').replace(/\/+$/, '');

				const urlPath = effectiveBase.endsWith('/v1') ? '/model/info' : '/v1/model/info';

				const response: any = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'regoloApi',
					{
						method: 'GET',
						baseURL: effectiveBase,
						url: urlPath,
					},
				);

				const arr = Array.isArray(response?.data)
					? response.data
					: Array.isArray(response)
						? response
						: [];

				const isTextModel = (m: any) => {
					const mode = String(m?.model_info?.mode || '').toLowerCase();
					return mode === 'chat' || mode === 'completion' || mode === 'text';
				};

				const results = arr
					.filter(isTextModel)
					.map((m: any) => {
						const id = m?.model_name ?? m?.id ?? '';
						return { name: id, value: id };
					})
					.filter((x: any) => x.value)
					.sort((a: any, b: any) => a.name.localeCompare(b.name));

				return { results };
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('regoloApi');

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as LmRegoloAiOptions;

		const configuration: ClientOptions = {
			fetchOptions: {
				dispatcher: getProxyAgent(options.baseURL ?? 'https://api.regolo.ai/v1'),
			},
		};

		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		}

		const model = new OpenAI({
			apiKey: credentials.apiKey as string,
			model: modelName,
			...options,
			configuration,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return { response: model };
	}
}
