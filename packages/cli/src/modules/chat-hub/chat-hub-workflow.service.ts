import {
	ChatHubConversationModel,
	ChatSessionId,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubBaseLLMModel,
	type ChatHubInputModality,
	type ChatModelMetadataDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	SharedWorkflow,
	SharedWorkflowRepository,
	User,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { Cipher } from 'n8n-core';
import {
	CHAT_NODE_TYPE,
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

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { ChatHubToolService } from './chat-hub-tool.service';
import { CHATHUB_EXTRACTOR_NAME, ChatHubAuthenticationMetadata } from './chat-hub-extractor';
import { ChatHubMessage } from './chat-hub-message.entity';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import {
	CHAT_TRIGGER_NODE_MIN_VERSION,
	getModelMetadata,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
	SUPPORTED_RESPONSE_MODES,
	TOOLS_AGENT_NODE_MIN_VERSION,
} from './chat-hub.constants';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	chatTriggerParamsShape,
	MessageRecord,
	PreparedChatWorkflow,
	type ContentBlock,
	type ChatTriggerResponseMode,
} from './chat-hub.types';
import { getMaxContextWindowTokens } from './context-limits';
import { inE2ETests } from '../../constants';
import { parseMessage, collectChatArtifacts } from '@n8n/chat-hub';

@Service()
export class ChatHubWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly chatHubAgentService: ChatHubAgentService,
		private readonly chatHubSettingsService: ChatHubSettingsService,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubToolService: ChatHubToolService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly cipher: Cipher,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async deleteChatWorkflow(workflowId: string): Promise<void> {
		await this.workflowRepository.delete(workflowId);
	}

	async createChatWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		projectId: string,
		history: ChatHubMessage[],
		humanMessage: string,
		attachments: IBinaryData[],
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		systemMessage: string | undefined,
		tools: INode[],
		timeZone: string,
		executionMetadata: ChatHubAuthenticationMetadata,
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
				systemMessage: systemMessage ?? this.getBaseSystemMessage(history, timeZone),
				tools,
				executionMetadata,
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
		humanMessage,
		attachments,
		credentials,
		model,
		systemMessage,
		tools,
		executionMetadata,
	}: {
		userId: string;
		sessionId: ChatSessionId;
		history: ChatHubMessage[];
		humanMessage: string;
		attachments: IBinaryData[];
		credentials: INodeCredentials;
		model: ChatHubBaseLLMModel;
		systemMessage: string;
		tools: INode[];
		executionMetadata: ChatHubAuthenticationMetadata;
	}) {
		const chatTriggerNode = this.buildChatTriggerNode();
		const toolsAgentNode = this.buildToolsAgentNode(model, systemMessage);
		const modelNode = this.buildModelNode(credentials, model);
		const memoryNode = this.buildMemoryNode(20);
		const restoreMemoryNode = await this.buildRestoreMemoryNode(history, model);
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
			executionMetadata,
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
		if (inE2ETests) {
			return '__e2e_system_prompt_placeholder__';
		}

		const now = DateTime.now();
		const isoTime = now.setZone(timeZone).toISO({ includeOffset: true });

		return `
# Current Date and Time

The user's current local date and time is: ${isoTime} (timezone: ${timeZone}).
When you need to reference "now", use this date and time.

# Output Capabilities

## Multimedia Generation

You are allowed to describe, explain and analyze provided multimedia data if you're capable of, but not allowed to create, generate, edit, or display images, videos, or other non-text content.
If the user asks you to generate or edit an image (or other media), explain that you are not able to do that and, if helpful, describe in words what the image could look like or how they could create it using external tools.

## Document Generation

You can create and edit documents for the user using special XML-like commands. When you use these commands, documents appear in a side panel next to this chat where users can view them in real-time. You can create multiple documents in a conversation, and users can switch between them using a dropdown selector.

Write these commands DIRECTLY in your response - do NOT wrap them in code fences or backticks.

### Creating a Document

To create a new document, include this command directly in your response:

<command:artifact-create>
<title>Document Title</title>
<type>md</type>
<content>
Document content here...
</content>
</command:artifact-create>

The type can be:
- html for HTML documents
- md for Markdown documents
- A code language like typescript, python, json, etc. for code files

Example response:
"I'll create an RFC document for you.

<command:artifact-create>
<title>RFC: New Feature</title>
<type>md</type>
<content>
# RFC: New Feature

## Summary
This feature will...
</content>
</command:artifact-create>

I've created the RFC above. Let me know if you'd like any changes!"

### Editing a Document

To make targeted edits to a document, you must specify the exact title of the document you want to edit:

<command:artifact-edit>
<title>Document Title</title>
<oldString>text to find</oldString>
<newString>replacement text</newString>
<replaceAll>false</replaceAll>
</command:artifact-edit>

- <title> is required and must match the exact title of an existing document.
- Set replaceAll to true to replace all occurrences, or false to replace only the first occurrence.
- If the document title doesn't exist, the edit command will be ignored.

IMPORTANT:
- Write these commands directly in your response text, NOT inside code blocks or fences.
- ALWAYS include conversational text before and/or after document commands. Never send a message with only commands and no explanation.
`;
	}

	private getBaseSystemMessage(history: ChatHubMessage[], timeZone: string) {
		const artifactContext = this.buildArtifactContext(history);

		return `You are a helpful assistant.

${this.getSystemMessageMetadata(timeZone) + artifactContext}`;
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

	private async buildRestoreMemoryNode(
		history: ChatHubMessage[],
		model: ChatHubBaseLLMModel,
	): Promise<INode> {
		const messageValues = await this.buildMessageValuesWithAttachments(history, model);

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
		model: ChatHubBaseLLMModel,
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
				const block = await this.buildContentBlockForAttachment(
					attachment,
					currentTotalSize,
					maxTotalPayloadSize,
					metadata,
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
		modelMetadata: ChatModelMetadataDto,
	): Promise<ContentBlock> {
		class TotalFileSizeExceededError extends Error {}
		class UnsupportedMimeTypeError extends Error {}

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

			const modality = this.getMimeTypeModality(attachment.mimeType);

			if (!modelMetadata.inputModalities.includes(modality)) {
				throw new UnsupportedMimeTypeError();
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

			if (e instanceof UnsupportedMimeTypeError) {
				return {
					type: 'text',
					text: `File: ${attachment.fileName ?? 'attachment'}\n(Unsupported file type)`,
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

	prepareExecutionData(
		triggerNode: INode,
		sessionId: string,
		message: string,
		attachments: IBinaryData[],
		executionMetadata: ChatHubAuthenticationMetadata,
	): IExecuteData[] {
		const encryptedMetadata = this.cipher.encrypt(executionMetadata);
		// Attachments are already processed (id field populated) by the caller
		return [
			{
				node: {
					...triggerNode,
					parameters: {
						...triggerNode.parameters,
						executionsHooksVersion: 1,
						contextEstablishmentHooks: {
							hooks: [
								{
									hookName: CHATHUB_EXTRACTOR_NAME,
									isAllowedToFail: true,
								},
							],
						},
					},
				},
				data: {
					main: [
						[
							{
								encryptedMetadata,
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

	async prepareReplyWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		history: ChatHubMessage[],
		message: string,
		tools: INode[],
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
	): Promise<PreparedChatWorkflow> {
		if (model.provider === 'n8n') {
			return await this.prepareWorkflowAgentWorkflow(
				user,
				sessionId,
				model.workflowId,
				message,
				attachments,
				trx,
				executionMetadata,
			);
		}

		if (model.provider === 'custom-agent') {
			return await this.prepareChatAgentWorkflow(
				model.agentId,
				user,
				sessionId,
				history,
				message,
				attachments,
				timeZone,
				trx,
				executionMetadata,
			);
		}

		return await this.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			history,
			message,
			undefined,
			tools,
			attachments,
			timeZone,
			trx,
			executionMetadata,
		);
	}

	private async prepareBaseChatWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		history: ChatHubMessage[],
		message: string,
		systemMessage: string | undefined,
		tools: INode[],
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		await this.chatHubSettingsService.ensureModelIsAllowed(model, trx);
		this.chatHubCredentialsService.findProviderCredential(model.provider, credentials);
		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user, trx);

		return await this.createChatWorkflow(
			user.id,
			sessionId,
			projectId,
			history,
			message,
			attachments,
			credentials,
			model,
			systemMessage,
			tools,
			timeZone,
			executionMetadata,
			trx,
		);
	}

	private async prepareChatAgentWorkflow(
		agentId: string,
		user: User,
		sessionId: ChatSessionId,
		history: ChatHubMessage[],
		message: string,
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		const agent = await this.chatHubAgentService.getAgentById(agentId, user.id, trx);

		if (!agent) {
			throw new BadRequestError('Agent not found');
		}

		if (!agent.provider || !agent.model) {
			throw new BadRequestError('Provider or model not set for agent');
		}

		const credentialId = agent.credentialId;
		if (!credentialId) {
			throw new BadRequestError('Credentials not set for agent');
		}

		const artifactContext = this.buildArtifactContext(history);
		const systemMessage =
			agent.systemPrompt + '\n\n' + this.getSystemMessageMetadata(timeZone) + artifactContext;

		const model: ChatHubBaseLLMModel = {
			provider: agent.provider,
			model: agent.model,
		};

		const credentials: INodeCredentials = {
			[PROVIDER_CREDENTIAL_TYPE_MAP[agent.provider]]: {
				id: credentialId,
				name: '',
			},
		};

		const tools = await this.chatHubToolService.getToolDefinitionsForAgent(agentId, trx);

		return await this.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			history,
			message,
			systemMessage,
			tools,
			attachments,
			timeZone,
			trx,
			executionMetadata,
		);
	}

	private async prepareWorkflowAgentWorkflow(
		user: User,
		sessionId: ChatSessionId,
		workflowId: string,
		message: string,
		attachments: IBinaryData[],
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute-chat'],
			{ includeTags: false, includeParentFolder: false, includeActiveVersion: true, em: trx },
		);

		if (!workflow?.activeVersion) {
			throw new BadRequestError('Workflow not found');
		}

		const chatTriggers = workflow.activeVersion.nodes.filter(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
		);

		if (chatTriggers.length !== 1) {
			throw new BadRequestError('Workflow must have exactly one chat trigger');
		}

		const chatTrigger = chatTriggers[0];

		if (chatTrigger.typeVersion < CHAT_TRIGGER_NODE_MIN_VERSION) {
			throw new BadRequestError(
				'Chat Trigger node version is too old to support Chat. Please update the node.',
			);
		}

		const chatTriggerParams = chatTriggerParamsShape.safeParse(chatTrigger.parameters).data;
		if (!chatTriggerParams) {
			throw new BadRequestError('Chat Trigger node has invalid parameters');
		}

		if (!chatTriggerParams.availableInChat) {
			throw new BadRequestError('Chat Trigger node must be made available in Chat');
		}

		const responseMode = chatTriggerParams.options?.responseMode ?? 'streaming';
		if (!SUPPORTED_RESPONSE_MODES.includes(responseMode)) {
			throw new BadRequestError(
				'Chat Trigger node response mode must be set to "When Last Node Finishes", "Using Response Nodes" or "Streaming" to use the workflow on Chat',
			);
		}

		const chatResponseNodes = workflow.activeVersion.nodes.filter(
			(node) => node.type === CHAT_NODE_TYPE,
		);

		if (chatResponseNodes.length > 0 && responseMode !== 'responseNodes') {
			throw new BadRequestError(
				'Chat nodes are not supported with the selected response mode. Please set the response mode to "Using Response Nodes" or remove the nodes from the workflow.',
			);
		}

		const agentNodes = workflow.activeVersion.nodes?.filter(
			(node) => node.type === AGENT_LANGCHAIN_NODE_TYPE,
		);

		// Agents older than this can't do streaming
		if (agentNodes.some((node) => node.typeVersion < TOOLS_AGENT_NODE_MIN_VERSION)) {
			throw new BadRequestError(
				'Agent node version is too old to support streaming responses. Please update the node.',
			);
		}

		const nodeExecutionStack = this.prepareExecutionData(
			chatTrigger,
			sessionId,
			message,
			attachments,
			executionMetadata,
		);

		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
			manualData: {
				userId: user.id,
			},
		});

		const workflowData: IWorkflowBase = {
			...workflow,
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
			// Force saving data on successful executions for custom agent workflows
			// to be able to read the results after execution.
			settings: {
				...workflow.settings,
				saveDataSuccessExecution: 'all',
			},
		};

		return {
			workflowData,
			executionData,
			responseMode,
		};
	}

	private buildArtifactContext(history: ChatHubMessage[]): string {
		const artifacts = collectChatArtifacts(history.flatMap(parseMessage));
		if (artifacts.length === 0) {
			return '';
		}

		// Multiple artifacts - show all of them
		const artifactsText = artifacts
			.map(
				(artifact, index) => `

### Document ${index + 1}: ${artifact.title} (type: ${artifact.type})

${artifact.content}
`,
			)
			.join('\n');

		return `

## Current Documents

${artifactsText}

You can update the most recent document using the commands described above, or create a new document.`;
	}
}
