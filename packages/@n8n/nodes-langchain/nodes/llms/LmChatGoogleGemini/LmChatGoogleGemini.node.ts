import type { SafetySetting } from '@google/generative-ai';
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
import {
	isMalformedLlmResponseError,
	createEmptyChatResult,
} from '../gemini-common/response-guard';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing } from '@n8n/ai-utilities';

/**
 * Safe wrapper around ChatGoogleGenerativeAI that handles malformed API responses.
 *
 * The @langchain/google-genai package crashes with "Cannot read properties of undefined
 * (reading 'parts')" when the Gemini API returns a candidate without a `content` field.
 * This subclass intercepts that specific error and returns a valid empty response,
 * allowing the agent pipeline to handle it gracefully instead of crashing.
 */
class SafeChatGoogleGenerativeAI extends ChatGoogleGenerativeAI {
	static override lc_name() {
		return 'ChatGoogleGenerativeAI';
	}

	override async _generate(
		...args: Parameters<ChatGoogleGenerativeAI['_generate']>
	): ReturnType<ChatGoogleGenerativeAI['_generate']> {
		try {
			return await super._generate(...args);
		} catch (error) {
			if (isMalformedLlmResponseError(error)) {
				return createEmptyChatResult();
			}
			throw error;
		}
	}

	override async *_streamResponseChunks(
		...args: Parameters<ChatGoogleGenerativeAI['_streamResponseChunks']>
	): ReturnType<ChatGoogleGenerativeAI['_streamResponseChunks']> {
		try {
			yield* super._streamResponseChunks(...args);
		} catch (error) {
			if (isMalformedLlmResponseError(error)) {
				// End the stream cleanly — the agent will see an empty response
				return;
			}
			throw error;
		}
	}
}

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
			getAdditionalOptions({ supportsThinkingBudget: false }),
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('googlePalmApi');

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {
			maxOutputTokens: 1024,
			temperature: 0.7,
			topK: 40,
			topP: 0.9,
		}) as {
			maxOutputTokens: number;
			temperature: number;
			topK: number;
			topP: number;
		};

		const safetySettings = this.getNodeParameter(
			'options.safetySettings.values',
			itemIndex,
			null,
		) as SafetySetting[];

		const model = new SafeChatGoogleGenerativeAI({
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
		});

		return {
			response: model,
		};
	}
}
