import {
	ChatHubConversationModel,
	ChatSessionId,
	type ChatHubBaseLLMModel,
	type ChatHubInputModality,
	type ChatModelMetadataDto,
	type ChatHubAgentKnowledgeItem,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	SharedWorkflow,
	SharedWorkflowRepository,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
	ExecutionRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	createRunExecutionData,
	DOCUMENT_DEFAULT_DATA_LOADER_NODE_TYPE,
	IConnections,
	IExecuteData,
	INode,
	INodeCredentials,
	IRunExecutionData,
	IWorkflowBase,
	ManualExecutionCancelledError,
	MEMORY_BUFFER_WINDOW_NODE_TYPE,
	MEMORY_MANAGER_NODE_TYPE,
	MERGE_NODE_TYPE,
	NodeConnectionTypes,
	OperationalError,
	VECTOR_STORE_SIMPLE_NODE_TYPE,
	VECTOR_STORE_TOOL_NODE_TYPE,
	type IBinaryData,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ChatHubMessage } from './chat-hub-message.entity';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import {
	EMBEDDINGS_NODE_TYPE_MAP,
	EXECUTION_FINISHED_STATUSES,
	EXECUTION_POLL_INTERVAL,
	getModelMetadata,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
} from './chat-hub.constants';
import {
	MessageRecord,
	type ContentBlock,
	type ChatTriggerResponseMode,
	type VectorStoreSearchOptions,
	type ChatInput,
} from './chat-hub.types';
import { getMaxContextWindowTokens } from './context-limits';
import { inE2ETests } from '../../constants';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { ActiveExecutions } from '@/active-executions';
import { InstanceSettings } from 'n8n-core';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';

