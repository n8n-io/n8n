import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, RemoveMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { MemorySaver } from '@langchain/langgraph';
import { StateGraph, END, GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import {
	ApplicationError,
	type INodeTypeDescription,
	type IRunExecutionData,
	type IWorkflowBase,
	type NodeExecutionSchema,
} from 'n8n-workflow';

import {
	DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS,
	MAX_AI_BUILDER_PROMPT_LENGTH,
	MAX_INPUT_TOKENS,
} from '@/constants';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';

import { conversationCompactChain } from './chains/conversation-compact';
import { workflowNameChain } from './chains/workflow-name';
import { LLMServiceError, ValidationError, WorkflowStateError } from './errors';
import { SessionManagerService } from './session-manager.service';
import { getBuilderTools } from './tools/builder-tools';
import { mainAgentPrompt } from './tools/prompts/main-agent.prompt';
import type { SimpleWorkflow } from './types/workflow';
import { cleanupDanglingToolCallMessages } from './utils/cleanup-dangling-tool-call-messages';
import { processOperations } from './utils/operations-processor';
import { createStreamProcessor, type BuilderTool } from './utils/stream-processor';
import { estimateTokenCountFromMessages, extractLastTokenUsage } from './utils/token-usage';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

export interface WorkflowBuilderAgentConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	checkpointer: MemorySaver;
	tracer?: LangChainTracer;
	autoCompactThresholdTokens?: number;
	instanceUrl?: string;
	onGenerationSuccess?: () => Promise<void>;
}

export interface ChatPayload {
	message: string;
	workflowContext?: {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowBase>;
		executionData?: IRunExecutionData['resultData'];
	};
	/**
	 * Calls AI Assistant Service using deprecated credentials and endpoints
	 * These credentials/endpoints will soon be removed
	 * As new implementation is rolled out and builder experiment is released
	 */
	useDeprecatedCredentials?: boolean;
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
	private onGenerationSuccess?: () => Promise<void>;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.llmSimpleTask = config.llmSimpleTask;
		this.llmComplexTask = config.llmComplexTask;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer;
		this.tracer = config.tracer;
		this.autoCompactThresholdTokens =
			config.autoCompactThresholdTokens ?? DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS;
		this.instanceUrl = config.instanceUrl;
		this.onGenerationSuccess = config.onGenerationSuccess;
	}

	private getBuilderTools(): BuilderTool[] {
		return getBuilderTools({
			parsedNodeTypes: this.parsedNodeTypes,
			instanceUrl: this.instanceUrl,
			llmComplexTask: this.llmComplexTask,
			logger: this.logger,
		});
	}

	private createWorkflow() {
		const builderTools = this.getBuilderTools();

		// Extract just the tools for LLM binding
		const tools = builderTools.map((bt) => bt.tool);

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
				workflowJSON: trimWorkflowJSON(state.workflowJSON),
				executionData: state.workflowContext?.executionData ?? {},
				executionSchema: state.workflowContext?.executionSchema ?? [],
				instanceUrl: this.instanceUrl,
			});

			const estimatedTokens = estimateTokenCountFromMessages(prompt.messages);

			if (estimatedTokens > MAX_INPUT_TOKENS) {
				throw new WorkflowStateError(
					'The current conversation and workflow state is too large to process. Try to simplify your workflow by breaking it into smaller parts.',
				);
			}

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

			// Call success callback when agent finishes without tool calls (successful generation)
			if (this.onGenerationSuccess) {
				void Promise.resolve(this.onGenerationSuccess()).catch((error) => {
					this.logger?.warn('Failed to execute onGenerationSuccess callback', { error });
				});
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

		/**
		 * Cleans up dangling tool calls from the state
		 * that might have been left due to unexpected interruptions during tool execution.
		 */
		const cleanupDanglingToolCalls = (state: typeof WorkflowState.State) => {
			const messagesToRemove = cleanupDanglingToolCallMessages(state.messages);

			if (messagesToRemove.length > 0) {
				this.logger?.warn('Cleaning up dangling tool call messages', {
					messagesToRemove: messagesToRemove.map((m) => m.id),
				});
			}

			return {
				messages: messagesToRemove,
			};
		};

		const workflow = new StateGraph(WorkflowState)
			.addNode('agent', callModel)
			.addNode('tools', customToolExecutor)
			.addNode('process_operations', processOperations)
			.addNode('delete_messages', deleteMessages)
			.addNode('compact_messages', compactSession)
			.addNode('auto_compact_messages', compactSession)
			.addNode('create_workflow_name', createWorkflowName)
			.addNode('cleanup_dangling_tool_calls', cleanupDanglingToolCalls)
			.addEdge('__start__', 'cleanup_dangling_tool_calls')
			.addConditionalEdges('cleanup_dangling_tool_calls', shouldModifyState)
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
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
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
				content: 'Task aborted',
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
}
