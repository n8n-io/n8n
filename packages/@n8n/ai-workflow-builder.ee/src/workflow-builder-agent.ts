import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, RemoveMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { StateGraph, MemorySaver, END, GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import {
	ApplicationError,
	type INodeTypeDescription,
	type IRunExecutionData,
	type IWorkflowBase,
	type NodeExecutionSchema,
} from 'n8n-workflow';

import { workflowNameChain } from '@/chains/workflow-name';
import { DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS, MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';

import { conversationCompactChain } from './chains/conversation-compact';
import { LLMServiceError, ValidationError } from './errors';
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
import { extractLastTokenUsage } from './utils/token-usage';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

export interface WorkflowBuilderAgentConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	checkpointer?: MemorySaver;
	tracer?: LangChainTracer;
	autoCompactThresholdTokens?: number;
	instanceUrl?: string;
}

export interface ChatPayload {
	message: string;
	workflowContext?: {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowBase>;
		executionData?: IRunExecutionData['resultData'];
	};
}

export class WorkflowBuilderAgent {
	private checkpointer: MemorySaver;
	private parsedNodeTypes: INodeTypeDescription[];
	private llmSimpleTask: BaseChatModel;
	private llmComplexTask: BaseChatModel;
	private logger?: Logger;
	private tracer?: LangChainTracer;
	private autoCompactThresholdTokens: number;
	private instanceUrl?: string;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.llmSimpleTask = config.llmSimpleTask;
		this.llmComplexTask = config.llmComplexTask;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer ?? new MemorySaver();
		this.tracer = config.tracer;
		this.autoCompactThresholdTokens =
			config.autoCompactThresholdTokens ?? DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS;
		this.instanceUrl = config.instanceUrl;
	}

	private createWorkflow() {
		const tools = [
			createNodeSearchTool(this.parsedNodeTypes),
			createNodeDetailsTool(this.parsedNodeTypes),
			createAddNodeTool(this.parsedNodeTypes),
			createConnectNodesTool(this.parsedNodeTypes, this.logger),
			createRemoveNodeTool(this.logger),
			createUpdateNodeParametersTool(
				this.parsedNodeTypes,
				this.llmComplexTask,
				this.logger,
				this.instanceUrl,
			),
		];

		// Create a map for quick tool lookup
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		const callModel = async (state: typeof WorkflowState.State) => {
			if (!this.llmSimpleTask) {
				throw new LLMServiceError('LLM not setup');
			}
			if (typeof this.llmSimpleTask.bindTools !== 'function') {
				throw new LLMServiceError('LLM does not support tools', {
					llmModel: this.llmSimpleTask._llmType(),
				});
			}

			const prompt = await mainAgentPrompt.invoke({
				...state,
				executionData: state.workflowContext?.executionData ?? {},
				executionSchema: state.workflowContext?.executionSchema ?? [],
				instanceUrl: this.instanceUrl,
			});
			const response = await this.llmSimpleTask.bindTools(tools).invoke(prompt);

			return { messages: [response] };
		};

		const shouldAutoCompact = ({ messages }: typeof WorkflowState.State) => {
			const tokenUsage = extractLastTokenUsage(messages);

			if (!tokenUsage) {
				this.logger?.debug('No token usage metadata found');
				return false;
			}

			const tokensUsed = tokenUsage.input_tokens + tokenUsage.output_tokens;

			this.logger?.debug('Token usage', {
				inputTokens: tokenUsage.input_tokens,
				outputTokens: tokenUsage.output_tokens,
				totalTokens: tokensUsed,
			});

			return tokensUsed > this.autoCompactThresholdTokens;
		};

		const shouldModifyState = (state: typeof WorkflowState.State) => {
			const { messages, workflowContext } = state;
			const lastHumanMessage = messages.findLast((m) => m instanceof HumanMessage)!; // There always should be at least one human message in the array

			if (lastHumanMessage.content === '/compact') {
				return 'compact_messages';
			}

			if (lastHumanMessage.content === '/clear') {
				return 'delete_messages';
			}

			// If the workflow is empty (no nodes),
			// we consider it initial generation request and auto-generate a name for the workflow.
			if (workflowContext?.currentWorkflow?.nodes?.length === 0 && messages.length === 1) {
				return 'create_workflow_name';
			}

			if (shouldAutoCompact(state)) {
				return 'auto_compact_messages';
			}

			return 'agent';
		};

		const shouldContinue = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage: AIMessage = messages[messages.length - 1];

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
				workflowContext: {},
				messages: messages.map((m) => new RemoveMessage({ id: m.id! })) ?? [],
				workflowJSON: {
					nodes: [],
					connections: {},
					name: '',
				},
			};

			return stateUpdate;
		}

		/**
		 * Compacts the conversation history by summarizing it
		 * and removing original messages.
		 * Might be triggered manually by the user with `/compact` message, or run automatically
		 * when the conversation history exceeds a certain token limit.
		 */
		const compactSession = async (state: typeof WorkflowState.State) => {
			if (!this.llmSimpleTask) {
				throw new LLMServiceError('LLM not setup');
			}

			const { messages, previousSummary } = state;
			const lastHumanMessage = messages[messages.length - 1] satisfies HumanMessage;
			const isAutoCompact = lastHumanMessage.content !== '/compact';

			this.logger?.debug('Compacting conversation history', {
				isAutoCompact,
			});

			const compactedMessages = await conversationCompactChain(
				this.llmSimpleTask,
				messages,
				previousSummary,
			);

			// The summarized conversation history will become a part of system prompt
			// and will be used in the next LLM call.
			// We will remove all messages and replace them with a mock HumanMessage and AIMessage
			// to indicate that the conversation history has been compacted.
			// If this is an auto-compact, we will also keep the last human message, as it will continue executing the workflow.
			return {
				previousSummary: compactedMessages.summaryPlain,
				messages: [
					...messages.map((m) => new RemoveMessage({ id: m.id! })),
					new HumanMessage('Please compress the conversation history'),
					new AIMessage('Successfully compacted conversation history'),
					...(isAutoCompact ? [new HumanMessage({ content: lastHumanMessage.content })] : []),
				],
			};
		};

		/**
		 * Creates a workflow name based on the initial user message.
		 */
		const createWorkflowName = async (state: typeof WorkflowState.State) => {
			if (!this.llmSimpleTask) {
				throw new LLMServiceError('LLM not setup');
			}

			const { workflowJSON, messages } = state;

			if (messages.length === 1 && messages[0] instanceof HumanMessage) {
				const initialMessage = messages[0] satisfies HumanMessage;

				if (typeof initialMessage.content !== 'string') {
					this.logger?.debug(
						'Initial message content is not a string, skipping workflow name generation',
					);
					return {};
				}

				this.logger?.debug('Generating workflow name');
				const { name } = await workflowNameChain(this.llmSimpleTask, initialMessage.content);

				return {
					workflowJSON: {
						...workflowJSON,
						name,
					},
				};
			}

			return {};
		};

		const workflow = new StateGraph(WorkflowState)
			.addNode('agent', callModel)
			.addNode('tools', customToolExecutor)
			.addNode('process_operations', processOperations)
			.addNode('delete_messages', deleteMessages)
			.addNode('compact_messages', compactSession)
			.addNode('auto_compact_messages', compactSession)
			.addNode('create_workflow_name', createWorkflowName)
			.addConditionalEdges('__start__', shouldModifyState)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent')
			.addEdge('auto_compact_messages', 'agent')
			.addEdge('create_workflow_name', 'agent')
			.addEdge('delete_messages', END)
			.addEdge('compact_messages', END)
			.addConditionalEdges('agent', shouldContinue);

		return workflow;
	}

	async getState(workflowId: string, userId?: string) {
		const workflow = this.createWorkflow();
		const agent = workflow.compile({ checkpointer: this.checkpointer });
		return await agent.getState({
			configurable: { thread_id: `workflow-${workflowId}-user-${userId ?? new Date().getTime()}` },
		});
	}

	static generateThreadId(workflowId?: string, userId?: string) {
		return workflowId
			? `workflow-${workflowId}-user-${userId ?? new Date().getTime()}`
			: crypto.randomUUID();
	}

	private getDefaultWorkflowJSON(payload: ChatPayload): SimpleWorkflow {
		return (
			(payload.workflowContext?.currentWorkflow as SimpleWorkflow) ?? {
				nodes: [],
				connections: {},
			}
		);
	}

	async *chat(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal) {
		this.validateMessageLength(payload.message);

		const { agent, threadConfig, streamConfig } = this.setupAgentAndConfigs(
			payload,
			userId,
			abortSignal,
		);

		try {
			const stream = await this.createAgentStream(payload, streamConfig, agent);
			yield* this.processAgentStream(stream, agent, threadConfig);
		} catch (error: unknown) {
			this.handleStreamError(error);
		}
	}

	private validateMessageLength(message: string): void {
		if (message.length > MAX_AI_BUILDER_PROMPT_LENGTH) {
			this.logger?.warn('Message exceeds maximum length', {
				messageLength: message.length,
				maxLength: MAX_AI_BUILDER_PROMPT_LENGTH,
			});

			throw new ValidationError(
				`Message exceeds maximum length of ${MAX_AI_BUILDER_PROMPT_LENGTH} characters`,
			);
		}
	}

	private setupAgentAndConfigs(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal) {
		const agent = this.createWorkflow().compile({ checkpointer: this.checkpointer });
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		// Generate thread ID from workflowId and userId
		// This ensures one session per workflow per user
		const threadId = WorkflowBuilderAgent.generateThreadId(workflowId, userId);
		const threadConfig: RunnableConfig = {
			configurable: {
				thread_id: threadId,
			},
		};
		const streamConfig = {
			...threadConfig,
			streamMode: ['updates', 'custom'],
			recursionLimit: 50,
			signal: abortSignal,
			callbacks: this.tracer ? [this.tracer] : undefined,
		};

		return { agent, threadConfig, streamConfig };
	}

	private async createAgentStream(
		payload: ChatPayload,
		streamConfig: RunnableConfig,
		agent: ReturnType<ReturnType<typeof this.createWorkflow>['compile']>,
	) {
		return await agent.stream(
			{
				messages: [new HumanMessage({ content: payload.message })],
				workflowJSON: this.getDefaultWorkflowJSON(payload),
				workflowOperations: [],
				workflowContext: payload.workflowContext,
			},
			streamConfig,
		);
	}

	private handleStreamError(error: unknown): never {
		const invalidRequestErrorMessage = this.getInvalidRequestError(error);
		if (invalidRequestErrorMessage) {
			throw new ValidationError(invalidRequestErrorMessage);
		}

		throw error;
	}

	private async *processAgentStream(
		stream: AsyncGenerator<[string, unknown], void, unknown>,
		agent: ReturnType<ReturnType<typeof this.createWorkflow>['compile']>,
		threadConfig: RunnableConfig,
	) {
		try {
			const streamProcessor = createStreamProcessor(stream);
			for await (const output of streamProcessor) {
				yield output;
			}
		} catch (error) {
			await this.handleAgentStreamError(error, agent, threadConfig);
		}
	}

	private async handleAgentStreamError(
		error: unknown,
		agent: ReturnType<ReturnType<typeof this.createWorkflow>['compile']>,
		threadConfig: RunnableConfig,
	): Promise<void> {
		if (
			error &&
			typeof error === 'object' &&
			'message' in error &&
			typeof error.message === 'string' &&
			// This is naive, but it's all we get from LangGraph AbortError
			['Abort', 'Aborted'].includes(error.message)
		) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const messages = (await agent.getState(threadConfig)).values.messages as Array<
				AIMessage | HumanMessage | ToolMessage
			>;

			// Handle abort errors gracefully
			const abortedAiMessage = new AIMessage({
				content: '[Task aborted]',
				id: crypto.randomUUID(),
			});
			// TODO: Should we clear tool calls that are in progress?
			await agent.updateState(threadConfig, { messages: [...messages, abortedAiMessage] });
			return;
		}

		// If it's not an abort error, check for GraphRecursionError
		if (error instanceof GraphRecursionError) {
			throw new ApplicationError(
				'Workflow generation stopped: The AI reached the maximum number of steps while building your workflow. This usually means the workflow design became too complex or got stuck in a loop while trying to create the nodes and connections.',
			);
		}

		// Re-throw any other errors
		throw error;
	}

	private getInvalidRequestError(error: unknown): string | undefined {
		if (
			error instanceof Error &&
			'error' in error &&
			typeof error.error === 'object' &&
			error.error
		) {
			const innerError = error.error;
			if ('error' in innerError && typeof innerError.error === 'object' && innerError.error) {
				const errorDetails = innerError.error;
				if (
					'type' in errorDetails &&
					errorDetails.type === 'invalid_request_error' &&
					'message' in errorDetails &&
					typeof errorDetails.message === 'string'
				) {
					return errorDetails.message;
				}
			}
		}

		return undefined;
	}

	async getSessions(workflowId: string | undefined, userId?: string) {
		// For now, we'll return the current session if we have a workflowId
		// MemorySaver doesn't expose a way to list all threads, so we'll need to
		// track this differently if we want to list all sessions
		const sessions = [];

		if (workflowId) {
			const threadId = WorkflowBuilderAgent.generateThreadId(workflowId, userId);
			const threadConfig: RunnableConfig = {
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
				this.logger?.debug('No session found for workflow:', { workflowId, error });
			}
		}

		return { sessions };
	}
}