@Service()
export class ChatHubWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionRepository: ExecutionRepository,
	) {}

	async createChatWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		projectId: string,
		history: MessageRecord[],
		input: ChatInput,
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		systemMessage: string,
		tools: INode[],
		vectorStoreSearch: VectorStoreSearchOptions | null,
		trx?: EntityManager,
	): Promise<{
		workflowData: IWorkflowBase;
		executionData: IRunExecutionData;
		responseMode: ChatTriggerResponseMode;
	}> {
		return await withTransaction(this.workflowRepository.manager, trx, async (em) => {
			this.logger.debug(
				`Creating chat workflow for user ${userId} and session ${sessionId}, provider ${model.provider}`,
			);

			const { nodes, connections, executionData } = await this.buildChatWorkflow({
				userId,
				sessionId,
				history,
				input,
				credentials,
				model,
				systemMessage,
				tools,
				vectorStoreSearch,
			});

			const newWorkflow = new WorkflowEntity();

			// Chat workflows are created as archived to hide them
			// from the user by default while they are being run.
			newWorkflow.isArchived = true;

			newWorkflow.versionId = uuidv4();
			newWorkflow.name = `Chat ${sessionId}`;
			newWorkflow.active = false;
			newWorkflow.activeVersionId = null;
			newWorkflow.nodes = nodes;
			newWorkflow.connections = connections;
			newWorkflow.settings = {
				executionOrder: 'v1',
			};

			const workflow = await em.save<WorkflowEntity>(newWorkflow);

			await em.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId,
					workflow,
				}),
			);

			return {
				workflowData: workflow,
				executionData,
				responseMode: 'streaming',
			};
		});
	}

	async createTitleGenerationWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		projectId: string,
		humanMessage: string,
		attachments: IBinaryData[],
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		trx?: EntityManager,
	): Promise<{ workflowData: IWorkflowBase; executionData: IRunExecutionData }> {
		return await withTransaction(this.workflowRepository.manager, trx, async (em) => {
			this.logger.debug(
				`Creating title generation workflow for user ${userId} and session ${sessionId}, provider ${model.provider}`,
			);

			const { nodes, connections, executionData } = this.buildTitleGenerationWorkflow(
				userId,
				sessionId,
				credentials,
				model,
				humanMessage,
				attachments,
			);

			const newWorkflow = new WorkflowEntity();

			// Chat workflows are created as archived to hide them
			// from the user by default while they are being run.
			newWorkflow.isArchived = true;

			newWorkflow.versionId = uuidv4();
			newWorkflow.name = `Chat ${sessionId} (Title Generation)`;
			newWorkflow.active = false;
			newWorkflow.activeVersionId = null;
			newWorkflow.nodes = nodes;
			newWorkflow.connections = connections;
			newWorkflow.settings = {
				executionOrder: 'v1',
				// Ensure chat workflows save data on successful executions regardless of instance settings
				// This is done to ensure generated title can be read after execution.
				saveDataSuccessExecution: 'all',
			};

			const workflow = await em.save<WorkflowEntity>(newWorkflow);

			await em.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId,
					workflow,
				}),
			);

			return {
				workflowData: workflow,
				executionData,
			};
		});
	}

	prepareExecutionData(
		triggerNode: INode,
		sessionId: string,
		{ message, attachments }: ChatInput,
	): IExecuteData[] {
		// Attachments are already processed (id field populated) by the caller
		return [
			{
				node: triggerNode,
				data: {
					main: [
						[
							{
								json: {
									sessionId,
									action: 'sendMessage',
									chatInput: message,
									files: attachments.map(({ data, ...metadata }) => metadata),
								},
								binary: Object.fromEntries(
									attachments.map((attachment, index) => [`data${index}`, attachment]),
								),
							},
						],
					],
				},
				source: null,
			},
		];
	}

	/**
	 * Parses input modalities from chat trigger options
	 * Converts MIME types string to ChatHubInputModality array
	 */
	parseInputModalities(options?: {
		allowFileUploads?: boolean;
		allowedFilesMimeTypes?: string;
	}): ChatHubInputModality[] {
		const allowFileUploads = options?.allowFileUploads ?? false;
		const allowedFilesMimeTypes = options?.allowedFilesMimeTypes;

		if (!allowFileUploads) {
			return ['text'];
		}

		if (!allowedFilesMimeTypes || allowedFilesMimeTypes === '*/*') {
			return ['text', 'image', 'audio', 'video', 'file'];
		}

		const mimeTypes = allowedFilesMimeTypes.split(',').map((type) => type.trim());
		const modalities = new Set<ChatHubInputModality>(['text']);

		for (const mimeType of mimeTypes) {
			modalities.add(this.getMimeTypeModality(mimeType));
		}

		return Array.from(modalities);
	}

	private getUniqueNodeName(originalName: string, existingNames: Set<string>): string {
		if (!existingNames.has(originalName)) {
			return originalName;
		}

		let index = 1;
		let uniqueName = `${originalName}${index}`;

		while (existingNames.has(uniqueName)) {
			index++;
			uniqueName = `${originalName}${index}`;
		}

		return uniqueName;
	}

	private async buildChatWorkflow({
		userId,
		sessionId,
		history,
		input,
		credentials,
		model,
		systemMessage,
		tools,
		vectorStoreSearch,
	}: {
		userId: string;
		sessionId: ChatSessionId;
		history: MessageRecord[];
		input: ChatInput;
		credentials: INodeCredentials;
		model: ChatHubBaseLLMModel;
		systemMessage: string;
		tools: INode[];
		vectorStoreSearch: VectorStoreSearchOptions | null;
	}) {
		const chatTriggerNode = this.buildChatTriggerNode();
		const toolsAgentNode = this.buildToolsAgentNode(model, systemMessage);
		const modelNode = this.buildModelNode(credentials, model);
		const memoryNode = this.buildMemoryNode(20);
		const restoreMemoryNode = await this.buildRestoreMemoryNode(history);
		const clearMemoryNode = this.buildClearMemoryNode();
		const mergeNode = this.buildMergeNode();

		const nodes: INode[] = [
			chatTriggerNode,
			toolsAgentNode,
			modelNode,
			memoryNode,
			restoreMemoryNode,
			clearMemoryNode,
			mergeNode,
			...(vectorStoreSearch ? this.buildVectorStoreNodes(vectorStoreSearch) : []),
		];

		const nodeNames = new Set(nodes.map((node) => node.name));
		const distinctTools = tools.map((tool, i) => {
			// Spread out the tool nodes so that they don't overlap on the canvas
			const position = [
				700 + Math.floor(i / 3) * 60 + (i % 3) * 120,
				300 + Math.floor(i / 3) * 120 - (i % 3) * 30,
			];

			const name = this.getUniqueNodeName(tool.name, nodeNames);
			nodeNames.add(name);

			return {
				...tool,
				name,
				position,
			};
		});

		nodes.push.apply(nodes, distinctTools);

		const connections: IConnections = {
			[NODE_NAMES.CHAT_TRIGGER]: {
				[NodeConnectionTypes.Main]: [
					[
						{ node: NODE_NAMES.RESTORE_CHAT_MEMORY, type: NodeConnectionTypes.Main, index: 0 },
						{ node: NODE_NAMES.MERGE, type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			[NODE_NAMES.RESTORE_CHAT_MEMORY]: {
				[NodeConnectionTypes.Main]: [
					[{ node: NODE_NAMES.MERGE, type: NodeConnectionTypes.Main, index: 1 }],
				],
			},
			[NODE_NAMES.MERGE]: {
				[NodeConnectionTypes.Main]: [
					[{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			[NODE_NAMES.CHAT_MODEL]: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						...(vectorStoreSearch
							? [
									{
										node: NODE_NAMES.VECTOR_STORE_QUESTION_TOOL,
										type: NodeConnectionTypes.AiLanguageModel,
										index: 0,
									},
								]
							: []),
					],
				],
			},
			[NODE_NAMES.MEMORY]: {
				[NodeConnectionTypes.AiMemory]: [
					[
						{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.AiMemory, index: 0 },
						{ node: NODE_NAMES.RESTORE_CHAT_MEMORY, type: NodeConnectionTypes.AiMemory, index: 0 },
						{ node: NODE_NAMES.CLEAR_CHAT_MEMORY, type: NodeConnectionTypes.AiMemory, index: 0 },
					],
				],
			},
			[NODE_NAMES.REPLY_AGENT]: {
				[NodeConnectionTypes.Main]: [
					[
						{
							node: NODE_NAMES.CLEAR_CHAT_MEMORY,
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
			...distinctTools.reduce<IConnections>((acc, tool) => {
				acc[tool.name] = {
					[NodeConnectionTypes.AiTool]: [
						[
							{
								node: NODE_NAMES.REPLY_AGENT,
								type: NodeConnectionTypes.AiTool,
								index: 0,
							},
						],
					],
				};

				return acc;
			}, {}),
			...(vectorStoreSearch
				? {
						[NODE_NAMES.EMBEDDINGS_MODEL]: {
							[NodeConnectionTypes.AiEmbedding]: [
								[
									{
										node: NODE_NAMES.VECTOR_STORE,
										type: NodeConnectionTypes.AiEmbedding,
										index: 0,
									},
								],
							],
						},
						[NODE_NAMES.VECTOR_STORE]: {
							[NodeConnectionTypes.AiVectorStore]: [
								[
									{
										node: NODE_NAMES.VECTOR_STORE_QUESTION_TOOL,
										type: NodeConnectionTypes.AiVectorStore,
										index: 0,
									},
								],
							],
						},
						[NODE_NAMES.VECTOR_STORE_QUESTION_TOOL]: {
							[NodeConnectionTypes.AiTool]: [
								[
									{
										node: NODE_NAMES.REPLY_AGENT,
										type: NodeConnectionTypes.AiTool,
										index: 0,
									},
								],
							],
						},
					}
				: {}),
		};

		const nodeExecutionStack = this.prepareExecutionData(chatTriggerNode, sessionId, input);

		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
			manualData: {
				userId,
			},
		});

		return { nodes, connections, executionData };
	}

	private buildTitleGenerationWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		humanMessage: string,
		attachments: IBinaryData[],
	) {
		const chatTriggerNode = this.buildChatTriggerNode();
		const titleGeneratorAgentNode = this.buildTitleGeneratorAgentNode(
			humanMessage,
			attachments.map((binaryData) => ({ type: 'file', binaryData })),
		);
		const modelNode = this.buildModelNode(credentials, model);

		const nodes: INode[] = [chatTriggerNode, titleGeneratorAgentNode, modelNode];

		const connections: IConnections = {
			[NODE_NAMES.CHAT_TRIGGER]: {
				[NodeConnectionTypes.Main]: [
					[{ node: NODE_NAMES.TITLE_GENERATOR_AGENT, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			[NODE_NAMES.CHAT_MODEL]: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[
						{
							node: NODE_NAMES.TITLE_GENERATOR_AGENT,
							type: NodeConnectionTypes.AiLanguageModel,
							index: 0,
						},
					],
				],
			},
		};

		const nodeExecutionStack: IExecuteData[] = [
			{
				node: chatTriggerNode,
				data: {
					[NodeConnectionTypes.Main]: [
						[
							{
								json: {
									sessionId,
									action: 'sendMessage',
									chatInput: humanMessage,
								},
							},
						],
					],
				},
				source: null,
			},
		];

		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
			manualData: {
				userId,
			},
		});
		return { nodes, connections, executionData };
	}

	private buildChatTriggerNode(): INode {
		return {
			parameters: {},
			type: CHAT_TRIGGER_NODE_TYPE,
			typeVersion: 1.4,
			position: [-448, -112],
			id: uuidv4(),
			name: NODE_NAMES.CHAT_TRIGGER,
			webhookId: uuidv4(),
		};
	}

	// TODO: move to chat-hub service
	getSystemMessageMetadata(timeZone: string) {
		const now = inE2ETests ? DateTime.fromISO('2025-01-15T12:00:00.000Z') : DateTime.now();
		const isoTime = now.setZone(timeZone).toISO({ includeOffset: true });

		return `
## Date and time

The user's current local date and time is: ${isoTime} (timezone: ${timeZone}).
When you need to reference "now", use this date and time.


## Capabilities

You may *analyze* and *explain* provided multimedia contents, but you can ONLY *produce text responses*.
You cannot create, generate, edit, or display images, videos, or other non-text content.
If the user asks you to generate or edit an image (or other media), explain that you are not able to do that and, if helpful, describe in words what the image could look like or how they could create it using external tools.


## Context files

If context files are provided by the user,
- Take them into account for generating relevant answers.
- Do NOT proactively mention, analyze, summarize or explain them until requested.

BAD: "I've received three files: [list and summary]"
BAD: "I'll use ${NODE_NAMES.VECTOR_STORE_QUESTION_TOOL} to answer your questions."
GOOD: "Hello! How can I help you?"
`;
	}

	getBaseSystemMessage(timeZone: string) {
		return `You are a helpful assistant.

${this.getSystemMessageMetadata(timeZone)}`;
	}

	private buildToolsAgentNode(
		model: ChatHubConversationModel,
		systemMessage: string,
		enableStreaming = true,
	): INode {
		return {
			parameters: {
				promptType: 'define',
				text: `={{ $('${NODE_NAMES.CHAT_TRIGGER}').item.json.chatInput }}`,
				options: {
					enableStreaming,
					maxTokensFromMemory:
						model.provider !== 'n8n' && model.provider !== 'custom-agent'
							? getMaxContextWindowTokens(model.provider, model.model)
							: undefined,
					systemMessage,
				},
			},
			type: AGENT_LANGCHAIN_NODE_TYPE,
			typeVersion: 3,
			position: [608, 0],
			id: uuidv4(),
			name: NODE_NAMES.REPLY_AGENT,
		};
	}

	private buildModelNode(
		credentials: INodeCredentials,
		conversationModel: ChatHubConversationModel,
	): INode {
		if (conversationModel.provider === 'n8n' || conversationModel.provider === 'custom-agent') {
			throw new OperationalError('Custom agent workflows do not require a model node');
		}

		const { provider, model } = conversationModel;
		const common = {
			position: [608, 512] satisfies [number, number],
			id: uuidv4(),
			name: NODE_NAMES.CHAT_MODEL,
			credentials,
			type: PROVIDER_NODE_TYPE_MAP[provider].name,
			typeVersion: PROVIDER_NODE_TYPE_MAP[provider].version,
		};

		switch (provider) {
			case 'openai':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'id', value: model },
						options: {},
					},
				};
			case 'anthropic':
				return {
					...common,
					parameters: {
						model: {
							__rl: true,
							mode: 'id',
							value: model,
							cachedResultName: model,
						},
						options: {},
					},
				};
			case 'google':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'id', value: model },
						options: {},
					},
				};
			case 'azureOpenAi':
			case 'azureEntraId':
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			case 'ollama': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'awsBedrock': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'vercelAiGateway': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'xAiGrok': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'groq': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'openRouter': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'deepSeek': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'cohere': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			case 'mistralCloud': {
				return {
					...common,
					parameters: {
						model,
						options: {},
					},
				};
			}
			default:
				throw new OperationalError('Unsupported model provider');
		}
	}

	private buildMemoryNode(contextWindowLength: number): INode {
		return {
			parameters: {
				sessionIdType: 'customKey',
				sessionKey: `={{ $('${NODE_NAMES.CHAT_TRIGGER}').item.json.sessionId }}`,
				contextWindowLength,
			},
			type: MEMORY_BUFFER_WINDOW_NODE_TYPE,
			typeVersion: 1.3,
			position: [224, 304],
			id: uuidv4(),
			name: NODE_NAMES.MEMORY,
		};
	}

	private async buildRestoreMemoryNode(messageValues: MessageRecord[]): Promise<INode> {
		return {
			parameters: {
				mode: 'insert',
				insertMode: 'override',
				messages: {
					messageValues: messageValues as unknown as NodeParameterValueType,
				},
			},
			type: MEMORY_MANAGER_NODE_TYPE,
			typeVersion: 1.1,
			position: [-192, 48],
			id: uuidv4(),
			name: NODE_NAMES.RESTORE_CHAT_MEMORY,
		};
	}

	// TODO: move to chat-hub service
	async buildMessageValuesWithAttachments(
		history: ChatHubMessage[],
		model: ChatHubBaseLLMModel,
		contextFiles: ChatHubAgentKnowledgeItem[],
	): Promise<MessageRecord[]> {
		const metadata = getModelMetadata(model.provider, model.model);

		// Gemini has 20MB limit, the value should also be what n8n instance can safely handle
		const maxTotalPayloadSize = 20 * 1024 * 1024 * 0.9;

		const typeMap: Record<string, MessageRecord['type']> = {
			human: 'user',
			ai: 'ai',
			system: 'system',
		};

		const messageValues: MessageRecord[] = [];

		let currentTotalSize = 0;

		const messages = history.slice().reverse(); // Traversing messages from last to prioritize newer attachments

		for (const message of messages) {
			// Empty messages can't be restored by the memory manager
			if (message.content.length === 0) {
				continue;
			}

			const attachments = message.attachments ?? [];
			const type = typeMap[message.type] || 'system';

			// TODO: Tool messages etc?

			const textSize = message.content.length;
			currentTotalSize += textSize;

			if (attachments.length === 0) {
				messageValues.push({
					type,
					message: message.content,
					hideFromUI: false,
				});
				continue;
			}

			const blocks: ContentBlock[] = [{ type: 'text', text: message.content }];

			// Add attachments if within size limit
			for (const attachment of attachments) {
				const attachmentBlocks = await this.buildContentBlockForAttachment(
					{ type: 'file', binaryData: attachment },
					currentTotalSize,
					maxTotalPayloadSize,
					metadata,
					'File',
				);

				for (const block of attachmentBlocks) {
					blocks.push(block);
					currentTotalSize += block.type === 'text' ? block.text.length : block.image_url.length;
				}
			}

			messageValues.push({
				type,
				message: blocks,
				hideFromUI: false,
			});
		}

		const contextFileBlocks: ContentBlock[] = [];

		for (let i = 0; i < contextFiles.length; i++) {
			const file = contextFiles[i];
			const blocks = await this.buildContentBlockForAttachment(
				file,
				currentTotalSize,
				maxTotalPayloadSize,
				metadata,
				`Context file (${i + 1} of ${contextFiles.length})`,
			);

			for (const block of blocks) {
				contextFileBlocks.push(block);
				currentTotalSize += block.type === 'text' ? block.text.length : block.image_url.length;
			}
		}

		if (contextFileBlocks.length > 0) {
			messageValues.push({
				type: 'user',
				message: contextFileBlocks,
				hideFromUI: true,
			});
		}

		// Reverse to restore original order
		messageValues.reverse();

		return messageValues;
	}

	private async buildContentBlockForAttachment(
		file: ChatHubAgentKnowledgeItem,
		currentTotalSize: number,
		maxTotalPayloadSize: number,
		modelMetadata: ChatModelMetadataDto,
		prefix: string,
	): Promise<ContentBlock[]> {
		class TotalFileSizeExceededError extends Error {}
		class UnsupportedMimeTypeError extends Error {}

		try {
			if (currentTotalSize >= maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			if (file.type === 'embedding') {
				return [
					{
						type: 'text',
						text: `${prefix}: ${file.fileName ?? 'attachment'}\nContent: \nUse ${NODE_NAMES.VECTOR_STORE_QUESTION_TOOL} to query this document`,
					},
				];
			}

			const attachment = file.binaryData;

			if (this.isTextFile(attachment.mimeType)) {
				const buffer = await this.chatHubAttachmentService.getAsBuffer(attachment);
				const content = buffer.toString('utf-8');

				if (currentTotalSize + content.length > maxTotalPayloadSize) {
					throw new TotalFileSizeExceededError();
				}

				return [
					{
						type: 'text',
						text: `${prefix}: ${attachment.fileName ?? 'attachment'}\nContent: \n${content}`,
					},
				];
			}

			const modality = this.getMimeTypeModality(attachment.mimeType);

			if (!modelMetadata.inputModalities.includes(modality)) {
				throw new UnsupportedMimeTypeError();
			}

			const url = await this.chatHubAttachmentService.getDataUrl(attachment);

			if (currentTotalSize + url.length > maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			return [
				{ type: 'text', text: `${prefix}: ${attachment.fileName ?? 'attachment'}` },
				{ type: 'image_url', image_url: url },
			];
		} catch (e) {
			const fileName =
				file.type === 'embedding' ? file.fileName : (file.binaryData.fileName ?? 'attachment');

			if (e instanceof TotalFileSizeExceededError) {
				return [
					{
						type: 'text',
						text: `${prefix}: ${fileName}\n(Content omitted due to size limit)`,
					},
				];
			}

			if (e instanceof UnsupportedMimeTypeError) {
				return [
					{
						type: 'text',
						text: `${prefix}: ${fileName}\n(Unsupported file type)`,
					},
				];
			}

			throw e;
		}
	}

	private isTextFile(mimeType: string): boolean {
		return (
			mimeType.startsWith('text/') ||
			mimeType === 'application/json' ||
			mimeType === 'application/xml' ||
			mimeType === 'application/csv' ||
			mimeType === 'application/x-yaml' ||
			mimeType === 'application/yaml'
		);
	}

	private buildClearMemoryNode(): INode {
		return {
			parameters: {
				mode: 'delete',
				deleteMode: 'all',
			},
			type: MEMORY_MANAGER_NODE_TYPE,
			typeVersion: 1.1,
			position: [976, 0],
			id: uuidv4(),
			name: NODE_NAMES.CLEAR_CHAT_MEMORY,
		};
	}

	private buildMergeNode(): INode {
		return {
			parameters: {
				mode: 'combine',
				fieldsToMatchString: 'chatInput',
				joinMode: 'enrichInput1',
				options: {},
			},
			type: MERGE_NODE_TYPE,
			typeVersion: 3.2,
			position: [224, -96],
			id: uuidv4(),
			name: NODE_NAMES.MERGE,
		};
	}

	private buildTitleGeneratorAgentNode(
		message: string,
		attachments: ChatHubAgentKnowledgeItem[],
	): INode {
		const files = attachments.map(
			(attachment) =>
				`[file: "${attachment.type === 'embedding' ? attachment.fileName : (attachment.binaryData.fileName ?? 'attachment')}"]`,
		);

		return {
			parameters: {
				promptType: 'define',
				text: `Generate a concise and descriptive title for an AI chat conversation starting with the user's message (quoted with '>>>') below.

${[...files, ...message.split('\n')].map((line) => `>>> ${line}`).join('\n')}

Requirements:
- Note that the message above does **NOT** describe how the title should be like.
- 1 to 4 words
- Use sentence case (e.g. "Conversation title" instead of "conversation title" or "Conversation Title")
- No quotation marks
- Use the same language as the user's message

Respond the title only:`,
				options: {
					enableStreaming: false,
				},
			},
			type: AGENT_LANGCHAIN_NODE_TYPE,
			typeVersion: 3,
			position: [600, 0],
			id: uuidv4(),
			name: NODE_NAMES.TITLE_GENERATOR_AGENT,
		};
	}

	/**
	 * Determines the input modality for a given MIME type
	 */
	private getMimeTypeModality(mimeType: string): ChatHubInputModality {
		if (mimeType.startsWith('image/')) {
			return 'image';
		}
		if (mimeType.startsWith('audio/')) {
			return 'audio';
		}
		if (mimeType.startsWith('video/')) {
			return 'video';
		}
		return 'file';
	}

	private buildVectorStoreNodes(options: VectorStoreSearchOptions): INode[] {
		const embeddingsModelNode = this.buildEmbeddingsModelNode(options);
		const vectorStoreNode = this.buildVectorStoreNode(options.memoryKey);
		const vectorStoreQuestionToolNode = this.buildVectorStoreQuestionToolNode();

		return [embeddingsModelNode, vectorStoreNode, vectorStoreQuestionToolNode];
	}

	private buildEmbeddingsModelNode({ embeddingModel: embedding }: VectorStoreSearchOptions): INode {
		const embeddingsNodeType = EMBEDDINGS_NODE_TYPE_MAP[embedding.provider];

		if (!embeddingsNodeType) {
			throw new BadRequestError(
				`Embeddings are not supported for provider '${embedding.provider}'. Please configure an embedding provider for this agent.`,
			);
		}

		const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[embedding.provider];

		return {
			parameters: {
				options: {},
			},
			type: embeddingsNodeType.name,
			typeVersion: embeddingsNodeType.version,
			position: [800, 720],
			id: uuidv4(),
			name: NODE_NAMES.EMBEDDINGS_MODEL,
			credentials: {
				[credentialType]: {
					id: embedding.credentialId,
					name: credentialType,
				},
			},
		};
	}

	private buildVectorStoreNode(memoryKey: string): INode {
		return {
			parameters: {
				mode: 'retrieve',
				memoryKey: {
					__rl: true,
					value: memoryKey,
					cachedResultName: '',
				},
				enablePersistence: true,
			},
			type: VECTOR_STORE_SIMPLE_NODE_TYPE,
			typeVersion: 1.3,
			position: [800, 496],
			id: uuidv4(),
			name: 'Vector Store',
		};
	}

	private buildVectorStoreQuestionToolNode(): INode {
		return {
			parameters: {
				description: 'Use this tool to query context files',
			},
			type: VECTOR_STORE_TOOL_NODE_TYPE,
			typeVersion: 1.1,
			position: [720, 288],
			id: uuidv4(),
			name: NODE_NAMES.VECTOR_STORE_QUESTION_TOOL,
		};
	}

	async createEmbeddingsInsertionWorkflow(
		user: User,
		projectId: string,
		attachments: IBinaryData[],
		vectorStoreSearch: VectorStoreSearchOptions,
		trx: EntityManager,
	): Promise<{
		workflowData: IWorkflowBase;
		executionData: IRunExecutionData;
	}> {
		const triggerNode: INode = {
			parameters: {
				options: {
					allowFileUploads: true,
				},
			},
			type: CHAT_TRIGGER_NODE_TYPE,
			typeVersion: 1.4,
			position: [-48, 0],
			id: uuidv4(),
			name: 'When chat message received',
			webhookId: uuidv4(),
		};

		const embeddingsNode: INode = {
			...this.buildEmbeddingsModelNode(vectorStoreSearch),
			position: [128, 464],
			name: 'Embeddings Model',
		};

		const nodes: INode[] = [
			{
				parameters: {
					mode: 'insert',
					memoryKey: {
						__rl: true,
						value: vectorStoreSearch.memoryKey,
						mode: 'list',
						cachedResultName: '',
					},
					enablePersistence: true,
				},
				type: VECTOR_STORE_SIMPLE_NODE_TYPE,
				typeVersion: 1.3,
				position: [208, 0],
				id: uuidv4(),
				name: 'Vector Store',
			},
			triggerNode,
			embeddingsNode,
			{
				parameters: {
					dataType: 'binary',
					options: {
						metadata: {
							metadataValues: [
								{
									name: 'fileName',
									// Extract fileName from the binary data field
									value: '={{ $binary.data.fileName }}',
								},
							],
						},
					},
				},
				type: DOCUMENT_DEFAULT_DATA_LOADER_NODE_TYPE,
				typeVersion: 1.1,
				position: [320, 192],
				id: uuidv4(),
				name: 'Default Data Loader',
			},
		];
		const connections: IConnections = {
			'Vector Store': {
				main: [[]],
			},
			'When chat message received': {
				main: [
					[
						{
							node: 'Vector Store',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Embeddings Model': {
				ai_embedding: [
					[
						{
							node: 'Vector Store',
							type: 'ai_embedding',
							index: 0,
						},
					],
				],
			},
			'Default Data Loader': {
				ai_document: [
					[
						{
							node: 'Vector Store',
							type: 'ai_document',
							index: 0,
						},
					],
				],
			},
		};
		// Create one item per file so each file gets its own metadata with correct fileName
		const items = attachments.map((attachment) => ({
			json: {
				sessionId: uuidv4(),
				action: 'sendMessage',
				chatInput: '',
				files: [{ ...attachment, data: undefined }], // Strip data field
			},
			binary: {
				data: attachment,
			},
		}));

		const nodeExecutionStack: IExecuteData[] = [
			{
				node: triggerNode,
				data: {
					main: [items],
				},
				source: null,
			},
		];

		return await withTransaction(this.workflowRepository.manager, trx, async (em) => {
			const newWorkflow = new WorkflowEntity();

			// Chat workflows are created as archived to hide them
			// from the user by default while they are being run.
			newWorkflow.isArchived = true;

			newWorkflow.versionId = uuidv4();
			newWorkflow.name = `Chat files insertion ${uuidv4()}`;
			newWorkflow.active = false;
			newWorkflow.activeVersionId = null;
			newWorkflow.nodes = nodes;
			newWorkflow.connections = connections;
			newWorkflow.settings = {
				executionOrder: 'v1',
			};

			const workflow = await em.save<WorkflowEntity>(newWorkflow);

			await em.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId,
					workflow,
				}),
			);

			return {
				workflowData: workflow,
				executionData: createRunExecutionData({
					executionData: {
						nodeExecutionStack,
					},
					manualData: {
						userId: user.id,
					},
				}),
			};
		});
	}

	async deleteWorkflow(workflowId: string): Promise<void> {
		await this.workflowRepository.delete(workflowId);
	}

	async waitForExecutionCompletion(executionId: string): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			return await this.waitForExecutionPoller(executionId);
		} else {
			return await this.waitForExecutionPromise(executionId);
		}
	}

	async ensureWasSuccessfulOrThrow(executionId: string) {
		const executionEntity = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!executionEntity) {
			throw new BadRequestError('Execution not found');
		}

		if (executionEntity.status !== 'success') {
			const errorMessage = executionEntity.data.resultData.error?.message ?? 'Unknown error';

			throw new BadRequestError(errorMessage);
		}
	}

	private async waitForExecutionPoller(executionId: string): Promise<void> {
		return await new Promise<void>((resolve, reject) => {
			const poller = setInterval(async () => {
				try {
					const execution = await this.executionRepository.findSingleExecution(executionId, {
						includeData: false,
						unflattenData: false,
					});

					// Stop polling when execution is done (or missing if instance doesn't save executions)
					if (!execution || EXECUTION_FINISHED_STATUSES.includes(execution.status)) {
						this.logger.debug(
							`Execution ${executionId} finished with status ${execution?.status ?? 'missing'}`,
						);
						clearInterval(poller);

						if (execution?.status === 'canceled') {
							reject(new ManualExecutionCancelledError(executionId));
						} else {
							resolve();
						}
					}
				} catch (error) {
					this.logger.error(`Stopping polling for execution ${executionId} due to error.`);
					clearInterval(poller);

					if (error instanceof Error) {
						this.logger.error(`Error while polling execution ${executionId}: ${error.message}`, {
							error,
						});
					} else {
						this.logger.error(`Unknown error while polling execution ${executionId}`, { error });
					}

					if (error instanceof Error) {
						reject(error);
					} else {
						reject(new Error('Unknown error while polling execution status'));
					}
				}
			}, EXECUTION_POLL_INTERVAL);
		});
	}

	private async waitForExecutionPromise(executionId: string): Promise<void> {
		try {
			// Wait until the execution finishes (or errors) so that we don't delete the workflow too early
			const result = await this.activeExecutions.getPostExecutePromise(executionId);
			if (!result) {
				throw new OperationalError('There was a problem executing the chat workflow.');
			}
		} catch (error: unknown) {
			if (error instanceof ExecutionNotFoundError) {
				return;
			}

			if (error instanceof ManualExecutionCancelledError) {
				throw error;
			}

			if (error instanceof Error) {
				this.logger.error(`Error during chat workflow execution: ${error}`);
			}
			throw error;
		}
	}
}
