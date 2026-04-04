import { ProjectsClient } from '@google-cloud/resource-manager';
import type { GoogleAISafetySetting } from '@langchain/google-common';
import { ChatVertexAI, type ChatVertexAIInput } from '@langchain/google-vertexai';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import { formatPrivateKey } from 'n8n-nodes-base/dist/utils/utilities';
import {
	NodeConnectionTypes,
	type INode,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
	type JsonObject,
	NodeOperationError,
	validateNodeParameters,
} from 'n8n-workflow';

import { makeErrorFromStatus } from './error-handling';
import { applyVertexAutoContextCachePatch } from './context-caching/auto/auto-cache';
import { applyPredefinedVertexContextCachePatch } from './context-caching/predefined/predefined-context-cache-patch';
import {
	buildVertexContextCacheRedisBaseKey,
	RedisContextCacheMetadataStorage,
} from './context-caching/auto/storage/redis';
import { getAdditionalOptions } from '../gemini-common/additional-options';

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
		credentials: [
			{
				name: 'googleApi',
				required: true,
			},
			{
				displayName: 'Redis (auto-cache metadata)',
				name: 'redis',
				required: true,
				displayOptions: {
					show: {
						contextCacheStrategy: ['auto'],
					},
				},
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
				default: 'gemini-2.5-flash',
			},
			{
				displayName: 'Context Caching Strategy',
				name: 'contextCacheStrategy',
				type: 'options',
				default: 'none',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Auto-caching', value: 'auto' },
					{ name: 'Predefined cache', value: 'predefined' },
				],
				description: 'Select how this node should use Vertex context caching.',
			},
			{
				displayName:
					'With Predefined cache, system instructions from your workflow and tool definitions from the AI Agent are not sent to the model. The Vertex context cache resource you configure replaces that context. If the cache does not match what the agent expects, behavior can be inconsistent or incorrect.',
				name: 'vertexPredefinedCacheContextNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						contextCacheStrategy: ['predefined'],
					},
				},
			},
			{
				displayName: 'Context Cache TTL (Seconds)',
				name: 'contextCacheTtlSeconds',
				type: 'number',
				default: 86400,
				required: true,
				typeOptions: { minValue: 300, numberPrecision: 0 },
				displayOptions: {
					show: {
						contextCacheStrategy: ['auto'],
					},
				},
				description:
					'How long new Vertex cached contents remain valid (TTL sent to Google). After expiry, the next run recreates the cache.',
			},
			{
				displayName:
					'Connect Redis in the credentials tab. It stores small metadata records so n8n can reuse automatically created Vertex context caches when using Auto-caching. Cached prompts and tools still live in Google Cloud - Redis is only for coordination.',
				name: 'vertexAutoCacheRedisHelpNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						contextCacheStrategy: ['auto'],
					},
				},
			},
			{
				displayName: 'Context Cache Storage Prefix',
				name: 'vertexContextCacheRedisKeyPrefix',
				type: 'string',
				default: 'n8n:vertexCtx',
				required: true,
				displayOptions: {
					show: {
						contextCacheStrategy: ['auto'],
					},
				},
				description:
					'Prefix for keys in Redis where this workflow stores auto-cache metadata. Use a unique value if several n8n instances or environments share the same Redis. Allowed characters: letters, numbers, underscores, hyphens, colons, and dots (max 200 characters).',
			},
			{
				displayName: 'Context Cache Name',
				name: 'contextCacheName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						contextCacheStrategy: ['predefined'],
					},
				},
				description:
					'Full Vertex AI context cache resource name passed as cachedContent to generateContent, for example projects/PROJECT_NUMBER/locations/LOCATION/cachedContents/CACHE_ID. <a href="https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-use">Learn more</a>.',
			},
			getAdditionalOptions({
				supportsThinkingBudget: true,
			}),
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
		});

		const contextCacheStrategy = this.getNodeParameter(
			'contextCacheStrategy',
			itemIndex,
			'none',
		) as string;

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

		if (contextCacheStrategy === 'predefined') {
			const contextCacheName = (
				this.getNodeParameter('contextCacheName', itemIndex, '') as string
			).trim();
			if (contextCacheName === '') {
				throw new NodeOperationError(this.getNode(), {
					message: 'Context Cache Name is required',
					description: 'Set Context Cache Name when using the Predefined cache strategy.',
				});
			}
		}
		if (contextCacheStrategy === 'auto') {
			const ttlRaw = this.getNodeParameter('contextCacheTtlSeconds', itemIndex);
			if (
				ttlRaw === undefined ||
				ttlRaw === null ||
				typeof ttlRaw !== 'number' ||
				!Number.isFinite(ttlRaw)
			) {
				throw new NodeOperationError(this.getNode(), {
					message: 'Context Cache TTL is required',
					description: 'Set Context Cache TTL (seconds) when using Auto-caching.',
				});
			}

			const prefixRaw = this.getNodeParameter(
				'vertexContextCacheRedisKeyPrefix',
				itemIndex,
				'',
			) as string;
			const prefix = prefixRaw.trim();
			if (prefix === '') {
				throw new NodeOperationError(this.getNode(), {
					message: 'Context cache storage prefix is required',
					description:
						'Set Context Cache Storage Prefix when using Auto-caching, or keep the default.',
				});
			}
			if (prefix.length > 200) {
				throw new NodeOperationError(this.getNode(), {
					message: 'Context cache storage prefix is too long',
					description: 'Use at most 200 characters for the storage prefix.',
				});
			}
			if (!/^[\w:.-]+$/.test(prefix)) {
				throw new NodeOperationError(this.getNode(), {
					message: 'Invalid context cache storage prefix',
					description:
						'The prefix may only contain letters, numbers, underscores, hyphens, colons, and dots.',
				});
			}
		}

		const safetySettings = this.getNodeParameter(
			'options.safetySettings.values',
			itemIndex,
			null,
		) as GoogleAISafetySetting[];

		try {
			const modelConfig: ChatVertexAIInput = {
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
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, (error: unknown) => {
					const failure = error as { response?: { status?: unknown } };
					const customError = makeErrorFromStatus(Number(failure.response?.status), {
						modelName,
					});

					if (customError) {
						throw new NodeOperationError(this.getNode(), error as JsonObject, customError);
					}

					throw error;
				}),
			};

			// Add thinkingBudget if specified
			if (options.thinkingBudget !== undefined) {
				modelConfig.thinkingBudget = options.thinkingBudget;
			}

			const model = new ChatVertexAI(modelConfig);
			const autoContextCache = contextCacheStrategy === 'auto';
			const predefinedContextCache = contextCacheStrategy === 'predefined';
			const ttlRaw =
				contextCacheStrategy === 'auto'
					? this.getNodeParameter('contextCacheTtlSeconds', itemIndex)
					: undefined;
			const contextCacheTtlSeconds =
				typeof ttlRaw === 'number' && Number.isFinite(ttlRaw)
					? Math.max(300, Math.floor(ttlRaw))
					: 86400;

			if (autoContextCache) {
				const parentNode = (this as ISupplyDataFunctions & { parentNode?: INode }).parentNode;
				const parentNodeId = parentNode?.id ?? this.getNode().id;
				const workflowId = this.getWorkflow().id ?? 'unknown';
				const redisCredentials = await this.getCredentials('redis');
				const redisKeyPrefix = (
					this.getNodeParameter('vertexContextCacheRedisKeyPrefix', itemIndex) as string
				).trim();
				const redisBaseKey = buildVertexContextCacheRedisBaseKey(
					redisKeyPrefix,
					workflowId,
					parentNodeId,
				);
				const metadataStorage = new RedisContextCacheMetadataStorage(
					redisCredentials,
					this.getNode().typeVersion,
					redisBaseKey,
				);
				applyVertexAutoContextCachePatch(model, this, {
					metadataStorage,
					contextCacheTtlSeconds,
					credentials,
					location: region,
					modelName,
					parentNodeId,
					projectId,
				});
				return {
					response: model,
				};
			}

			const contextCacheName = predefinedContextCache
				? (this.getNodeParameter('contextCacheName', itemIndex, '') as string).trim()
				: '';
			// LangChain's withConfig() returns RunnableBinding (lc_namespace: runnables), which fails
			// n8n's Tools Agent check (isChatInstance + bindTools). Merge cachedContent via
			// invocationParams instead so the instance stays a ChatVertexAI.
			if (contextCacheName !== '') {
				applyPredefinedVertexContextCachePatch(model, this, contextCacheName);
			}

			return {
				response: model,
			};
		} catch (caught) {
			// Catch model name validation error from LangChain (https://github.com/langchain-ai/langchainjs/blob/ef201d0ee85ee4049078270a0cfd7a1767e624f8/libs/langchain-google-common/src/utils/common.ts#L124)
			// to show more helpful error message
			const message = caught instanceof Error ? caught.message : String(caught);
			if (message.startsWith('Unable to verify model params')) {
				throw new NodeOperationError(this.getNode(), caught as JsonObject, {
					message: 'Unsupported model',
					description: "Only models starting with 'gemini' are supported.",
				});
			}

			// Assume all other exceptions while creating a new ChatVertexAI instance are parameter validation errors
			throw new NodeOperationError(this.getNode(), caught as JsonObject, {
				message: 'Invalid options',
				description: message,
			});
		}
	}
}
