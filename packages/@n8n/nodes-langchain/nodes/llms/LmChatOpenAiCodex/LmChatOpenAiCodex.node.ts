import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';

/** Shape written by the Codex OAuth connect flow. */
interface CodexCredential {
	accessToken?: string;
	accountId?: string;
	residency?: string;
	url?: string;
}

const CODEX_ORIGINATOR = 'codex_cli_rs';

export class LmChatOpenAiCodex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Codex Chat Model',

		name: 'lmChatOpenAiCodex',
		icon: { light: 'file:openAiCodex.svg', dark: 'file:openAiCodex.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'Chat with Codex using a ChatGPT subscription',
		defaults: {
			name: 'OpenAI Codex Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openAiCodexOAuthApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'Codex is reached through a ChatGPT subscription rather than the OpenAI API, so it only serves chat completions — not embeddings or image generation. Which models you can use depends on your plan.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'gpt-5.6-sol',
				description:
					'The Codex model to use. Availability follows your ChatGPT plan, and the line-up changes faster than n8n releases.',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
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
							maxValue: 128000,
						},
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls the randomness of the sampling process. A higher temperature creates more diverse sampling, but increases the risk of hallucinations.',
						type: 'number',
					},
					{
						// Codex models are reasoning models, so unlike the OpenAI node this
						// is offered unconditionally rather than gated on the model name.
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						default: 'medium',
						description:
							'Controls the amount of reasoning tokens to use. A value of "low" will favor speed and economical token usage, "high" will favor more complete reasoning at the cost of more tokens generated and slower responses.',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
								description: 'Favors speed and economical token usage',
							},
							{
								name: 'Medium',
								value: 'medium',
								description: 'Balance between speed and reasoning accuracy',
							},
							{
								name: 'High',
								value: 'high',
								description:
									'Favors more complete reasoning at the cost of more tokens generated and slower responses',
							},
						],
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 360000,
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<CodexCredential>('openAiCodexOAuthApi');

		if (!credentials.accessToken) {
			throw new NodeOperationError(
				this.getNode(),
				'This Codex credential is not connected yet. Open it and sign in with your ChatGPT account.',
			);
		}

		const modelName = this.getNodeParameter('model', itemIndex) as string;

		const { reasoningEffort, ...options } = this.getNodeParameter('options', itemIndex, {}) as {
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			temperature?: number;
			topP?: number;
			reasoningEffort?: string;
		};

		const timeout = options.timeout ?? 360000;
		const baseURL = credentials.url ?? 'https://chatgpt.com/backend-api/codex';

		const configuration: ClientOptions = {
			baseURL,
			// Codex refuses an unrecognized originator, and answers 401 without the
			// account header (or the residency one, on workspaces that enforce it).
			defaultHeaders: {
				'chatgpt-account-id': credentials.accountId ?? '',
				originator: CODEX_ORIGINATOR,
				'OpenAI-Beta': 'responses=experimental',
				...(credentials.residency
					? { 'x-openai-internal-codex-residency': credentials.residency }
					: {}),
			},
			fetchOptions: {
				dispatcher: getProxyAgent(baseURL, {
					headersTimeout: timeout,
					bodyTimeout: timeout,
				}),
			},
		};

		const model = new ChatOpenAI({
			apiKey: credentials.accessToken,
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			// Codex serves the Responses API only, and rejects a stored response.
			useResponsesApi: true,
			modelKwargs: {
				store: false,
				...(reasoningEffort && ['low', 'medium', 'high'].includes(reasoningEffort)
					? { reasoning_effort: reasoningEffort }
					: {}),
			},
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return {
			response: model,
		};
	}
}
