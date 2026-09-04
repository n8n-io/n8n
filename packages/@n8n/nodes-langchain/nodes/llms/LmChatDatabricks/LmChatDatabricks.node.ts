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
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { makeDatabricksFailedAttemptHandler } from './error-handling';
import type { DatabricksOAuth2Credential } from './token-provider';
import {
	CHAT_MODEL_USER_AGENT,
	createDatabricksFetch,
	getDatabricksTokenProvider,
} from './token-provider';

// Every request carries a secret (bearer token, or the client secret on the
// mint path), so an http host would ship it in cleartext
function assertHttpsHost(ctx: ILoadOptionsFunctions | ISupplyDataFunctions, host: string) {
	if (!URL.canParse(host) || new URL(host).protocol !== 'https:') {
		throw new NodeOperationError(ctx.getNode(), 'Databricks host must use https');
	}
}

interface ServingEndpointsResponse {
	endpoints?: Array<{
		name: string;
		task?: string;
		config?: {
			served_entities?: Array<{
				external_model?: { name: string };
				foundation_model?: { name: string };
			}>;
		};
	}>;
}

async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<DatabricksOAuth2Credential>('databricksOAuth2Api');
	assertHttpsHost(this, credentials.host);
	const host = credentials.host.replace(/\/$/, '');

	const response: ServingEndpointsResponse = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'databricksOAuth2Api',
		{
			method: 'GET',
			url: `${host}/api/2.0/serving-endpoints`,
			headers: { Accept: 'application/json', 'User-Agent': CHAT_MODEL_USER_AGENT },
			json: true,
		},
	);

	const endpoints = response.endpoints ?? [];

	const allResults = endpoints
		// Covers llm/v1/chat (foundation/external models) and agent/*/chat; custom
		// endpoints without a task are reachable via the resourceLocator's ID mode
		.filter((endpoint) => endpoint.task?.includes('chat'))
		.map((endpoint) => {
			const modelNames = (endpoint.config?.served_entities ?? [])
				.map((entity) => entity.external_model?.name ?? entity.foundation_model?.name)
				.filter(Boolean)
				.join(', ');

			return {
				name: endpoint.name,
				value: endpoint.name,
				url: `${host}/ml/endpoints/${endpoint.name}`,
				description: modelNames || 'Model serving endpoint',
			};
		});

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allResults.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					r.description.toLowerCase().includes(filterLower),
			),
		};
	}

	return { results: allResults };
}

export class LmChatDatabricks implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Databricks Chat Model',
		name: 'lmChatDatabricks',
		hidden: true,
		icon: { light: 'file:databricks.svg', dark: 'file:databricks.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Databricks Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatdatabricks/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'databricksOAuth2Api',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure the selected endpoint supports JSON mode.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.responseFormat': ['json_object'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: {
							searchListMethod: 'searchModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'my-serving-endpoint',
					},
				],
				description: 'The serving endpoint. Choose from the list, or specify an ID.',
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credential = await this.getCredentials<DatabricksOAuth2Credential>('databricksOAuth2Api');

		assertHttpsHost(this, credential.host);

		const baseURL = `${credential.host.replace(/\/$/, '')}/serving-endpoints`;

		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

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

		const egressFilter = this.helpers.getSecureEgressFilter();

		const timeout = options.timeout;
		const tokenSource = getDatabricksTokenProvider(this, credential, egressFilter);
		const configuration: ClientOptions = {
			baseURL,
			fetch: createDatabricksFetch(tokenSource, egressFilter),
			fetchOptions: {
				dispatcher: getProxyAgent(
					baseURL,
					{
						headersTimeout: timeout,
						bodyTimeout: timeout,
					},
					egressFilter?.createSecureLookup(),
				),
			},
		};

		const modelKwargs: Record<string, unknown> = {};
		if (options.responseFormat) {
			modelKwargs.response_format = { type: options.responseFormat };
		}

		const model = new ChatOpenAI({
			// Placeholder only - the fetch wrapper overwrites the Authorization header
			apiKey: 'databricks-oauth',
			model: modelName,
			...options,
			timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined,
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(
				this,
				makeDatabricksFailedAttemptHandler(tokenSource.expiredStatus),
			),
		});

		return {
			response: model,
		};
	}
}
