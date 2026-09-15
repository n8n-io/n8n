import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	createRefreshingAuthFetch,
	getProxyAgent,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { databricksAuthHeaders } from './constants';
import { makeDatabricksFailedAttemptHandler, wrapDatabricksErrorFetch } from './error-handling';
import type { DatabricksOAuth2Credential } from './token-provider';
import { getDatabricksTokenProvider } from './token-provider';

// Every request carries a secret (bearer token, or the client secret on the
// mint path), so an http host would ship it in cleartext
function assertHttpsHost(ctx: ILoadOptionsFunctions | ISupplyDataFunctions, host: string) {
	if (!URL.canParse(host) || new URL(host).protocol !== 'https:') {
		throw new NodeOperationError(ctx.getNode(), 'Databricks host must use https');
	}
}

interface ModelService {
	name: string;
	comment?: string;
	supported_api_types?: string[];
}

interface ModelServicesResponse {
	model_services?: ModelService[];
	next_page_token?: string;
}

async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<DatabricksOAuth2Credential>('databricksOAuth2Api');
	assertHttpsHost(this, credentials.host);
	const host = credentials.host.replace(/\/$/, '');

	const listModelServices = async (parent?: string): Promise<ModelService[]> => {
		let services: ModelService[] = [];
		let pageToken: string | undefined;
		let pages = 0;
		do {
			// Guard against a host or proxy that echoes the same next_page_token back
			if (++pages > 50) {
				throw new NodeOperationError(this.getNode(), 'Model service list exceeded 50 pages');
			}
			const page: ModelServicesResponse = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'databricksOAuth2Api',
				{
					method: 'GET',
					url: `${host}/api/2.1/unity-catalog/model-services`,
					// FULL view is needed for supported_api_types
					qs: { view: 'FULL', parent, page_token: pageToken },
					headers: { Accept: 'application/json', 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
					json: true,
				},
			);
			services = services.concat(page.model_services ?? []);
			pageToken = page.next_page_token;
		} while (pageToken);
		return services;
	};

	let services: ModelService[];
	try {
		// The docs mark `parent` as required, but the unscoped call returns every
		// service the caller can access across all schemas (verified live). If the
		// API starts to enforce it, fall back to the Databricks-provided schema.
		services = await listModelServices();
	} catch (error) {
		if (!(error instanceof NodeApiError) || error.httpCode !== '400') throw error;
		services = await listModelServices('schemas/system.ai');
	}

	if (services.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No model services found', {
			description:
				'Check that Unity AI Gateway is enabled on this workspace and that this credential can access at least one model service',
		});
	}

	// Live workspaces advertise mlflow/v1/chat/completions even though the
	// openai/v1 route answers, so match any chat-completions type; embeddings-only
	// and untyped services drop out but stay reachable via ID mode
	const chatServices = services.filter((service) =>
		service.supported_api_types?.some((type) => type.endsWith('/chat/completions')),
	);

	if (chatServices.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No chat-capable model services found', {
			description:
				'None of the visible model services supports chat completions. Use ID mode to enter a service name directly',
		});
	}

	const allResults = chatServices.map((service) => {
		// The API returns the resource name; the gateway expects catalog.schema.service
		const name = service.name.replace(/^model-services\//, '');
		return { name, value: name, description: service.comment };
	});

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allResults.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					(r.description ?? '').toLowerCase().includes(filterLower),
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
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure the selected model service supports JSON mode.',
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
						placeholder: 'system.ai.gpt-oss-120b',
					},
				],
				description:
					'The Unity AI Gateway model service. Choose from the list, or enter its full name (catalog.schema.service).',
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

		const baseURL = `${credential.host.replace(/\/$/, '')}/ai-gateway/openai/v1`;

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
		const { refreshAfterRejection } = tokenSource;
		const configuration: ClientOptions = {
			baseURL,
			// The model client builds its own transport, so it never reaches the
			// request helpers: `resolveHeaders` runs the expiry clock before every
			// request, and `refreshHeaders` covers the rejection the clock missed -
			// revoked server-side, or clock skew
			fetch: wrapDatabricksErrorFetch(
				createRefreshingAuthFetch({
					baseFetch: fetch,
					expiredStatus: tokenSource.expiredStatus,
					resolveHeaders: async () => databricksAuthHeaders(await tokenSource.getToken()),
					...(refreshAfterRejection && {
						refreshHeaders: async () => {
							const refreshed = await refreshAfterRejection();
							return refreshed ? databricksAuthHeaders(refreshed) : null;
						},
					}),
					assertAllowedUrl: async (hopUrl) => {
						if (!egressFilter) return;
						const result = await egressFilter.validateUrl(hopUrl);
						if (!result.ok) throw result.error;
					},
				}),
			),
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
