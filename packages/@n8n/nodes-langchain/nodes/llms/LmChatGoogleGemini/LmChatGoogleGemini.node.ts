/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { SafetySetting } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { additionalOptions } from '../gemini-common/additional-options';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

export class LmChatGoogleGemini implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Gemini Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiLanguageModel],
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
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
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
				default: 'models/gemini-1.0-pro',
			},
			additionalOptions,
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

		const model = new ChatGoogleGenerativeAI({
			apiKey: credentials.apiKey as string,
			modelName,
			topK: options.topK,
			topP: options.topP,
			temperature: options.temperature,
			maxOutputTokens: options.maxOutputTokens,
			safetySettings,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
