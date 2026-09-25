import { AzureChatOpenAI, ChatOpenAI, type ClientOptions } from '@langchain/openai';
import { getProxyAgent, makeN8nLlmFailedAttemptHandler, N8nLlmTracing } from '@n8n/ai-utilities';
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
		displayName: 'Azure OpenAI Chat Model',

		name: 'lmChatAzureOpenAi',
		icon: 'file:azure.svg',
		group: ['transform'],
		version: [1, 1.1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Azure OpenAI Chat Model',
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
			const modelName = this.getNodeParameter('model', itemIndex) as string;
			const allOptions = this.getNodeParameter('options', itemIndex, {}) as AzureOpenAIOptions;
			// Held back from the spread below: both clients take it as `modelKwargs`, and spreading the
			// raw JSON string would put an `extraBody` field on the constructor.
			const { extraBody, ...options } = allOptions;

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
				...(extraBody ? parseExtraBody(this, extraBody, itemIndex) : {}),
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

			this.logger.info(`Instantiating AzureChatOpenAI model with deployment: ${modelName}`);

			const timeout = options.timeout;

			if (modelConfig.azureFoundryBaseURL) {
				const foundryURL = modelConfig.azureFoundryBaseURL;
				const configuration: ClientOptions = {
					baseURL: foundryURL,
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
				timeout,
				maxRetries: options.maxRetries ?? 2,
				callbacks: [new N8nLlmTracing(this)],
				configuration: {
					fetchOptions: {
						// Resolve the proxy against the host LangChain dials so NO_PROXY applies to it.
						// `||` rather than `??`: the Entra handler yields '' for a missing endpoint.
						dispatcher: getProxyAgent(
							modelConfig.azureOpenAIEndpoint ||
								`https://${modelConfig.azureOpenAIApiInstanceName}.openai.azure.com`,
							{
								headersTimeout: timeout,
								bodyTimeout: timeout,
							},
							this.helpers.getSecureEgressFilter(),
						),
					},
				},
				modelKwargs: hasModelKwargs ? modelKwargs : undefined,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
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
				`Failed to initialize Azure OpenAI client: ${error.message}`,
				error,
			);
		}
	}
}
