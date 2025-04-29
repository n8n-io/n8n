/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { TokenCredential, AccessToken, GetTokenOptions } from '@azure/identity';
import { getBearerTokenProvider } from '@azure/identity';
import { AzureChatOpenAI } from '@langchain/openai';
import {
	OperationalError,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeOperationError,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

type AzureEntraCognitiveServicesOAuth2ApiCredential = {
	accessToken: string;
	authentication: string;
	authQueryParameters: string;
	authUrl: string;
	clientId: string;
	clientSecret: string;
	customScopes: boolean;
	apiVersion: string;
	endpoint: string;
	resourceName: string;
	oauthTokenData: {
		access_token: string;
		expires_on: number;
		ext_expires_on: number;
		id_token: string;
		token_type: string;
		scope: string;
	};
	scope: string;
	tenantId: string;
};
// This adapts n8n's credential retrieval into the TokenCredential interface expected by @azure/identity
class N8nOAuth2TokenCredential implements TokenCredential {
	constructor(
		private getNode: ISupplyDataFunctions, // Pass the 'this' context from supplyData
		private credentialName: string,
	) {}

	async getToken(scopes: string | string[]): Promise<AccessToken | null> {
		console.log(`Requesting token with scopes: ${scopes}`); // For debugging

		try {
			// Fetch the latest credential data from n8n (n8n handles refresh internally)
			// Specify the expected shape of the credential data
			const credentials =
				await this.getNode.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(
					this.credentialName,
				);

			if (!credentials?.oauthTokenData?.access_token) {
				this.getNode.logger.error(
					`[N8nOAuth2TokenCredential] Access token not found in credential '${this.credentialName}'. Make sure the credential is connected and authorized.`,
				);
				throw new NodeOperationError(this.getNode.getNode(), 'Failed to retrieve access token');
			}

			return {
				token: credentials.oauthTokenData.access_token,
				expiresOnTimestamp: credentials.oauthTokenData.expires_on,
			};
		} catch (error) {
			this.getNode.logger.error(
				`[N8nOAuth2TokenCredential] Error retrieving token for credential '${this.credentialName}': ${error.message}`,
				error,
			);
			// Re-throw or handle as appropriate for the Azure SDK
			throw error; // Propagate the error
		}
	}

	async getDeploymentDetails() {
		const credentials =
			await this.getNode.getCredentials<AzureEntraCognitiveServicesOAuth2ApiCredential>(
				this.credentialName,
			);

		return {
			apiVersion: credentials.apiVersion,
			endpoint: credentials.endpoint,
			resourceName: credentials.resourceName,
		};
	}
}
// --- End Helper Class ---

export class LmChatAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure OpenAI Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatAzureOpenAi',
		icon: 'file:azure.svg',
		group: ['transform'],
		version: 1.1, // Increment version due to significant auth change
		description: 'Connects to Azure OpenAI using API Key or Microsoft Entra ID (OAuth2)',
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
						authentication: ['azureOpenAiApi'],
					},
				},
			},
			{
				name: 'azureEntraCognitiveServicesOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['azureEntraCognitiveServicesOAuth2Api'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Key',
						value: 'azureOpenAiApi',
					},
					{
						name: 'Azure Entra ID (OAuth2)',
						value: 'azureEntraCognitiveServicesOAuth2Api',
					},
				],
				default: 'azureOpenAiApi',
			},
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
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
				displayName: 'Model (Deployment) Name',
				name: 'model',
				type: 'string',
				description: 'The name of the model(deployment) to use (e.g., gpt-4, gpt-35-turbo)',
				required: true,
				default: '',
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
							'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768). Use -1 for default.',
						type: 'number',
						typeOptions: {
							maxValue: 128000,
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
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 }, // Max temp can be 2
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						default: 60000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt on failure',
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
		const authenticationMethod = this.getNodeParameter('authentication', itemIndex) as string;
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number;
			maxRetries?: number; // Allow undefined, default handled by Langchain
			timeout?: number; // Allow undefined, default handled by Langchain
			presencePenalty?: number;
			temperature?: number;
			topP?: number;
			responseFormat?: 'text' | 'json_object';
		};

		// --- Configuration Variables ---
		let azureOpenAIApiKey: string | undefined = undefined;
		let azureADTokenProvider: (() => Promise<string>) | undefined = undefined;
		let azureOpenAIApiInstanceName: string | undefined = undefined;
		let azureOpenAIApiVersion: string | undefined = undefined;
		let azureOpenAIEndpoint: string | undefined = undefined;

		// --- Set up Authentication based on selection ---
		if (authenticationMethod === 'azureOpenAiApi') {
			// --- Get Azure OpenAI Config (Endpoint, Version, etc.) ---
			const configCredentials = await this.getCredentials<{
				apiKey?: string; // API Key is optional now
				resourceName: string;
				apiVersion: string;
				endpoint?: string;
			}>('azureOpenAiApi');
			if (!configCredentials.apiKey) {
				throw new OperationalError(
					'API Key is missing in the selected Azure OpenAI API credential. Please configure the API Key or choose Entra ID authentication.',
				);
			}
			azureOpenAIApiKey = configCredentials.apiKey;
			azureOpenAIApiInstanceName = configCredentials.resourceName;
			azureOpenAIApiVersion = configCredentials.apiVersion;
			azureOpenAIEndpoint = configCredentials.endpoint;

			this.logger.info('Using API Key authentication for Azure OpenAI.');
		} else if (authenticationMethod === 'azureEntraCognitiveServicesOAuth2Api') {
			try {
				// Use the helper class to create a TokenCredential
				const entraTokenCredential = new N8nOAuth2TokenCredential(
					this,
					'azureEntraCognitiveServicesOAuth2Api',
				);
				const deploymentDetails = await entraTokenCredential.getDeploymentDetails();
				azureOpenAIApiInstanceName = deploymentDetails.resourceName;
				azureOpenAIApiVersion = deploymentDetails.apiVersion;
				azureOpenAIEndpoint = deploymentDetails.endpoint;

				// Use getBearerTokenProvider to create the function LangChain expects
				// Pass the required scope for Azure Cognitive Services
				azureADTokenProvider = getBearerTokenProvider(
					entraTokenCredential,
					'https://cognitiveservices.azure.com/.default',
				);
				this.logger.debug('Successfully created Azure AD Token Provider.');
			} catch (error) {
				this.logger.error(`Error setting up Entra ID authentication: ${error.message}`, error);
				throw new NodeOperationError(
					this.getNode(),
					'Error setting up Entra ID authentication',
					error,
				);
			}
		} else {
			throw new NodeOperationError(this.getNode(), 'Invalid authentication method');
		}

		this.logger.info('Instantiating AzureChatOpenAI model...');
		const model = new AzureChatOpenAI({
			azureOpenAIApiKey,
			azureADTokenProvider, // Pass the token provider if using Entra ID
			azureOpenAIApiDeploymentName: modelName,
			// model: 'gpt-4o-mini',
			azureOpenAIApiInstanceName,
			azureOpenAIApiVersion,
			azureOpenAIEndpoint,
			// Spread validated options
			...(options.frequencyPenalty !== undefined && {
				frequencyPenalty: options.frequencyPenalty,
			}),
			...(options.maxTokens !== undefined &&
				options.maxTokens > 0 && {
					// -1 means default in Langchain
					maxTokens: options.maxTokens,
				}),
			...(options.presencePenalty !== undefined && {
				presencePenalty: options.presencePenalty,
			}),
			...(options.temperature !== undefined && { temperature: options.temperature }),
			...(options.topP !== undefined && { topP: options.topP }),
			// Options with defaults in Langchain/Azure SDK if not provided
			maxRetries: options.maxRetries, // Let Langchain handle default (usually 6)
			timeout: options.timeout, // Let Langchain handle default
			// Callbacks and Handlers
			callbacks: [new N8nLlmTracing(this)],
			modelKwargs: options.responseFormat
				? {
						response_format: { type: options.responseFormat },
					}
				: undefined,
			// Use custom handler for more informative errors during retries
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		this.logger.info(`Azure OpenAI client initialized for deployment: ${modelName}`);

		return {
			response: model,
		};
	}
}
