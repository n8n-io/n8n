import { AzureChatOpenAI } from '@langchain/openai';
import {
	NodeOperationError,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getProxyAgent } from '@utils/httpProxyAgent';

import { setupApiKeyAuthentication } from './credentials/api-key';
import { setupOAuth2Authentication } from './credentials/oauth2';
import { getDeployments } from './methods/listDeployments';
import { properties } from './properties';
import { AuthenticationType } from './types';
import type {
	AzureOpenAIApiKeyModelConfig,
	AzureOpenAIOAuth2ModelConfig,
	AzureOpenAIOptions,
} from './types';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

/**
 * Type guard to check if value is a valid AuthenticationType
 */
function isAuthenticationType(value: unknown): value is AuthenticationType {
	return value === AuthenticationType.ApiKey || value === AuthenticationType.EntraOAuth2;
}

/**
 * Type guard to check if modelConfig has apimConfig property (OAuth2 config)
 */
function hasApimConfig(
	config: AzureOpenAIApiKeyModelConfig | AzureOpenAIOAuth2ModelConfig,
): config is AzureOpenAIOAuth2ModelConfig {
	return 'apimConfig' in config;
}

export class LmChatAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure OpenAI Chat Model',

		name: 'lmChatAzureOpenAi',
		icon: 'file:azure.svg',
		group: ['transform'],
		version: 1,
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

	methods = {
		loadOptions: {
			getDeployments,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		try {
			const authenticationMethodValue = this.getNodeParameter('authentication', itemIndex);
			if (!isAuthenticationType(authenticationMethodValue)) {
				throw new NodeOperationError(this.getNode(), 'Invalid authentication method');
			}
			const authenticationMethod = authenticationMethodValue;

			const modelNameValue = this.getNodeParameter('model', itemIndex);
			if (typeof modelNameValue !== 'string') {
				throw new NodeOperationError(this.getNode(), 'Model name must be a string');
			}
			const modelName = modelNameValue;

			const options = this.getNodeParameter('options', itemIndex, {}) as AzureOpenAIOptions;

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

			// Extract APIM config if present (only available with OAuth2 authentication)
			const apimConfig = hasApimConfig(modelConfig) ? modelConfig.apimConfig : undefined;

			// Build configuration object with APIM settings if configured
			const configuration: Record<string, unknown> = {
				fetchOptions: {
					dispatcher: getProxyAgent(undefined, {
						headersTimeout: timeout,
						bodyTimeout: timeout,
					}),
				},
			};

			// Add APIM query params to be included with every LLM request
			if (apimConfig?.queryParams && Object.keys(apimConfig.queryParams).length > 0) {
				configuration.defaultQuery = apimConfig.queryParams;
				this.logger.debug('APIM query parameters configured for LLM requests');
			}

			// Add APIM headers to be included with every LLM request
			if (apimConfig?.headers && Object.keys(apimConfig.headers).length > 0) {
				configuration.defaultHeaders = apimConfig.headers;
				this.logger.debug('APIM headers configured for LLM requests');
			}

			// Build model options, excluding apimConfig from spread
			// Use type guard to properly handle the union type
			let modelConfigForOptions:
				| AzureOpenAIApiKeyModelConfig
				| Omit<AzureOpenAIOAuth2ModelConfig, 'apimConfig'>;
			if (hasApimConfig(modelConfig)) {
				const { apimConfig: _, ...rest } = modelConfig;
				modelConfigForOptions = rest;
			} else {
				modelConfigForOptions = modelConfig;
			}

			const modelOptions: Record<string, unknown> = {
				// Model name is required so logs are correct
				// Also ensures internal logic (like mapping "maxTokens" to "maxCompletionTokens") is correct
				model: modelName,
				azureOpenAIApiDeploymentName: modelName,
				...modelConfigForOptions,
				...options,
				timeout,
				maxRetries: options.maxRetries ?? 2,
				callbacks: [new N8nLlmTracing(this)],
				configuration,
				modelKwargs: options.responseFormat
					? {
							response_format: { type: options.responseFormat },
						}
					: undefined,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
			};

			// Add custom endpoint for APIM if configured
			// Use azureOpenAIEndpoint (not azureOpenAIBasePath) so LangChain constructs:
			// {endpoint}/openai/deployments/{deployment}/chat/completions
			if (apimConfig?.basePath) {
				modelOptions.azureOpenAIEndpoint = apimConfig.basePath;
				// Clear resourceName to prevent URL conflicts
				delete modelOptions.azureOpenAIApiInstanceName;
				this.logger.debug(`APIM endpoint configured: ${apimConfig.basePath}`);
			}

			const model = new AzureChatOpenAI(modelOptions);

			this.logger.info(`Azure OpenAI client initialized for deployment: ${modelName}`);

			return {
				response: model,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Error in LmChatAzureOpenAi.supplyData: ${errorMessage}`, { error });

			// Re-throw NodeOperationError directly, wrap others
			if (error instanceof NodeOperationError) {
				throw error;
			}

			throw new NodeOperationError(
				this.getNode(),
				`Failed to initialize Azure OpenAI client: ${errorMessage}`,
			);
		}
	}
}
