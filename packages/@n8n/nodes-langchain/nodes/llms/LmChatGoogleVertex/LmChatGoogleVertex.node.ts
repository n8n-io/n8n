/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { SafetySetting } from '@google/generative-ai';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { formatPrivateKey } from 'n8n-nodes-base/dist/utils/utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	type JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { makeErrorFromStatus } from './error-handling';
import { additionalOptions } from '../gemini-common/additional-options';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';

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
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
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
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
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
			additionalOptions,
		],
	};

	methods = {
		listSearch: {
			async gcpProjectsList(this: ILoadOptionsFunctions) {
				const results: Array<{ name: string; value: string }> = [];

				const credentials = await this.getCredentials('googleApi');
				const privateKey = formatPrivateKey(credentials.privateKey as string);
				const email = (credentials.email as string).trim();

				const client = new ProjectsClient({
					credentials: {
						client_email: email,
						private_key: privateKey,
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('googleApi');
		const privateKey = formatPrivateKey(credentials.privateKey as string);
		const email = (credentials.email as string).trim();
		const region = credentials.region as string;

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
						client_email: email,
						private_key: privateKey,
					},
				},
				location: region,
				model: modelName,
				topK: options.topK,
				topP: options.topP,
				temperature: options.temperature,
				maxOutputTokens: options.maxOutputTokens,
				safetySettings,
				callbacks: [new N8nLlmTracing(this)],
				// Handle ChatVertexAI invocation errors to provide better error messages
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, (error: any) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					const customError = makeErrorFromStatus(Number(error?.response?.status), {
						modelName,
					});

					if (customError) {
						throw new NodeOperationError(this.getNode(), error as JsonObject, customError);
					}

					throw error;
				}),
			});

			return {
				response: model,
			};
		} catch (e) {
			// Catch model name validation error from LangChain (https://github.com/langchain-ai/langchainjs/blob/ef201d0ee85ee4049078270a0cfd7a1767e624f8/libs/langchain-google-common/src/utils/common.ts#L124)
			// to show more helpful error message
			if (e?.message?.startsWith('Unable to verify model params')) {
				throw new NodeOperationError(this.getNode(), e as JsonObject, {
					message: 'Unsupported model',
					description: "Only models starting with 'gemini' are supported.",
				});
			}

			// Assume all other exceptions while creating a new ChatVertexAI instance are parameter validation errors
			throw new NodeOperationError(this.getNode(), e as JsonObject, {
				message: 'Invalid options',
				description: e.message,
			});
		}
	}
}
