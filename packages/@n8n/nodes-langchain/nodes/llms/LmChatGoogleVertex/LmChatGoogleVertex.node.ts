import { ProjectsClient } from '@google-cloud/resource-manager';
import { getGoogleServiceAccountCredentials } from 'n8n-nodes-base/google-service-account';
import type { GoogleAISafetySetting } from '@langchain/google-common';
import { ChatVertexAI, type ChatVertexAIInput } from '@langchain/google-vertexai';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	type JsonObject,
	type NodeError,
	NodeOperationError,
	validateNodeParameters,
} from 'n8n-workflow';

import { MODEL_SELECTION_HINT } from '@utils/model-builder-hints';

import { extractGoogleErrorMessage, makeErrorFromStatus } from './error-handling';
import { getAdditionalOptions } from '../gemini-common/additional-options';
import { getVertexEndpoint, vertexLocationField } from '../gemini-common/vertex-location';

import {
	googleVertexAuthentication,
	googleVertexCredentials,
	resolveGoogleVertexCredentials,
} from '@utils/google-vertex';

function errorDescriptionMapper(error: NodeError) {
	if (error.description?.includes('properties: should be non-empty for OBJECT type')) {
		return 'Google Vertex requires at least one <a href="https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/" target="_blank">dynamic parameter</a> when using tools';
	}

	return error.description ?? 'Unknown error';
}

export class LmChatGoogleVertex implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Vertex Chat Model',

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

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: googleVertexCredentials,
		properties: [
			googleVertexAuthentication,
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Project ID',
				name: 'projectId',
				displayOptions: { show: { authentication: ['googleApi'] } },
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
				default: 'gemini-2.5-flash',
				builderHint: {
					propertyHint:
						'Choose a stable Gemini model from the Vertex model list for the configured project and location. Do not copy Gemini API model IDs into Vertex without checking the list. ' +
						MODEL_SELECTION_HINT,
				},
			},
			vertexLocationField,
			getAdditionalOptions({ supportsThinkingBudget: true }),
		],
	};

	methods = {
		listSearch: {
			async gcpProjectsList(this: ILoadOptionsFunctions) {
				const results: Array<{ name: string; value: string }> = [];

				const credentials = await this.getCredentials('googleApi');
				const client = new ProjectsClient({
					credentials: getGoogleServiceAccountCredentials(credentials),
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
		const { projectId, credentials, location } = await resolveGoogleVertexCredentials(
			this,
			itemIndex,
		);
		const endpoint = getVertexEndpoint(location);

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;

		const options = this.getNodeParameter('options', itemIndex, {
			maxOutputTokens: 2048,
			temperature: 0.4,
			topK: 40,
			topP: 0.9,
		});

		// Validate options parameter
		validateNodeParameters(
			options,
			{
				maxOutputTokens: { type: 'number', required: false },
				temperature: { type: 'number', required: false },
				topK: { type: 'number', required: false },
				topP: { type: 'number', required: false },
				thinkingBudget: { type: 'number', required: false },
			},
			this.getNode(),
		);

		const safetySettings = this.getNodeParameter(
			'options.safetySettings.values',
			itemIndex,
			null,
		) as GoogleAISafetySetting[];

		try {
			const modelConfig: ChatVertexAIInput = {
				authOptions: {
					projectId,
					credentials,
				},
				location,
				...(endpoint ? { endpoint } : {}),
				model: modelName,
				topK: options.topK,
				topP: options.topP,
				temperature: options.temperature,
				maxOutputTokens: options.maxOutputTokens,
				safetySettings,
				callbacks: [new N8nLlmTracing(this, { errorDescriptionMapper })],
				// Handle ChatVertexAI invocation errors to provide better error messages
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, (error: any) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					const status = Number(error?.response?.status);
					const customError = makeErrorFromStatus(status, {
						modelName,
					});

					if (customError) {
						throw new NodeOperationError(this.getNode(), error as JsonObject, customError);
					}

					if (status === 400) {
						// Surface Google's error detail; a bare rethrow would hide it behind a
						// generic "Bad request" wrapper
						throw new NodeOperationError(this.getNode(), error as JsonObject, {
							message: 'Bad request - please check your parameters',
							description:
								extractGoogleErrorMessage(error as { message?: string }) ??
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
								(typeof error?.message === 'string' ? (error.message as string) : undefined),
						});
					}

					throw error;
				}),
			};

			// Add thinkingBudget if specified
			if (options.thinkingBudget !== undefined) {
				modelConfig.thinkingBudget = options.thinkingBudget;
			}

			const model = new ChatVertexAI(modelConfig);

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
