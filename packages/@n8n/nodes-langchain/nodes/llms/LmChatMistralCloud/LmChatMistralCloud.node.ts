import type { ChatMistralAIInput } from '@langchain/mistralai';
import { ChatMistralAI } from '@langchain/mistralai';
import { HTTPClient } from '@mistralai/mistralai/lib/http.js';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, proxyFetch } from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

const deprecatedMagistralModelsWithTextOutput = ['magistral-small-2506', 'magistral-medium-2506'];

export class LmChatMistralCloud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mistral Cloud Chat Model',

		name: 'lmChatMistralCloud',
		icon: 'file:mistral.svg',
		group: ['transform'],
		version: 1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Mistral Cloud Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatmistralcloud/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'mistralCloudApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: 'https://api.mistral.ai/v1',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://docs.mistral.ai/platform/endpoints/">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/models',
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
											pass: "={{ !$responseItem.id.includes('embed') }}",
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{ $responseItem.id }}',
											value: '={{ $responseItem.id }}',
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
				default: 'mistral-small',
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
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
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
					{
						displayName: 'Enable Safe Mode',
						name: 'safeMode',
						default: false,
						type: 'boolean',
						description: 'Whether to inject a safety prompt before all conversations',
					},
					{
						displayName: 'Random Seed',
						name: 'randomSeed',
						default: undefined,
						type: 'number',
						description:
							'The seed to use for random sampling. If set, different calls will generate deterministic results.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('mistralCloudApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {
			maxRetries: 2,
			topP: 1,
			temperature: 0.7,
			maxTokens: -1,
			safeMode: false,
			randomSeed: undefined,
		}) as Partial<ChatMistralAIInput>;

		const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) =>
			await proxyFetch(input, init, {});
		const httpClient = new HTTPClient({ fetcher: fetchWithTimeout });

		const model = new ChatMistralAI({
			apiKey: credentials.apiKey as string,
			model: modelName,
			...options,
			httpClient,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
			metadata: {
				output_format: isModelWithJSONOutput(modelName) ? 'json' : undefined,
			},
		});

		return {
			response: model,
		};
	}
}

function isModelWithJSONOutput(modelName: string): boolean {
	if (!modelName.includes('magistral')) {
		return false;
	}

	if (deprecatedMagistralModelsWithTextOutput.includes(modelName)) {
		// Deprecated Magistral models return text output
		// Includes <think></think> chunks as part of text content
		return false;
	}

	// All future Magistral models will return JSON output
	// Which include "thinking" json types
	// https://docs.mistral.ai/capabilities/reasoning/
	return true;
}
