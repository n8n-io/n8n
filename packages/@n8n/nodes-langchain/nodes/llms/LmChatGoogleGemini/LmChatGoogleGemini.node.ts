import type { SafetySetting } from '@google/generative-ai';
import { DynamicRetrievalMode } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	NodeError,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { getAdditionalOptions } from '../gemini-common/additional-options';
import type { GeminiModelOptions } from '../gemini-common/types';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

function errorDescriptionMapper(error: NodeError) {
	if (error.description?.includes('properties: should be non-empty for OBJECT type')) {
		return 'Google Gemini requires at least one <a href="https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/" target="_blank">dynamic parameter</a> when using tools';
	}

	return error.description ?? 'Unknown error';
}
export class LmChatGoogleGemini implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Gemini Chat Model',

		name: 'lmChatGoogleGemini',
		icon: 'file:google.svg',
		group: ['transform'],
		version: 1,
		description: 'Chat Model Google Gemini',
		defaults: {
			name: 'Google Gemini Chat Model',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgooglegemini/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'googlePalmApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.host }}',
		},
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model which will generate the completion. <a href="https://developers.generativeai.google/api/rest/generativelanguage/models/list">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/v1beta/models',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'models',
										},
									},
									{
										type: 'filter',
										properties: {
											pass: "={{ !$responseItem.name.includes('embedding') }}",
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.name}}',
											description: '={{$responseItem.description}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'model',
					},
				},
				default: 'models/gemini-2.5-flash',
			},
			// thinking budget not supported in @langchain/google-genai
			// as it utilises the old google generative ai SDK
			getAdditionalOptions({ supportsThinkingBudget: false, supportsGoogleSearchGrounding: true }),
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('googlePalmApi');

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;
		const options: GeminiModelOptions = this.getNodeParameter('options', itemIndex, {
			maxOutputTokens: 1024,
			temperature: 0.7,
			topK: 40,
			topP: 0.9,
		});

		const safetySettings = this.getNodeParameter(
			'options.safetySettings.values',
			itemIndex,
			null,
		) as SafetySetting[];

		// Build Google Search grounding tool if enabled
		// Use googleSearch for Gemini 2.0+ models, googleSearchRetrieval for Gemini 1.x
		// Model names can be like "models/gemini-1.5-pro" or "gemini-3-pro-preview"
		type GoogleSearchTool =
			| {
					googleSearchRetrieval: {
						dynamicRetrievalConfig: { mode: DynamicRetrievalMode; dynamicThreshold: number };
					};
			  }
			| { googleSearch: Record<string, never> };

		let googleSearchTool: GoogleSearchTool | undefined;
		if (options.useGoogleSearchGrounding) {
			// Check if it's a legacy model (Gemini 1.x) that uses googleSearchRetrieval
			// Look for "gemini-1." anywhere in the model name (covers 1.0, 1.5, etc.)
			const isLegacyModel = /gemini-1\./.test(modelName);

			if (isLegacyModel) {
				// Gemini 1.x uses googleSearchRetrieval with dynamic retrieval config
				googleSearchTool = {
					googleSearchRetrieval: {
						dynamicRetrievalConfig: {
							mode: DynamicRetrievalMode.MODE_DYNAMIC,
							dynamicThreshold: options.dynamicRetrievalThreshold ?? 0.3,
						},
					},
				};
			} else {
				// Gemini 2.0+ and Gemini 3 use the simpler googleSearch tool
				googleSearchTool = {
					googleSearch: {},
				};
			}
		}

		const modelConfig: ConstructorParameters<typeof ChatGoogleGenerativeAI>[0] = {
			apiKey: credentials.apiKey as string,
			baseUrl: credentials.host as string,
			model: modelName,
			topK: options.topK,
			topP: options.topP,
			temperature: options.temperature,
			maxOutputTokens: options.maxOutputTokens,
			safetySettings,
			callbacks: [new N8nLlmTracing(this, { errorDescriptionMapper })],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		};

		const model = new ChatGoogleGenerativeAI(modelConfig);

		// If Google Search grounding is enabled, wrap the model to include the search tool
		// We override bindTools to prepend the Google Search tool to any tools the agent provides
		if (googleSearchTool) {
			const originalBindTools = model.bindTools.bind(model);
			model.bindTools = (tools, kwargs) => {
				// Prepend Google Search tool to the tools array
				const allTools = [googleSearchTool, ...tools];
				return originalBindTools(allTools, kwargs);
			};
		}

		return {
			response: model,
		};
	}
}
