/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	type ILoadOptionsFunctions,
} from 'n8n-workflow';
import { ChatVertexAI } from '@langchain/google-vertexai';
import type { HarmBlockThreshold, HarmCategory, SafetySetting } from '@google/generative-ai';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { harmCategories, harmThresholds } from './options';

export class LmChatGoogleVertex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Vertex Chat Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmChatGoogleVertex',
		icon: 'file:google.svg',
		group: ['transform'],
		version: 1,
		description: 'Chat Model Google Vertex',
		defaults: {
			name: 'Google Vertex Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgooglevertex/',
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
				name: 'googleApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select or enter your Google Cloud project ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'gcpProjectsList',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				description:
					'The model which will generate the completion. <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models">Learn more</a>.',
				default: 'gemini-1.5-flash',
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
						displayName: 'Maximum Number of Tokens',
						name: 'maxOutputTokens',
						default: 2048,
						description: 'The maximum number of tokens to generate in the completion',
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.4,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Top K',
						name: 'topK',
						default: 32,
						typeOptions: { maxValue: 40, minValue: -1, numberPrecision: 1 },
						description:
							'Used to remove "long tail" low probability responses. Defaults to -1, which disables it.',
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

					// Safety Settings
					{
						displayName: 'Safety Settings',
						name: 'safetySettings',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						default: {
							values: {
								category: harmCategories[0].name as HarmCategory,
								threshold: harmThresholds[0].name as HarmBlockThreshold,
							},
						},
						placeholder: 'Add Option',
						options: [
							{
								name: 'values',
								displayName: 'Values',
								values: [
									{
										displayName: 'Safety Category',
										name: 'category',
										type: 'options',
										description: 'The category of harmful content to block',
										default: 'HARM_CATEGORY_UNSPECIFIED',
										options: harmCategories,
									},
									{
										displayName: 'Safety Threshold',
										name: 'threshold',
										type: 'options',
										description: 'The threshold of harmful content to block',
										default: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
										options: harmThresholds,
									},
								],
							},
						],
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async gcpProjectsList(this: ILoadOptionsFunctions) {
				const results: Array<{ name: string; value: string }> = [];

				const credentials = await this.getCredentials('googleApi');

				const client = new ProjectsClient({
					credentials: {
						client_email: credentials.email as string,
						private_key: credentials.privateKey as string,
					},
				});

				const [projects] = await client.searchProjects();

				for (const project of projects) {
					if (project.projectId) {
						results.push({
							name: project.displayName ?? project.projectId,
							value: project.projectId,
						});
					}
				}

				return { results };
			},
		},
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('googleApi');

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;

		const projectId = this.getNodeParameter('projectId', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = this.getNodeParameter('options', itemIndex, {
			maxOutputTokens: 2048,
			temperature: 0.4,
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

		try {
			const model = new ChatVertexAI({
				authOptions: {
					projectId,
					credentials: {
						client_email: credentials.email as string,
						private_key: credentials.privateKey as string,
					},
				},
				model: modelName,
				topK: options.topK,
				topP: options.topP,
				temperature: options.temperature,
				maxOutputTokens: options.maxOutputTokens,
				safetySettings,
				callbacks: [new N8nLlmTracing(this)],
			});

			return {
				response: model,
			};
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}
