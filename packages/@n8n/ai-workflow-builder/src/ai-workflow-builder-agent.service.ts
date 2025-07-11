import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, RemoveMessage, ToolMessage } from '@langchain/core/messages';
import { StateGraph, MemorySaver, END } from '@langchain/langgraph';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, INodeTypes, jsonParse } from 'n8n-workflow';
import type { IUser, INodeTypeDescription, IRunExecutionData } from 'n8n-workflow';

import { conversationCompactChain } from './chains/conversation-compact';
import { anthropicClaudeSonnet4, gpt41mini } from './llm-config';
import { createAddNodeTool } from './tools/add-node.tool';
import { createConnectNodesTool } from './tools/connect-nodes.tool';
import { createNodeDetailsTool } from './tools/node-details.tool';
import { createNodeSearchTool } from './tools/node-search.tool';
import { mainAgentPrompt } from './tools/prompts/main-agent.prompt';
import { createRemoveNodeTool } from './tools/remove-node.tool';
import { createUpdateNodeParametersTool } from './tools/update-node-parameters.tool';
import { SimpleWorkflow } from './types';
import { processOperations } from './utils/operations-processor';
import { createStreamProcessor, formatMessages } from './utils/stream-processor';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

@Service()
export class AiWorkflowBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	private llmSimpleTask: BaseChatModel | undefined;

	private llmComplexTask: BaseChatModel | undefined;

	private checkpointer = new MemorySaver();

	constructor(
		private readonly nodeTypes: INodeTypes,
		private readonly client?: AiAssistantClient,
	) {
		this.parsedNodeTypes = this.getNodeTypes();
	}

	private async setupModels(user?: IUser) {
		if (this.llmSimpleTask && this.llmComplexTask) {
			return;
		}

		// If client is provided, use it for API proxy
		if (this.client && user) {
			const authHeaders = await this.client.generateApiProxyCredentials(user);
			// Extract baseUrl from client configuration
			const baseUrl = this.client.getApiProxyBaseUrl();

			this.llmSimpleTask = await gpt41mini({
				baseUrl: baseUrl + '/openai',
				// When using api-proxy the key will be populated automatically, we just need to pass a placeholder
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});
			this.llmComplexTask = await anthropicClaudeSonnet4({
				baseUrl: baseUrl + '/anthropic',
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});
			return;
		}
		// If base URL is not set, use environment variables
		this.llmSimpleTask = await gpt41mini({
			apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '',
		});

		// this.llmComplexTask = await gpt41({
		// 	apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '',
		// });
		this.llmComplexTask = await anthropicClaudeSonnet4({
			apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
		});
	}

	private getNodeTypes(): INodeTypeDescription[] {
		// These types are ignored because they tend to cause issues when generating workflows
		const ignoredTypes = ['@n8n/n8n-nodes-langchain.toolVectorStore'];
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());

		const nodeTypes = nodeTypesKeys
			.map((nodeName) => {
				try {
					return { ...this.nodeTypes.getByNameAndVersion(nodeName).description, name: nodeName };
				} catch (error) {
					console.log('Error getting node type', 'nodeName:', nodeName, 'error:', error);
					return undefined;
				}
			})
			.filter(
				(nodeType): nodeType is INodeTypeDescription =>
					nodeType !== undefined &&
					nodeType.hidden !== true &&
					!ignoredTypes.includes(nodeType.name),
			)
			.map((nodeType, _index, nodeTypes: INodeTypeDescription[]) => {
				// If the node type is a tool, we need to find the corresponding non-tool node type
				// and merge the two node types to get the full node type description.
				const isTool = nodeType.name.endsWith('Tool');
				if (!isTool) return nodeType;

				const nonToolNode = nodeTypes.find((nt) => nt.name === nodeType.name.replace('Tool', ''));
				if (!nonToolNode) return nodeType;

				return {
					...nonToolNode,
					...nodeType,
				};
			});

		return nodeTypes;
	}

	private async getAgent(user?: IUser) {
		if (!this.llmComplexTask || !this.llmSimpleTask) {
			await this.setupModels(user);
		}

		const tools = [
			createNodeSearchTool(this.parsedNodeTypes),
			createNodeDetailsTool(this.parsedNodeTypes),
			createAddNodeTool(this.parsedNodeTypes),
			createConnectNodesTool(this.parsedNodeTypes),
			createRemoveNodeTool(),
			createUpdateNodeParametersTool(this.parsedNodeTypes, this.llmComplexTask!),
		];

		// Create a map for quick tool lookup
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		const callModel = async (state: typeof WorkflowState.State) => {
			assert(this.llmComplexTask, 'LLM not setup');
			assert(typeof this.llmComplexTask.bindTools === 'function', 'LLM does not support tools');

			const prompt = await mainAgentPrompt.invoke(state);
			const response = await this.llmComplexTask.bindTools(tools).invoke(prompt);

			return { messages: [response] };
		};
		const shouldModifyState = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage = messages[messages.length - 1] as HumanMessage;

			if (lastMessage.content === '/compact') {
				return 'compact_messages';
			}

			if (lastMessage.content === '/clear') {
				return 'delete_messages';
			}

			return 'agent';
		};
		const shouldContinue = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage = messages[messages.length - 1] as AIMessage;

			if (lastMessage.tool_calls?.length) {
				return 'tools';
			}
			return END;
		};

		const customToolExecutor = async (state: typeof WorkflowState.State) => {
			return await executeToolsInParallel({ state, toolMap });
		};

		function deleteMessages(state: typeof WorkflowState.State) {
			const messages = state.messages;
			return {
				messages: messages.map((m) => new RemoveMessage({ id: m.id! })) ?? [],
			};
		}

		const compactSession = async (state: typeof WorkflowState.State) => {
			assert(this.llmSimpleTask, 'LLM not setup');
			const messages = state.messages;
			const compactedMessages = await conversationCompactChain(this.llmSimpleTask, messages);

			return {
				messages: [
					...messages.map((m) => new RemoveMessage({ id: m.id! })),
					...compactedMessages.newMessages,
				],
			};
		};

		const workflow = new StateGraph(WorkflowState)
			.addNode('agent', callModel)
			.addNode('tools', customToolExecutor)
			.addNode('process_operations', processOperations)
			.addNode('delete_messages', deleteMessages)
			.addNode('compact_messages', compactSession)
			.addConditionalEdges('__start__', shouldModifyState)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent')
			.addEdge('delete_messages', END)
			.addEdge('compact_messages', END)
			.addConditionalEdges('agent', shouldContinue);

		return workflow;
	}

	async *chat(
		payload: {
			question: string;
			currentWorkflowJSON?: string;
			workflowId?: string;
			executionData?: IRunExecutionData['resultData'];
		},
		user?: IUser,
	) {
		const agent = (await this.getAgent(user)).compile({ checkpointer: this.checkpointer });

		// Generate thread ID from workflowId and userId
		// This ensures one session per workflow per user
		const threadId = payload.workflowId
			? `workflow-${payload.workflowId}-user-${user?.id ?? new Date().getTime()}`
			: `user-${user?.id ?? new Date().getTime()}-default`;

		// Configure thread for checkpointing
		const threadConfig = {
			configurable: {
				thread_id: threadId,
			},
		};

		// Check if this is a subsequent message
		// If so, update the workflowJSON with the current editor state
		const existingCheckpoint = await this.checkpointer.getTuple(threadConfig);

		let stream;

		if (existingCheckpoint?.checkpoint) {
			// Subsequent message - update the state with current workflow
			const stateUpdate: Partial<typeof WorkflowState.State> = {
				workflowOperations: [], // Clear any pending operations from previous message
				executionData: payload.executionData, // Update with latest execution data
				workflowJSON: { nodes: [], connections: {} }, // Default to empty workflow
			};

			if (payload.currentWorkflowJSON) {
				stateUpdate.workflowJSON = jsonParse<SimpleWorkflow>(payload.currentWorkflowJSON);
			}

			// We need to mark the workflow as an override operation
			// to make sure the reducer treats it as a replacement
			// otherwise it would be merged with the previous state
			if (stateUpdate.workflowJSON) {
				stateUpdate.workflowJSON.__reducer_operation = 'override';
			}

			// Stream with just the new message
			stream = await agent.stream(
				{ messages: [new HumanMessage({ content: payload.question })], ...stateUpdate },
				{
					...threadConfig,
					streamMode: ['updates', 'custom'],
					recursionLimit: 80,
				},
			);
		} else {
			// First message - use initial state
			const initialState: typeof WorkflowState.State = {
				messages: [new HumanMessage({ content: payload.question })],
				prompt: payload.question,
				workflowJSON: payload.currentWorkflowJSON
					? jsonParse<SimpleWorkflow>(payload.currentWorkflowJSON)
					: { nodes: [], connections: {} },
				workflowOperations: [],
				isWorkflowPrompt: false,
				executionData: payload.executionData,
			};

			stream = await agent.stream(initialState, {
				...threadConfig,
				streamMode: ['updates', 'custom'],
				recursionLimit: 30,
			});
		}

		// Use the stream processor utility to handle chunk processing
		const streamProcessor = createStreamProcessor(stream);

		for await (const output of streamProcessor) {
			yield output;
		}
	}

	async getSessions(workflowId: string | undefined, user?: IUser) {
		// For now, we'll return the current session if we have a workflowId
		// MemorySaver doesn't expose a way to list all threads, so we'll need to
		// track this differently in a production implementation
		const sessions = [];

		if (workflowId) {
			const threadId = `workflow-${workflowId}-user-${user?.id ?? 'anonymous'}`;
			const threadConfig = {
				configurable: {
					thread_id: threadId,
				},
			};

			try {
				// Try to get the checkpoint for this thread
				const checkpoint = await this.checkpointer.getTuple(threadConfig);

				if (checkpoint?.checkpoint) {
					const messages =
						(checkpoint.checkpoint.channel_values?.messages as Array<
							AIMessage | HumanMessage | ToolMessage
						>) ?? [];

					sessions.push({
						sessionId: threadId,
						messages: formatMessages(messages),
						lastUpdated: checkpoint.checkpoint.ts,
					});
				}
			} catch (error) {
				// Thread doesn't exist yet
				console.log('No session found for workflow:', workflowId);
			}
		}

		return { sessions };
	}
}
