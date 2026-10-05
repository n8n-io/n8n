import { ChatAnthropic, type ChatAnthropicInput } from '@langchain/anthropic';
import { AzureChatOpenAI, ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	getProxyAgent,
	aiClientFetch,
	anthropicTokensUsageParser,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import {
	NodeOperationError,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { parseExtraBody } from '../shared/extra-body';
import { setupApiKeyAuthentication } from './credentials/api-key';
import { makeAzureFoundryFailedAttemptHandler } from './error-handling';
import { setupOAuth2Authentication } from './credentials/oauth2';
import { searchModels } from './methods/searchModels';
import { properties } from './properties';
import { AuthenticationType } from './types';
import type {
	AzureOpenAIApiKeyModelConfig,
	AzureOpenAIOAuth2ModelConfig,
	AzureOpenAIOptions,
} from './types';

export class LmChatAzureOpenAi implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Azure AI Foundry Chat Model',

		name: 'lmChatAzureOpenAi',
		icon: 'file:azure.svg',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Azure AI Foundry Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatazureopenai/',
					},
				],
			},
			// The old label, in full and in part. Fuzzy search matches a pattern into a target, so
			// the full former name finds nothing unless it is here verbatim.
			alias: ['Azure OpenAI Chat Model', 'Azure OpenAI', 'Azure AI Foundry', 'Foundry'],
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'azureOpenAiApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [AuthenticationType.ApiKey],
					},
				},
			},
			{
				name: 'azureEntraCognitiveServicesOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [AuthenticationType.EntraOAuth2],
					},
				},
			},
		],
		properties,
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		try {
			const authenticationMethod = this.getNodeParameter(
				'authentication',
				itemIndex,
			) as AuthenticationType;
			// Version 1 stores a plain string; `extractValue` returns it unchanged.
			const modelName = this.getNodeParameter('model', itemIndex, '', {
				extractValue: true,
			}) as string;
			const allOptions = this.getNodeParameter('options', itemIndex, {}) as AzureOpenAIOptions;
			// Held back from the spread below: both clients take it as `modelKwargs`, and spreading the
			// raw JSON string would put an `extraBody` field on the constructor.
			const { extraBody, ...options } = allOptions;
			const extraBodyKwargs = extraBody ? parseExtraBody(this, extraBody, itemIndex) : {};

			// Absent on nodes saved before the field existed, which keep the OpenAI route.
			const modelFamily = this.getNodeParameter('modelFamily', itemIndex, 'openai') as
				| 'openai'
				| 'anthropic';

			// Azure exposes no way to ask a deployment which API it answers on, so this is the user's
			// call. Absent on version 1 nodes, which keep the forced Chat Completions behaviour.
			const responsesApiEnabled = this.getNodeParameter(
				'responsesApiEnabled',
				itemIndex,
				false,
			) as boolean;

			// The two APIs name this differently: Chat Completions takes `response_format`, the
			// Responses API takes the same thing under `text.format`. LangChain spreads modelKwargs
			// last, over its own `text`, so sending the wrong shape puts an unknown key on the body.
			const responseFormat = options.responseFormat
				? responsesApiEnabled
					? { text: { format: { type: options.responseFormat } } }
					: { response_format: { type: options.responseFormat } }
				: {};

			// `responseFormat` and `extraBody` both end up in the request body. Extra Body is the
			// escape hatch, so it wins on a key collision.
			const modelKwargs: Record<string, unknown> = {
				...responseFormat,
				...extraBodyKwargs,
			};
			const hasModelKwargs = Object.keys(modelKwargs).length > 0;

			// Set up Authentication based on selection and get configuration
			let modelConfig: AzureOpenAIApiKeyModelConfig | AzureOpenAIOAuth2ModelConfig;
			switch (authenticationMethod) {
				case AuthenticationType.ApiKey:
					modelConfig = await setupApiKeyAuthentication.call(this, 'azureOpenAiApi');
					break;
				case AuthenticationType.EntraOAuth2:
					modelConfig = await setupOAuth2Authentication.call(
						this,
						'azureEntraCognitiveServicesOAuth2Api',
					);
					break;
				default:
					throw new NodeOperationError(this.getNode(), 'Invalid authentication method');
			}

			const timeout = options.timeout;

			if (modelFamily === 'anthropic') {
				// The classic endpoint type addresses /openai/deployments/<name>, which has no Anthropic
				// route. Say so before any request goes out.
				if (!modelConfig.azureFoundryBaseURL) {
					throw new NodeOperationError(
						this.getNode(),
						'Claude deployments need a credential using the Azure AI Foundry endpoint type',
						{
							itemIndex,
							description:
								'This credential uses the classic endpoint type, which serves only the Azure OpenAI route. Switch the credential to Azure AI Foundry, or set Model Family to OpenAI.',
						},
					);
				}

				// Claude in Foundry answers on <resource>/anthropic; the SDK appends /v1/messages.
				const anthropicURL = new URL(modelConfig.azureFoundryBaseURL).origin + '/anthropic';
				const clientOptions: NonNullable<ChatAnthropicInput['clientOptions']> = {
					fetch: aiClientFetch,
					// undici v7 and the SDK's bundled fetch types disagree structurally
					// (FormData iterators), so the dispatcher cannot carry its own type here.
					fetchOptions: {
						dispatcher: getProxyAgent(
							anthropicURL,
							{ headersTimeout: timeout, bodyTimeout: timeout },
							this.helpers.getSecureEgressFilter(),
						),
					} as NonNullable<ChatAnthropicInput['clientOptions']>['fetchOptions'],
					timeout,
					// Keep the SDK from reading ANTHROPIC_AUTH_TOKEN off the host and sending it to Azure.
					authToken: null,
				};
				if (modelConfig.azureADTokenProvider) {
					const getToken = modelConfig.azureADTokenProvider;
					// The SDK's own bearer option is a static string, and an Entra token expires mid-run.
					const fetchWithEntraToken: typeof aiClientFetch = async (input, init) => {
						const headers = new Headers(init?.headers);
						headers.set('Authorization', `Bearer ${await getToken()}`);
						headers.delete('x-api-key');
						return await aiClientFetch(input, { ...init, headers });
					};
					clientOptions.fetch = fetchWithEntraToken;
				}

				const model = new ChatAnthropic({
					model: modelName,
					// LangChain refuses to start without a key. The placeholder also stops the SDK from
					// running its own credential chain; the Entra fetch deletes it before the request leaves.
					anthropicApiKey: modelConfig.azureOpenAIApiKey ?? 'entra-id',
					anthropicApiUrl: anthropicURL,
					clientOptions,
					// LangChain only sends temperature and top_p when they are set, and Claude 4.x
					// rejects both together.
					temperature: options.temperature,
					topP: options.topP,
					// -1 is the OpenAI "use default" sentinel, invalid here.
					maxTokens: options.maxTokens && options.maxTokens > 0 ? options.maxTokens : undefined,
					maxRetries: options.maxRetries ?? 2,
					invocationKwargs: extraBodyKwargs,
					callbacks: [new N8nLlmTracing(this, { tokensUsageParser: anthropicTokensUsageParser })],
					onFailedAttempt: makeN8nLlmFailedAttemptHandler(
						this,
						makeAzureFoundryFailedAttemptHandler(modelName, false, 'anthropic'),
					),
				});

				this.logger.info(`Azure AI Foundry (Anthropic) client initialized for model: ${modelName}`);
				return { response: model };
			}

			if (modelConfig.azureFoundryBaseURL) {
				const foundryURL = modelConfig.azureFoundryBaseURL;
				const configuration: ClientOptions = {
					baseURL: foundryURL,
					fetch: aiClientFetch,
					fetchOptions: {
						dispatcher: getProxyAgent(
							foundryURL,
							{
								headersTimeout: timeout,
								bodyTimeout: timeout,
							},
							this.helpers.getSecureEgressFilter(),
						),
					},
				};
				if (modelConfig.azureADTokenProvider) {
					configuration.apiKey = modelConfig.azureADTokenProvider;
				}
				const model = new ChatOpenAI({
					model: modelName,
					...(modelConfig.azureOpenAIApiKey ? { apiKey: modelConfig.azureOpenAIApiKey } : {}),
					...options,
					timeout,
					maxRetries: options.maxRetries ?? 2,
					configuration,
					callbacks: [new N8nLlmTracing(this)],
					// The Foundry base URL already ends in /openai/v1, so LangChain appends /responses
					// or /chat/completions to a path Azure serves either way.
					useResponsesApi: responsesApiEnabled,
					// The chain decides to parse JSON from `modelKwargs.response_format`, which the
					// Responses API does not use. Tell it directly instead, the way the Mistral node
					// does, rather than teaching the shared chain a second shape.
					metadata: {
						output_format:
							responsesApiEnabled && options.responseFormat === 'json_object' ? 'json' : undefined,
					},
					modelKwargs: hasModelKwargs ? modelKwargs : undefined,
					onFailedAttempt: makeN8nLlmFailedAttemptHandler(
						this,
						makeAzureFoundryFailedAttemptHandler(modelName, responsesApiEnabled),
					),
				});

				this.logger.info(`Azure OpenAI (Foundry) client initialized for model: ${modelName}`);
				return { response: model };
			}

			// The classic route addresses a deployment, so its base URL ends in
			// /openai/deployments/<name>. Azure serves the Responses API outside that prefix, so the
			// call would go to a path that does not exist. Say so rather than let it fail as a
			// connection error. See: https://github.com/langchain-ai/langchainjs/issues/9038
			if (responsesApiEnabled) {
				throw new NodeOperationError(
					this.getNode(),
					'The Responses API needs a credential using the Azure AI Foundry endpoint type',
					{
						itemIndex,
						description:
							"This credential uses the classic endpoint type, which addresses a deployment directly and has no Responses API. Switch the credential to Azure AI Foundry, or turn off 'Use Responses API'.",
					},
				);
			}

			// One resolved host for both the client and the proxy. Passing it explicitly also stops
			// LangChain falling back to AZURE_OPENAI_ENDPOINT, which the proxy would not know about.
			// `||` not `??`: a cleared Endpoint field stores '' rather than undefined.
			const azureOpenAIEndpoint =
				modelConfig.azureOpenAIEndpoint ||
				`https://${modelConfig.azureOpenAIApiInstanceName}.openai.azure.com`;

			const model = new AzureChatOpenAI({
				// The classic route never asks for Responses; the check above already refused the
				// toggle. LangChain can still pick it from the model name, which is why that case
				// needs the Foundry endpoint type.
				useResponsesApi: false,
				// Model name is required so logs are correct
				// Also ensures internal logic (like mapping "maxTokens" to "maxCompletionTokens") is correct
				model: modelName,
				azureOpenAIApiDeploymentName: modelName,
				...modelConfig,
				...options,
				azureOpenAIEndpoint,
				timeout,
				maxRetries: options.maxRetries ?? 2,
				callbacks: [new N8nLlmTracing(this)],
				configuration: {
					fetch: aiClientFetch,
					fetchOptions: {
						// Same host the client dials, so NO_PROXY and the egress filter apply to it.
						dispatcher: getProxyAgent(
							azureOpenAIEndpoint,
							{
								headersTimeout: timeout,
								bodyTimeout: timeout,
							},
							this.helpers.getSecureEgressFilter(),
						),
					},
				},
				modelKwargs: hasModelKwargs ? modelKwargs : undefined,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(
					this,
					makeAzureFoundryFailedAttemptHandler(modelName, false, 'classic'),
				),
			});

			this.logger.info(`Azure OpenAI client initialized for deployment: ${modelName}`);

			return {
				response: model,
			};
		} catch (error) {
			this.logger.error(`Error in LmChatAzureOpenAi.supplyData: ${error.message}`, error);

			// Re-throw NodeOperationError directly, wrap others
			if (error instanceof NodeOperationError) {
				throw error;
			}

			throw new NodeOperationError(
				this.getNode(),
				`Failed to initialize the chat model client: ${error.message}`,
				error,
			);
		}
	}
}
