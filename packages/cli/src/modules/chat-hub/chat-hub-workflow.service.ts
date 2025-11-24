import { ChatHubConversationModel, ChatSessionId } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	SharedWorkflow,
	SharedWorkflowRepository,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { EntityManager } from '@n8n/typeorm';
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
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ChatHubMessage } from './chat-hub-message.entity';
import {
	CONVERSATION_TITLE_GENERATION_PROMPT,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
} from './chat-hub.constants';
import { MessageRecord } from './chat-hub.types';
import { getMaxContextWindowTokens } from './context-limits';

@Service()
export class ChatHubWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
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
		trx?: EntityManager,
	): Promise<{ workflowData: IWorkflowBase; executionData: IRunExecutionData }> {
		return await withTransaction(this.workflowRepository.manager, trx, async (em) => {
			this.logger.debug(
				`Creating chat workflow for user ${userId} and session ${sessionId}, provider ${model.provider}`,
			);

			const { nodes, connections, executionData } = this.buildChatWorkflow({
				userId,
				sessionId,
				history,
				humanMessage,
				attachments,
				credentials,
				model,
				systemMessage,
				tools,
			});

			const newWorkflow = new WorkflowEntity();

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
			};
		});
	}

	async createTitleGenerationWorkflow(
		userId: string,
		sessionId: ChatSessionId,
		projectId: string,
		humanMessage: string,
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
			);

			const newWorkflow = new WorkflowEntity();
			newWorkflow.versionId = uuidv4();
			newWorkflow.name = `Chat ${sessionId} (Title Generation)`;
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

	private buildChatWorkflow({
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
		systemMessage?: string;
		tools: INode[];
	}) {
		const chatTriggerNode = this.buildChatTriggerNode();
		const toolsAgentNode = this.buildToolsAgentNode(model, systemMessage);
		const modelNode = this.buildModelNode(credentials, model);
		const memoryNode = this.buildMemoryNode(20);
		const restoreMemoryNode = this.buildRestoreMemoryNode(history);
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
	) {
		const chatTriggerNode = this.buildChatTriggerNode();
		const titleGeneratorAgentNode = this.buildTitleGeneratorAgentNode();
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
			position: [0, 0],
			id: uuidv4(),
			name: NODE_NAMES.CHAT_TRIGGER,
			webhookId: uuidv4(),
		};
	}

	private buildToolsAgentNode(model: ChatHubConversationModel, systemMessage?: string): INode {
		return {
			parameters: {
				promptType: 'define',
				text: `={{ $('${NODE_NAMES.CHAT_TRIGGER}').item.json.chatInput }}`,
				options: {
					enableStreaming: true,
					maxTokensFromMemory:
						model.provider !== 'n8n' && model.provider !== 'custom-agent'
							? getMaxContextWindowTokens(model.provider, model.model)
							: undefined,
					systemMessage,
				},
			},
			type: AGENT_LANGCHAIN_NODE_TYPE,
			typeVersion: 3,
			position: [600, 0],
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
			position: [600, 300] satisfies [number, number],
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
			position: [480, 208],
			id: uuidv4(),
			name: NODE_NAMES.MEMORY,
		};
	}

	private buildRestoreMemoryNode(history: ChatHubMessage[]): INode {
		return {
			parameters: {
				mode: 'insert',
				insertMode: 'override',
				messages: {
					messageValues: history
						// Empty messages can't be restored by the memory manager
						.filter((message) => message.content.length > 0)
						.map((message) => {
							const typeMap: Record<string, MessageRecord['type']> = {
								human: 'user',
								ai: 'ai',
								system: 'system',
							};

							// TODO: Tool messages etc?
							return {
								type: typeMap[message.type] || 'system',
								message: message.content,
								hideFromUI: false,
							};
						}),
				},
			},
			type: MEMORY_MANAGER_NODE_TYPE,
			typeVersion: 1.1,
			position: [224, 0],
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
			position: [224, -100],
			id: uuidv4(),
			name: NODE_NAMES.MERGE,
		};
	}

	private buildTitleGeneratorAgentNode(): INode {
		return {
			parameters: {
				promptType: 'define',
				text: `={{ $('${NODE_NAMES.CHAT_TRIGGER}').item.json.chatInput }}`,
				options: {
					enableStreaming: false,
					systemMessage: CONVERSATION_TITLE_GENERATION_PROMPT,
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
