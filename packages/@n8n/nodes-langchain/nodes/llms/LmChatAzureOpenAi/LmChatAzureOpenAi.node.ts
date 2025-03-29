import { AzureChatOpenAI } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

// Define a type for the expected structure within modelKwargs if needed elsewhere
interface AzureModelKwargs {
	response_format?: { type: 'text' | 'json_object' };
	tools?: Array<{ type: string }>;
	tool_resources?: {
		file_search?: {
			vector_store_ids?: string[];
		};
		// Potentially other tool resources in the future
	};
	// Include other potential kwargs if known
	[key: string]: any;
}


export class LmChatAzureOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure OpenAI Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatAzureOpenAi',
		icon: 'file:azure.svg',
		group: ['transform'],
		version: 1.1, // Increment version due to feature addition
		description: 'For advanced usage with an AI chain, supporting RAG via Vector Stores',
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
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName:
					'If using JSON response format, you must include word "json" in the prompt in your chain or agent. Also, make sure to select latest models released post November 2023.',
				name: 'noticeResponseFormat', // Renamed for clarity
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.responseFormat': ['json_object'],
					},
				},
			},
			{
				displayName:
					'Providing a Vector Store ID enables Retrieval-Augmented Generation (RAG) using the file_search tool. Ensure the selected model supports function calling/tools.',
				name: 'noticeVectorStore', // New notice
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.vectorStoreId': ['*'], // Show if vectorStoreId has any value
					},
					hide: {
						'/options.vectorStoreId': [''], // Hide if vectorStoreId is empty
					},
				},
			},
			{
				displayName: 'Model (Deployment) Name',
				name: 'model',
				type: 'string',
				description: 'The name of the model(deployment) to use',
				required: true, // Make model name required
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to configure the model and RAG',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Vector Store ID (for RAG)',
						name: 'vectorStoreId',
						type: 'string',
						default: '',
						description:
							'The ID of the Azure OpenAI Vector Store to use for file search (RAG). Example: vs_abc123xyz',
						placeholder: 'vs_abc123xyz',
					},
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
						displayName: 'Maximum Number of Tokens (Max Response Tokens)',
						name: 'maxTokens',
						default: -1,
						description:
							'The maximum number of tokens to generate in the completion. -1 means no limit enforced by n8n, but the model has its own limits (e.g., 4096 or 8192). Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
						type: 'number',
						typeOptions: {
							minValue: -1, // Allow -1
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
									'Enables JSON mode, which should guarantee the message the model generates is valid JSON (requires newer models)',
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
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 }, // OpenAI allows up to 2
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						default: 120000, // Increased default timeout
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
						typeOptions: {
							minValue: 0,
						}
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt on failure',
						type: 'number',
						typeOptions: {
							minValue: 0,
						}
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
					// Note: Stop sequences are often handled in the Chain/Agent, not directly here.
					// If needed, it would likely go into modelKwargs as 'stop'.
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{
			apiKey: string;
			resourceName: string;
			apiVersion: string;
			endpoint?: string;
		}>('azureOpenAiApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			frequencyPenalty?: number;
			maxTokens?: number; // Renamed from max_tokens if Langchain uses camelCase
			maxRetries?: number; // Default handled below
			timeout?: number; // Default handled below
			presencePenalty?: number;
			temperature?: number;
			topP?: number; // Renamed from top_p if Langchain uses camelCase
			responseFormat?: 'text' | 'json_object';
			vectorStoreId?: string; // Added Vector Store ID
			// Allow other potential options to be passed through if needed
			[key: string]: any;
		};

		// Extract specific options for clarity and special handling
		const {
			vectorStoreId,
			responseFormat,
			maxRetries: rawMaxRetries, // Rename to avoid conflict with constructor arg name
			timeout: rawTimeout, // Rename to avoid conflict with constructor arg name
			maxTokens, // Explicitly handle maxTokens potentially
			...restOptions // Capture remaining options like temperature, topP, penalties
		} = options;

		// --- Prepare modelKwargs ---
		const modelKwargs: AzureModelKwargs = {};

		// Handle responseFormat
		if (responseFormat) {
			modelKwargs.response_format = { type: responseFormat };
		}

		// Handle RAG / Vector Store configuration
		if (vectorStoreId && vectorStoreId.trim() !== '') {
			// Add the file_search tool
			modelKwargs.tools = [{ type: 'file_search' }];
			// Add the tool resources pointing to the vector store
			modelKwargs.tool_resources = {
				file_search: {
					vector_store_ids: [vectorStoreId.trim()],
				},
			};
			this.logger.debug(`Enabling file_search tool with Vector Store ID: ${vectorStoreId.trim()}`);
		}

		const finalMaxTokens = maxTokens === -1 ? undefined : maxTokens; // Pass undefined if -1, otherwise the value

		const model = new AzureChatOpenAI({
			// Credentials & Model Name
			azureOpenAIApiDeploymentName: modelName,
			azureOpenAIApiInstanceName: !credentials.endpoint ? credentials.resourceName : undefined,
			azureOpenAIApiKey: credentials.apiKey,
			azureOpenAIApiVersion: credentials.apiVersion,
			azureOpenAIEndpoint: credentials.endpoint,

			// Directly supported LangChain options from the collection
			...restOptions, // Includes temperature, topP, frequencyPenalty, presencePenalty

			// Explicitly handled LangChain options
			maxTokens: finalMaxTokens, // Pass potentially undefined maxTokens
			maxRetries: rawMaxRetries ?? 2, // Default to 2 if not provided
			timeout: rawTimeout ?? 120000, // Default to 120000ms if not provided

			// LangChain Callbacks & Error Handling
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),

			// Provider-specific arguments (like response format, tools for RAG)
			modelKwargs: Object.keys(modelKwargs).length > 0 ? modelKwargs : undefined, // Pass kwargs only if populated
		});

		return {
			response: model,
		};
	}
}
