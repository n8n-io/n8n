import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessage, ToolMessage } from '@langchain/core/messages';
import { HumanMessage, RemoveMessage } from '@langchain/core/messages';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { StateGraph, MemorySaver, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { assert, jsonParse } from 'n8n-workflow';
import type { INodeTypeDescription, IRunExecutionData } from 'n8n-workflow';

import { conversationCompactChain } from './chains/conversation-compact';
import { createAddNodeTool } from './tools/add-node.tool';
import { createConnectNodesTool } from './tools/connect-nodes.tool';
import { createNodeDetailsTool } from './tools/node-details.tool';
import { createNodeSearchTool } from './tools/node-search.tool';
import { mainAgentPrompt } from './tools/prompts/main-agent.prompt';
import { createRemoveNodeTool } from './tools/remove-node.tool';
import { createUpdateNodeParametersTool } from './tools/update-node-parameters.tool';
import type { SimpleWorkflow } from './types/workflow';
import { processOperations } from './utils/operations-processor';
import { createStreamProcessor, formatMessages } from './utils/stream-processor';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

export interface WorkflowBuilderAgentConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	checkpointer?: MemorySaver;
	tracer?: LangChainTracer;
}

export interface ChatPayload {
	question: string;
	currentWorkflowJSON?: string;
	workflowId?: string;
	executionData?: IRunExecutionData['resultData'];
}

export class WorkflowBuilderAgent {
	private checkpointer: MemorySaver;
	private parsedNodeTypes: INodeTypeDescription[];
	private llmSimpleTask: BaseChatModel;
	private llmComplexTask: BaseChatModel;
	private logger?: Logger;
	private tracer?: LangChainTracer;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.llmSimpleTask = config.llmSimpleTask;
		this.llmComplexTask = config.llmComplexTask;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer ?? new MemorySaver();
		this.tracer = config.tracer;
	}

	private createWorkflow() {
		const tools = [
			createNodeSearchTool(this.parsedNodeTypes),
			createNodeDetailsTool(this.parsedNodeTypes),
			createAddNodeTool(this.parsedNodeTypes),
			createConnectNodesTool(this.parsedNodeTypes, this.logger),
			createRemoveNodeTool(this.logger),
			createUpdateNodeParametersTool(this.parsedNodeTypes, this.llmComplexTask, this.logger),
		];

		// Create a map for quick tool lookup
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		const callModel = async (state: typeof WorkflowState.State) => {
			assert(this.llmSimpleTask, 'LLM not setup');
			assert(typeof this.llmSimpleTask.bindTools === 'function', 'LLM does not support tools');

			const prompt = await mainAgentPrompt.invoke(state);
			const response = await this.llmSimpleTask.bindTools(tools).invoke(prompt);

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
			const stateUpdate: Partial<typeof WorkflowState.State> = {
				workflowOperations: null,
				executionData: undefined,
				messages: messages.map((m) => new RemoveMessage({ id: m.id! })) ?? [],
				workflowJSON: {
					nodes: [],
					connections: {},
				},
			};

			return stateUpdate;
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

	async *chat(payload: ChatPayload, userId?: string) {
		const agent = this.createWorkflow().compile({ checkpointer: this.checkpointer });

		// Generate thread ID from workflowId and userId
		// This ensures one session per workflow per user
		const threadId = payload.workflowId
			? `workflow-${payload.workflowId}-user-${userId ?? new Date().getTime()}`
			: `user-${userId ?? new Date().getTime()}-default`;

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

		if (!existingCheckpoint?.checkpoint) {
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
				callbacks: this.tracer ? [this.tracer] : undefined,
			});
		} else {
			// Subsequent message - update the state with current workflow
			const stateUpdate: Partial<typeof WorkflowState.State> = {
				workflowOperations: [], // Clear any pending operations from previous message
				executionData: payload.executionData, // Update with latest execution data
				workflowJSON: { nodes: [], connections: {} }, // Default to empty workflow
			};

			if (payload.currentWorkflowJSON) {
				stateUpdate.workflowJSON = jsonParse<SimpleWorkflow>(payload.currentWorkflowJSON);
			}

			// Stream with just the new message
			stream = await agent.stream(
				{ messages: [new HumanMessage({ content: payload.question })], ...stateUpdate },
				{
					...threadConfig,
					streamMode: ['updates', 'custom'],
					recursionLimit: 80,
					callbacks: this.tracer ? [this.tracer] : undefined,
				},
			);
		}

		// Use the stream processor utility to handle chunk processing
		const streamProcessor = createStreamProcessor(stream);

		for await (const output of streamProcessor) {
			yield output;
		}
	}

	async getSessions(workflowId: string | undefined, userId?: string) {
		// For now, we'll return the current session if we have a workflowId
		// MemorySaver doesn't expose a way to list all threads, so we'll need to
		// track this differently in a production implementation
		const sessions = [];

		if (workflowId) {
			const threadId = `workflow-${workflowId}-user-${userId ?? 'anonymous'}`;
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
