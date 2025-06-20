/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { OpenAI, type ClientOptions } from '@langchain/openai';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { getHttpProxyAgent } from '@utils/httpProxyAgent';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

type LmOpenAiOptions = {
	baseURL?: string;
	frequencyPenalty?: number;
	maxTokens?: number;
	presencePenalty?: number;
	temperature?: number;
	timeout?: number;
	maxRetries?: number;
	topP?: number;
};

export class LmOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmOpenAi',
		hidden: true,
		icon: { light: 'file:openAiLight.svg', dark: 'file:openAiLight.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'OpenAI Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Text Completion Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmopenai/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: [
			{
				displayName:
					'This node is using OpenAI completions which are now deprecated. Please use the OpenAI Chat Model node instead.',
				name: 'deprecated',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: 'gpt-3.5-turbo-instruct' },
				required: true,
				description:
					'The model which will generate the completion. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'openAiModelSearch',
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
						value: '={{$parameter.model.value}}',
					},
				},
			},
			{
				displayName:
					'When using non OpenAI models via Base URL override, not all models might be chat-compatible or support other features, like tools calling or JSON response format.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.baseURL': [{ _cnd: { exists: true } }],
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
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://api.openai.com/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description:
							'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
						type: 'number',
						typeOptions: {
							maxValue: 32768,
						},
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
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
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async openAiModelSearch(this: ILoadOptionsFunctions) {
				const results = [];

				const options = this.getNodeParameter('options', {}) as LmOpenAiOptions;

				let uri = 'https://api.openai.com/v1/models';

				if (options.baseURL) {
					uri = `${options.baseURL}/models`;
				}

				const { data } = (await this.helpers.requestWithAuthentication.call(this, 'openAiApi', {
					method: 'GET',
					uri,
					json: true,
				})) as { data: Array<{ owned_by: string; id: string }> };

				for (const model of data) {
					if (!options.baseURL && !model.owned_by?.startsWith('system')) continue;
					results.push({
						name: model.id,
						value: model.id,
					});
				}

				return { results };
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('openAiApi');

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			baseURL?: string;
			frequencyPenalty?: number;
			maxTokens?: number;
			presencePenalty?: number;
			temperature?: number;
			timeout?: number;
			maxRetries?: number;
			topP?: number;
		};

		const configuration: ClientOptions = {
			httpAgent: getHttpProxyAgent(),
		};
		if (options.baseURL) {
			configuration.baseURL = options.baseURL;
		}

		const model = new OpenAI({
			openAIApiKey: credentials.apiKey as string,
			model: modelName,
			...options,
			configuration,
			timeout: options.timeout ?? 60000,
			maxRetries: options.maxRetries ?? 2,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
