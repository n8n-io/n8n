import type { SafetySetting } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { isRecord } from '@n8n/utils/is-record';
import { NodeConnectionTypes } from 'n8n-workflow';
import { OperationalError, UserError } from '@n8n/errors';
import type {
	NodeError,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	INodeProperties,
	IExecuteSingleFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { getAdditionalOptions } from '../gemini-common/additional-options';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
	proxyFetch,
} from '@n8n/ai-utilities';
import {
	getGoogleModelLabel,
	pinPrioritizedModels,
	shouldIncludeGoogleModel,
} from '@n8n/ai-utilities/model-discovery';

import { MODEL_SELECTION_HINT } from '@utils/model-builder-hints';

/**
 * Gemini returns no candidates when it blocks a prompt. The SDK then gives an empty
 * `generations` list, and LangChain fails with a TypeError on `generations[0][0]`.
 * This class throws an error that tells the user why Gemini did not answer.
 */
export class N8nChatGoogleGenerativeAI extends ChatGoogleGenerativeAI {
	async _generate(...args: Parameters<ChatGoogleGenerativeAI['_generate']>) {
		const result = await super._generate(...args);
		if (result.generations.length > 0) return result;

		const feedback: unknown = result.llmOutput?.filters;
		const blockReason = isRecord(feedback) ? feedback.blockReason : undefined;
		if (typeof blockReason !== 'string') {
			throw new OperationalError('Gemini returned an empty response');
		}
		const detail = isRecord(feedback) ? feedback.blockReasonMessage : undefined;
		throw new UserError(`Gemini blocked the prompt (reason: ${blockReason})`, {
			description: typeof detail === 'string' ? detail : undefined,
		});
	}

	// The SDK skips stream responses without candidates and drops their `promptFeedback`,
	// so a blocked prompt ends the stream with no chunks and no block reason.
	async *_streamResponseChunks(
		...args: Parameters<ChatGoogleGenerativeAI['_streamResponseChunks']>
	) {
		let empty = true;
		for await (const chunk of super._streamResponseChunks(...args)) {
			empty = false;
			yield chunk;
		}
		if (empty && !args[1].signal?.aborted) {
			throw new OperationalError('Gemini returned an empty response');
		}
	}
}

/** Drop non-chat models (embedding, image, TTS, Veo, etc.) from the dropdown. */
async function filterChatModels(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	return items.filter(
		(item) =>
			typeof item.json.name === 'string' &&
			shouldIncludeGoogleModel({
				name: item.json.name,
				supportedGenerationMethods: item.json.supportedGenerationMethods,
			}),
	);
}

/** Show models under the name the API reports, sorted by it, with prioritized models first. */
async function labelModels(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const labelled = items.map((item) => {
		// `displayName` and `priority` only carry the API's values to here; options do not keep them.
		const { displayName, priority, ...option } = item.json;
		const json =
			typeof option.value === 'string'
				? {
						...option,
						name: getGoogleModelLabel(
							option.value,
							typeof displayName === 'string' ? displayName : undefined,
						),
					}
				: option;
		return { item: { ...item, json }, priority };
	});
	labelled.sort((a, b) => String(a.item.json.name).localeCompare(String(b.item.json.name)));
	return pinPrioritizedModels(labelled, (entry) => entry.priority).map((entry) => entry.item);
}

function errorDescriptionMapper(error: NodeError) {
	if (error.description?.includes('properties: should be non-empty for OBJECT type')) {
		return 'Google Gemini requires at least one <a href="https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/" target="_blank">dynamic parameter</a> when using tools';
	}

	return error.description ?? 'Unknown error';
}

const modelRLC: INodeProperties = {
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
								pass: "={{ !$responseItem.name.includes('embedding') && !$responseItem.name.includes('imagen') }}",
							},
						},
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.name}}',
								value: '={{$responseItem.name}}',
								description: '={{$responseItem.description}}',
								displayName: '={{$responseItem.displayName}}',
								priority: '={{$responseItem.priority}}',
							},
						},
						labelModels,
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
	builderHint: {
		// The dropdown loads through declarative routing, which the builder's resource lookup cannot call.
		propertyHint:
			'This node declares no model-list lookup, so its models cannot be listed, even with a connected credential. For a new choice, use current Google provider catalog information and choose a Gemini 3.x or newer model ID with the "models/" prefix. Do not choose Gemini 2.x or older. ' +
			MODEL_SELECTION_HINT,
	},
};

// v1.2+: same routing as modelRLC, but the dropdown drops non-chat models
// (embedding, image) through the shared `shouldIncludeGoogleModel` predicate.
const modelRLCV2: INodeProperties = {
	...modelRLC,
	default: 'models/gemini-3-flash-preview',
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
						filterChatModels,
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.name}}',
								value: '={{$responseItem.name}}',
								description: '={{$responseItem.description}}',
								displayName: '={{$responseItem.displayName}}',
								priority: '={{$responseItem.priority}}',
							},
						},
						labelModels,
					],
				},
			},
		},
	},
};

export class LmChatGoogleGemini implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Gemini Chat Model',

		name: 'lmChatGoogleGemini',
		icon: 'file:google.svg',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Run Gemini models, with optional adjustable safety filters',
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
				...modelRLC,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { eq: 1 } }],
					},
				},
			},
			{
				...modelRLC,
				default: 'models/gemini-3-flash-preview',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { eq: 1.1 } }],
					},
				},
			},
			{
				...modelRLCV2,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
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

		const egressFilter = this.helpers.getSecureEgressFilter();
		const model = new N8nChatGoogleGenerativeAI({
			apiKey: credentials.apiKey as string,
			baseUrl: credentials.host as string,
			fetch: async (input: RequestInfo | URL, init?: RequestInit) =>
				await proxyFetch({ input, init, egressFilter }),
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
