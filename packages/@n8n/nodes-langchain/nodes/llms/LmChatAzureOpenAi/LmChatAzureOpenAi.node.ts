/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { AzureChatOpenAI } from '@langchain/openai';
import {
	NodeOperationError,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getHttpProxyAgent } from '@utils/httpProxyAgent';

import { setupApiKeyAuthentication } from './credentials/api-key';
import { setupOAuth2Authentication } from './credentials/oauth2';
import { properties } from './properties';
import { AuthenticationType } from './types';
import type {
	AzureOpenAIApiKeyModelConfig,
	AzureOpenAIOAuth2ModelConfig,
	AzureOpenAIOptions,
} from './types';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure OpenAI Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
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

			// Create and return the model
			const model = new AzureChatOpenAI({
				azureOpenAIApiDeploymentName: modelName,
				...modelConfig,
				...options,
				timeout: options.timeout ?? 60000,
				maxRetries: options.maxRetries ?? 2,
				callbacks: [new N8nLlmTracing(this)],
				configuration: {
					httpAgent: getHttpProxyAgent(),
				},
				modelKwargs: options.responseFormat
					? {
							response_format: { type: options.responseFormat },
						}
					: undefined,
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
