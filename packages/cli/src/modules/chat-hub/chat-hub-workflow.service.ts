import {
	ChatHubConversationModel,
	ChatSessionId,
	type ChatHubInputModality,
	type ChatModelDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	SharedWorkflow,
	SharedWorkflowRepository,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager, In } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	createRunExecutionData,
	IConnections,
	IExecuteData,
	INode,
	INodeCredentials,
	IRunExecutionData,
	IWorkflowBase,
	MEMORY_BUFFER_WINDOW_NODE_TYPE,
	MEMORY_MANAGER_NODE_TYPE,
	MERGE_NODE_TYPE,
	NodeConnectionTypes,
	OperationalError,
	type IBinaryData,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ChatHubMessage } from './chat-hub-message.entity';
import { NODE_NAMES, PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';
import {
	MessageRecord,
	type ContentBlock,
	type ChatTriggerResponseMode,
	chatTriggerParamsShape,
} from './chat-hub.types';
import { getMaxContextWindowTokens } from './context-limits';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { WorkflowService } from '@/workflows/workflow.service';

@Service()
export class ChatHubWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowService: WorkflowService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
	) {}

	async createChatWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		projectId: string,
		history: ChatHubMessage[],
		humanMessage: string,
		attachments: IBinaryData[],
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		systemMessage: string | undefined,
		tools: INode[],
		timeZone: string,
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
				humanMessage,
				attachments,
				credentials,
				model,
				systemMessage: systemMessage ?? this.getBaseSystemMessage(timeZone),
				tools,
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
		message: string,
		attachments: IBinaryData[],
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
			if (mimeType.startsWith('image/')) {
				modalities.add('image');
			} else if (mimeType.startsWith('audio/')) {
				modalities.add('audio');
			} else if (mimeType.startsWith('video/')) {
				modalities.add('video');
			} else {
				// Any other MIME type falls under generic 'file'
				modalities.add('file');
			}
		}

		return Array.from(modalities);
	}

	async fetchAgentWorkflowsAsModels(user: User): Promise<ChatModelDto[]> {
		// Workflows are scanned by their latest version for chat trigger nodes.
		// This means that we might miss some active workflow versions that had chat triggers but
		// the latest version does not, but this trade-off is done for performance.
		const workflowsWithChatTrigger = await this.workflowService.getWorkflowsWithNodesIncluded(
			user,
			[CHAT_TRIGGER_NODE_TYPE],
			true,
		);

		const activeWorkflows = workflowsWithChatTrigger
			// Ensure the user has chat execution access to the workflow
			.filter((workflow) => workflow.scopes.includes('workflow:execute-chat'))
			// The workflow has to be active
			.filter((workflow) => !!workflow.activeVersionId);

		return await this.fetchAgentWorkflowsAsModelsByIds(
			activeWorkflows.map((workflow) => workflow.id),
		);
	}

	async fetchAgentWorkflowsAsModelsByIds(ids: string[]): Promise<ChatModelDto[]> {
		const workflows = await this.workflowRepository.find({
			select: {
				id: true,
				name: true,
				shared: {
					role: true,
					project: {
						id: true,
						name: true,
						icon: { type: true, value: true },
					},
				},
			},
			where: { id: In(ids) },
			relations: {
				activeVersion: true,
				shared: {
					project: true,
				},
			},
		});

		return workflows.flatMap((workflow) => {
			const model = this.convertWorkflowToChatModel(workflow);

			return model ? [model] : [];
		});
	}

	private convertWorkflowToChatModel({
		id,
		name,
		shared,
		activeVersion,
	}: WorkflowEntity): ChatModelDto | null {
		if (!activeVersion) {
			return null;
		}

		const chatTrigger = activeVersion.nodes?.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE);
		if (!chatTrigger) {
			return null;
		}

		const chatTriggerParams = chatTriggerParamsShape.safeParse(chatTrigger.parameters).data;
		if (!chatTriggerParams?.availableInChat) {
			return null;
		}

		const inputModalities = this.parseInputModalities(chatTriggerParams.options);

		const agentName =
			chatTriggerParams.agentName && chatTriggerParams.agentName.trim().length > 0
				? chatTriggerParams.agentName
				: name;

		// Find the owner's project (home project)
		const ownerSharedWorkflow = shared?.find((sw) => sw.role === 'workflow:owner');
		const projectName = ownerSharedWorkflow?.project?.name ?? null;

		return {
			name: agentName,
			description: chatTriggerParams.agentDescription ?? null,
			icon: ownerSharedWorkflow?.project?.icon ?? null,
			model: {
				provider: 'n8n',
				workflowId: id,
			},
			createdAt: activeVersion.createdAt ? activeVersion.createdAt.toISOString() : null,
			updatedAt: activeVersion.updatedAt ? activeVersion.updatedAt.toISOString() : null,
			projectName,
			metadata: {
				inputModalities,
				capabilities: {
					functionCalling: false,
				},
				available: true,
			},
		};
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
		humanMessage,
		attachments,
		credentials,
		model,
		systemMessage,
		tools,
	}: {
		userId: string;
		sessionId: ChatSessionId;
		history: ChatHubMessage[];
		humanMessage: string;
		attachments: IBinaryData[];
		credentials: INodeCredentials;
		model: ChatHubConversationModel;
		systemMessage: string;
		tools: INode[];
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
					[{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
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
		};

		const nodeExecutionStack = this.prepareExecutionData(
			chatTriggerNode,
			sessionId,
			humanMessage,
			attachments,
		);

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
		const titleGeneratorAgentNode = this.buildTitleGeneratorAgentNode(humanMessage, attachments);
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

	getSystemMessageMetadata(timeZone: string) {
		const now = DateTime.now().setZone(timeZone).toISO({
			includeOffset: true,
		});

		return `The user's current local date and time is: ${now} (timezone: ${timeZone}).
When you need to reference "now", use this date and time.

You can only produce text responses.
You cannot create, generate, edit, or display images, videos, or other non-text content.
If the user asks you to generate or edit an image (or other media), explain that you are not able to do that and, if helpful, describe in words what the image could look like or how they could create it using external tools.`;
	}

	private getBaseSystemMessage(timeZone: string) {
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
			position: [608, 304] satisfies [number, number],
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
						model: { __rl: true, mode: 'id', value: model },
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

	private async buildRestoreMemoryNode(history: ChatHubMessage[]): Promise<INode> {
		const messageValues = await this.buildMessageValuesWithAttachments(history);

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

	private async buildMessageValuesWithAttachments(
		history: ChatHubMessage[],
	): Promise<MessageRecord[]> {
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
				const block = await this.buildContentBlockForAttachment(
					attachment,
					currentTotalSize,
					maxTotalPayloadSize,
				);
				blocks.push(block);
				currentTotalSize += block.type === 'text' ? block.text.length : block.image_url.length;
			}

			messageValues.push({
				type,
				message: blocks,
				hideFromUI: false,
			});
		}

		// Reverse to restore original order
		messageValues.reverse();

		return messageValues;
	}

	private async buildContentBlockForAttachment(
		attachment: IBinaryData,
		currentTotalSize: number,
		maxTotalPayloadSize: number,
	): Promise<ContentBlock> {
		class TotalFileSizeExceededError extends Error {}

		try {
			if (currentTotalSize >= maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			if (this.isTextFile(attachment.mimeType)) {
				const buffer = await this.chatHubAttachmentService.getAsBuffer(attachment);
				const content = buffer.toString('utf-8');

				if (currentTotalSize + content.length > maxTotalPayloadSize) {
					throw new TotalFileSizeExceededError();
				}

				return {
					type: 'text',
					text: `File: ${attachment.fileName ?? 'attachment'}\nContent: \n${content}`,
				};
			}

			const url = await this.chatHubAttachmentService.getDataUrl(attachment);

			if (currentTotalSize + url.length > maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			return { type: 'image_url', image_url: url };
		} catch (e) {
			if (e instanceof TotalFileSizeExceededError) {
				return {
					type: 'text',
					text: `File: ${attachment.fileName ?? 'attachment'}\n(Content omitted due to size limit)`,
				};
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

	private buildTitleGeneratorAgentNode(message: string, attachments: IBinaryData[]): INode {
		const files = attachments.map((attachment) => `[file: "${attachment.fileName}"]`);

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
}
