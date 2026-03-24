import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type ILoadOptionsFunctions,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';

interface OpenAIToolCall {
	function?: { arguments?: unknown };
}

interface OpenAIChoice {
	message?: { tool_calls?: OpenAIToolCall[] };
}

function isOpenAIResponseWithChoices(json: unknown): json is { choices: OpenAIChoice[] } {
	return (
		typeof json === 'object' &&
		json !== null &&
		'choices' in json &&
		Array.isArray((json as { choices: unknown }).choices)
	);
}

/**
 * Wraps fetch to fix empty tool call arguments in OpenRouter API responses.
 *
 * When Anthropic models are accessed through OpenRouter, tool calls for tools
 * with no parameters return empty string arguments ("") instead of "{}".
 * LangChain's parseToolCall does JSON.parse("") which throws, breaking the agent.
 * This wrapper normalizes empty arguments to "{}" before LangChain sees them.
 */
function createOpenRouterFetch(baseFetch: typeof globalThis.fetch): typeof globalThis.fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);

		const contentType = response.headers.get('content-type') ?? '';
		if (!contentType.includes('json')) return response;

		const clone = response.clone();
		const json: unknown = await response.json();

		if (!isOpenAIResponseWithChoices(json)) return clone;

		const isInvalidArgs = (args: unknown): boolean => typeof args !== 'string' || !args.trim();

		const toolCallsToFix = json.choices
			.flatMap((choice) => choice.message?.tool_calls ?? [])
			.filter((tc) => tc.function && isInvalidArgs(tc.function.arguments));

		if (toolCallsToFix.length === 0) return clone;

		for (const tc of toolCallsToFix) {
			if (!tc.function) continue;
			const { arguments: args } = tc.function;
			const isPlainObject = typeof args === 'object' && args !== null && !Array.isArray(args);
			tc.function.arguments = isPlainObject ? JSON.stringify(args) : '{}';
		}

		const body = JSON.stringify(json);
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: { 'content-type': contentType },
		});
	};
}

const FALLBACK_MODEL = 'openai/gpt-4.1-nano';
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

function getGatewayConfig() {
	return {
		apiKey: process.env.N8N_AI_GATEWAY_OPENROUTER_API_KEY ?? '',
		baseUrl: process.env.N8N_AI_GATEWAY_OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL,
	};
}

export class LmChatN8nAiGateway implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Gateway',
		name: 'lmChatN8nAiGateway',
		icon: { light: 'file:n8nAiGateway.svg', dark: 'file:n8nAiGateway.svg' },
		group: ['transform'],
		version: [1],
		description: 'Access hundreds of models through one unified gateway',
		subtitle: '={{$parameter["model"]}}',
		defaults: {
			name: 'AI Gateway',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatn8naigateway/',
					},
				],
			},
		},

		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				default: FALLBACK_MODEL,
				description: 'The model which will generate the completion',
				typeOptions: {
					isModelSelector: true,
					loadOptionsMethod: 'getModels',
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
						displayName: 'Response Format',
						name: 'responseFormat',
						default: 'text',
						type: 'options',
						options: [
							{
								name: 'Text',
								value: 'text',
								description: 'Regular text response',
							},
							{
								name: 'JSON',
								value: 'json_object',
								description:
									'Enables JSON mode, which should guarantee the message the model generates is valid JSON',
							},
						],
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
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
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

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { apiKey, baseUrl } = getGatewayConfig();
				const response = await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}/models`,
					headers: { Authorization: `Bearer ${apiKey}` },
					json: true,
				});

				interface OpenRouterModel {
					id: string;
					name?: string;
					pricing?: { prompt?: string; completion?: string };
					context_length?: number;
					architecture?: { input_modalities?: string[] };
					supported_parameters?: string[];
				}

				const models = (response?.data ?? []) as OpenRouterModel[];
				return models
					.map((m) => {
						const promptPrice = parseFloat(m.pricing?.prompt ?? '0');
						const completionPrice = parseFloat(m.pricing?.completion ?? '0');
						const inputModalities = m.architecture?.input_modalities ?? [];
						const supportedParams = m.supported_parameters ?? [];

						const meta = {
							inputCost: promptPrice * 1_000_000,
							outputCost: completionPrice * 1_000_000,
							contextLength: m.context_length ?? 0,
							capabilities: {
								vision: inputModalities.includes('image'),
								function_calling: supportedParams.includes('tools'),
								json_mode: supportedParams.includes('response_format'),
							},
						};

						return {
							name: m.name ?? m.id,
							value: m.id,
							description: JSON.stringify(meta),
						};
					})
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const { apiKey, baseUrl } = getGatewayConfig();

		const modelName = (this.getNodeParameter('model', itemIndex, '') as string) || FALLBACK_MODEL;

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries: number;
			timeout: number;
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
		};

		const timeout = options.timeout;
		const configuration: ClientOptions = {
			baseURL: baseUrl,
			fetch: createOpenRouterFetch(globalThis.fetch),
			fetchOptions: {
				dispatcher: getProxyAgent(baseUrl, {
					headersTimeout: timeout,
					bodyTimeout: timeout,
				}),
			},
		};

		const model = new ChatOpenAI({
			apiKey,
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: options.responseFormat
				? {
						response_format: { type: options.responseFormat },
					}
				: undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
		});

		return {
			response: model,
		};
	}
}
