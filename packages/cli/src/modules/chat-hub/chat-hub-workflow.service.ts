import {
	ChatHubConversationModel,
	ChatSessionId,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubBaseLLMModel,
	type ChatHubAgentKnowledgeItem,
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
import { Cipher } from 'n8n-core';
import {
	CHAT_NODE_TYPE,
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

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { ChatHubToolService } from './chat-hub-tool.service';
import { CHATHUB_EXTRACTOR_NAME, ChatHubAuthenticationMetadata } from './chat-hub-extractor';
import {
	CHAT_TRIGGER_NODE_MIN_VERSION,
	EMBEDDINGS_NODE_TYPE_MAP,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
	SUPPORTED_RESPONSE_MODES,
	TOOLS_AGENT_NODE_MIN_VERSION,
} from './chat-hub.constants';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	chatTriggerParamsShape,
	MessageRecord,
	type ChatTriggerResponseMode,
	type VectorStoreSearchOptions,
	type ChatInput,
} from './chat-hub.types';
import { getMaxContextWindowTokens } from './context-limits';
import type { ChatHubAgent } from './chat-hub-agent.entity';
import { inE2ETests } from '../../constants';
import { DateTime } from 'luxon';

@Service()
export class ChatHubWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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
		history: MessageRecord[],
		input: ChatInput,
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		systemMessage: string,
		tools: INode[],
		vectorStoreSearch: VectorStoreSearchOptions | null,
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
				input,
				credentials,
				model,
				systemMessage,
				tools,
				vectorStoreSearch,
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
		executionMetadata,
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
		executionMetadata: ChatHubAuthenticationMetadata;
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

		const nodeExecutionStack = this.prepareExecutionData(
			chatTriggerNode,
			sessionId,
			input,
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

	prepareExecutionData(
		triggerNode: INode,
		sessionId: string,
		{ message, attachments }: ChatInput,
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

	async prepareBaseChatWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		history: MessageRecord[],
		input: ChatInput,
		systemMessage: string,
		tools: INode[],
		vectorStoreSearch: VectorStoreSearchOptions | null,
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
			input,
			credentials,
			model,
			systemMessage,
			tools,
			vectorStoreSearch,
			executionMetadata,
			trx,
		);
	}

	async prepareChatAgentWorkflow(
		agent: ChatHubAgent,
		user: User,
		sessionId: ChatSessionId,
		history: MessageRecord[],
		input: ChatInput,
		trx: EntityManager,
		systemMessage: string,
		executionMetadata: ChatHubAuthenticationMetadata,
		vectorStoreSearchOptions: VectorStoreSearchOptions | null,
	) {
		if (!agent.provider || !agent.model) {
			throw new BadRequestError('Provider or model not set for agent');
		}

		const credentialId = agent.credentialId;
		if (!credentialId) {
			throw new BadRequestError('Credentials not set for agent');
		}

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

		const tools = await this.chatHubToolService.getToolDefinitionsForAgent(agent.id, trx);

		return await this.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			history,
			input,
			systemMessage,
			tools,
			vectorStoreSearchOptions,
			trx,
			executionMetadata,
		);
	}

	async prepareWorkflowAgentWorkflow(
		user: User,
		sessionId: ChatSessionId,
		workflowId: string,
		input: ChatInput,
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
			input,
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

	private buildVectorStoreNodes(options: VectorStoreSearchOptions): INode[] {
		const embeddingsModelNode = this.buildEmbeddingsModelNode(options);
		const vectorStoreNode = this.buildVectorStoreNode(options.memoryKey, options.credentialId);
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

	private buildVectorStoreNode(memoryKey: string, credentialId: string): INode {
		return {
			parameters: {
				mode: 'retrieve',
				memoryKey: {
					__rl: true,
					value: memoryKey,
					cachedResultName: '',
				},
				embeddingBatchSize: 20,
				enablePersistence: true,
			},
			type: VECTOR_STORE_SIMPLE_NODE_TYPE,
			typeVersion: 1.3,
			position: [800, 496],
			id: uuidv4(),
			name: 'Vector Store',
			credentials: {
				instanceBinaryDataApi: {
					id: credentialId,
					name: '',
				},
			},
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
					embeddingBatchSize: 20,
					enablePersistence: true,
				},
				type: VECTOR_STORE_SIMPLE_NODE_TYPE,
				typeVersion: 1.3,
				position: [208, 0],
				id: uuidv4(),
				name: 'Vector Store',
				credentials: {
					instanceBinaryDataApi: {
						id: vectorStoreSearch.credentialId,
						name: '',
					},
				},
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
}
