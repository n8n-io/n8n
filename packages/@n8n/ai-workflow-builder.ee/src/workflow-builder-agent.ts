import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, isAIMessage, RemoveMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { MemorySaver, StateSnapshot } from '@langchain/langgraph';
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
import { createMainAgentPrompt } from '@/prompts/legacy-agent.prompt';
import { trimWorkflowJSON } from '@/utils/trim-workflow-context';

import { conversationCompactChain } from './chains/conversation-compact';
import { workflowNameChain } from './chains/workflow-name';
import { LLMServiceError, ValidationError, WorkflowStateError } from './errors';
import { createMultiAgentWorkflowWithSubgraphs } from './multi-agent-workflow-subgraphs';
import { SessionManagerService } from './session-manager.service';
import { getBuilderTools } from './tools/builder-tools';
import type { SimpleWorkflow } from './types/workflow';
import {
	applyCacheControlMarkers,
	cleanStaleWorkflowContext,
	findUserToolMessageIndices,
} from './utils/cache-control/helpers';
import { cleanupDanglingToolCallMessages } from './utils/cleanup-dangling-tool-call-messages';
import { processOperations } from './utils/operations-processor';
import {
	createStreamProcessor,
	type BuilderTool,
	type StreamEvent,
} from './utils/stream-processor';
import { estimateTokenCountFromMessages } from './utils/token-usage';
import { executeToolsInParallel } from './utils/tool-executor';
import { WorkflowState } from './workflow-state';

/**
 * Type for the state snapshot with properly typed values
 */
export type TypedStateSnapshot = Omit<StateSnapshot, 'values'> & {
	values: typeof WorkflowState.State;
};

/**
 * Determines which node to execute next based on the current state.
 * This function decides if the workflow should:
 * - Compact messages (manual or auto)
 * - Delete messages
 * - Create a workflow name
 * - Continue to agent
 */
export function shouldModifyState(
	state: typeof WorkflowState.State,
	autoCompactThresholdTokens: number,
):
	| 'compact_messages'
	| 'delete_messages'
	| 'create_workflow_name'
	| 'auto_compact_messages'
	| 'agent' {
	const { messages, workflowContext } = state;
	const lastHumanMessage = messages.findLast((m) => m instanceof HumanMessage)!; // There always should be at least one human message in the array

	if (lastHumanMessage.content === '/compact') {
		return 'compact_messages';
	}

	if (lastHumanMessage.content === '/clear') {
		return 'delete_messages';
	}

	// If the workflow is empty (no nodes) and the name is using the default pattern
	// (e.g., "My workflow" or "My workflow 1"), we consider it initial generation request
	// and auto-generate a name for the workflow.
	const workflowName = workflowContext?.currentWorkflow?.name;
	const nodesLength = workflowContext?.currentWorkflow?.nodes?.length ?? 0;
	const isDefaultName = !workflowName || /^My workflow( \d+)?$/.test(workflowName);
	if (isDefaultName && nodesLength === 0 && messages.length === 1) {
		return 'create_workflow_name';
	}

	const workflowContextToAppend = getWorkflowContext(state);

	// Check if we should auto-compact based on token count
	const estimatedTokens = estimateTokenCountFromMessages([
		...messages,
		// appended later to last message
		new HumanMessage(workflowContextToAppend),
	]);
	if (estimatedTokens > autoCompactThresholdTokens) {
		return 'auto_compact_messages';
	}

	return 'agent';
}

function getWorkflowContext(state: typeof WorkflowState.State) {
	const trimmedWorkflow = trimWorkflowJSON(state.workflowJSON);
	const executionData = state.workflowContext?.executionData ?? {};
	const executionSchema = state.workflowContext?.executionSchema ?? [];
	const workflowContext = [
		'',
		'<current_workflow_json>',
		JSON.stringify(trimmedWorkflow),
		'</current_workflow_json>',
		'<trimmed_workflow_json_note>',
		'Note: Large property values of the nodes in the workflow JSON above may be trimmed to fit within token limits.',
		'Use get_node_parameter tool to get full details when needed.',
		'</trimmed_workflow_json_note>',
		'',
		'<current_simplified_execution_data>',
		JSON.stringify(executionData),
		'</current_simplified_execution_data>',
		'',
		'<current_execution_nodes_schemas>',
		JSON.stringify(executionSchema),
		'</current_execution_nodes_schemas>',
	].join('\n');

	return workflowContext;
}

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
	/** Metadata to include in LangSmith traces */
	runMetadata?: Record<string, unknown>;
}

export interface ExpressionValue {
	expression: string;
	resolvedValue: unknown;
	nodeType?: string;
}

export interface BuilderFeatureFlags {
	templateExamples?: boolean;
	multiAgent?: boolean;
}

export interface ChatPayload {
	message: string;
	workflowContext?: {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowBase>;
		executionData?: IRunExecutionData['resultData'];
		expressionValues?: Record<string, ExpressionValue[]>;
	};
	featureFlags?: BuilderFeatureFlags;
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
	private runMetadata?: Record<string, unknown>;

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
		this.runMetadata = config.runMetadata;
	}

	private getBuilderTools(featureFlags?: BuilderFeatureFlags): BuilderTool[] {
		return getBuilderTools({
			parsedNodeTypes: this.parsedNodeTypes,
			instanceUrl: this.instanceUrl,
			llmComplexTask: this.llmComplexTask,
			logger: this.logger,
			featureFlags,
		});
	}

	/**
	 * Create the multi-agent workflow graph
	 * Uses supervisor pattern with specialized agents
	 */
	private createMultiAgentGraph(featureFlags?: BuilderFeatureFlags) {
		return createMultiAgentWorkflowWithSubgraphs({
			parsedNodeTypes: this.parsedNodeTypes,
			llmSimpleTask: this.llmSimpleTask,
			llmComplexTask: this.llmComplexTask,
			logger: this.logger,
			instanceUrl: this.instanceUrl,
			checkpointer: this.checkpointer,
			featureFlags,
		});
	}

	/**
	 * Create the legacy single-agent workflow graph
	 */
	private createLegacyWorkflow(featureFlags?: BuilderFeatureFlags) {
		const builderTools = this.getBuilderTools(featureFlags);

		// Extract just the tools for LLM binding
		const tools = builderTools.map((bt) => bt.tool);

		// Create a map for quick tool lookup
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		// Create the prompt with feature flag options
		const mainAgentPrompt = createMainAgentPrompt({
			includeExamplesPhase: featureFlags?.templateExamples === true,
		});

		const callModel = async (state: typeof WorkflowState.State) => {
			if (!this.llmSimpleTask) {
				throw new LLMServiceError('LLM not setup');
			}
			if (typeof this.llmSimpleTask.bindTools !== 'function') {
				throw new LLMServiceError('LLM does not support tools', {
					llmModel: this.llmSimpleTask._llmType(),
				});
			}

			const hasPreviousSummary = state.previousSummary && state.previousSummary !== 'EMPTY';

			const prompt = await mainAgentPrompt.invoke({
				...state,
				workflowJSON: trimWorkflowJSON(state.workflowJSON),
				executionData: state.workflowContext?.executionData ?? {},
				executionSchema: state.workflowContext?.executionSchema ?? [],
				resolvedExpressions: state.workflowContext?.expressionValues,
				instanceUrl: this.instanceUrl,
				previousSummary: hasPreviousSummary ? state.previousSummary : '',
			});

			const workflowContext = getWorkflowContext(state);

			// Optimize prompts for Anthropic's caching by:
			// 1. Finding all user/tool message positions (cache breakpoints)
			// 2. Removing stale workflow context from old messages
			// 3. Adding current workflow context and cache markers to recent messages
			const userToolIndices = findUserToolMessageIndices(prompt.messages);
			cleanStaleWorkflowContext(prompt.messages, userToolIndices);
			applyCacheControlMarkers(prompt.messages, userToolIndices, workflowContext);

			const estimatedTokens = estimateTokenCountFromMessages(prompt.messages);

			if (estimatedTokens > MAX_INPUT_TOKENS) {
				throw new WorkflowStateError(
					'The current conversation and workflow state is too large to process. Try to simplify your workflow by breaking it into smaller parts.',
				);
			}

			const response = await this.llmSimpleTask.bindTools(tools).invoke(prompt);

			return { messages: [response] };
		};

		const shouldModifyStateInternal = (state: typeof WorkflowState.State) => {
			return shouldModifyState(state, this.autoCompactThresholdTokens);
		};

		const shouldContinue = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage = messages[messages.length - 1];
			if (!lastMessage || !isAIMessage(lastMessage)) {
				throw new WorkflowStateError('Expected last message to be generated by the AI agent');
			}

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
			const lastHumanMessage = messages[messages.length - 1] as HumanMessage;
			const isAutoCompact = lastHumanMessage.content !== '/compact';

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
			.addConditionalEdges('cleanup_dangling_tool_calls', shouldModifyStateInternal)
			.addEdge('tools', 'process_operations')
			.addEdge('process_operations', 'agent')
			.addEdge('auto_compact_messages', 'agent')
			.addEdge('create_workflow_name', 'agent')
			.addEdge('delete_messages', END)
			.addEdge('compact_messages', END)
			.addConditionalEdges('agent', shouldContinue);

		return workflow.compile({ checkpointer: this.checkpointer });
	}

	/**
	 * Create the workflow graph based on configuration
	 * Controlled by feature flag only
	 */
	private createWorkflow(featureFlags?: BuilderFeatureFlags) {
		const useMultiAgent = featureFlags?.multiAgent ?? false;

		if (useMultiAgent) {
			this.logger?.debug('Using multi-agent supervisor architecture');
			return this.createMultiAgentGraph(featureFlags);
		}

		this.logger?.debug('Using legacy single-agent architecture');
		return this.createLegacyWorkflow(featureFlags);
	}

	async getState(workflowId?: string, userId?: string): Promise<TypedStateSnapshot> {
		const workflow = this.createWorkflow();
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
		return (await workflow.getState({
			configurable: { thread_id: threadId },
		})) as TypedStateSnapshot;
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
		const agent = this.createWorkflow(payload.featureFlags);
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
			streamMode: ['updates', 'custom'] as const,
			recursionLimit: 50,
			signal: abortSignal,
			callbacks: this.tracer ? [this.tracer] : undefined,
			metadata: this.runMetadata,
			// Enable subgraph streaming when using multi-agent architecture
			subgraphs: payload.featureFlags?.multiAgent ?? false,
		};

		return { agent, threadConfig, streamConfig };
	}

	private async createAgentStream(
		payload: ChatPayload,
		streamConfig: RunnableConfig,
		agent: ReturnType<typeof this.createWorkflow>,
	): Promise<AsyncIterable<StreamEvent>> {
		const stream = await agent.stream(
			{
				messages: [new HumanMessage({ content: payload.message })],
				workflowJSON: this.getDefaultWorkflowJSON(payload),
				workflowOperations: [],
				workflowContext: payload.workflowContext,
			},
			streamConfig,
		);
		// LangGraph's stream has a complex type that doesn't match our StreamEvent definition,
		// but at runtime it produces the correct shape based on streamMode configuration.
		// With streamMode: ['updates', 'custom'] and subgraphs enabled, events are:
		// - Subgraph events: [namespace[], streamMode, data]
		// - Parent events: [streamMode, data]
		return stream as AsyncIterable<StreamEvent>;
	}

	private handleStreamError(error: unknown): never {
		const invalidRequestErrorMessage = this.getInvalidRequestError(error);
		if (invalidRequestErrorMessage) {
			throw new ValidationError(invalidRequestErrorMessage);
		}

		throw error;
	}

	private async *processAgentStream(
		stream: Awaited<ReturnType<typeof this.createAgentStream>>,
		agent: ReturnType<typeof this.createWorkflow>,
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
		agent: ReturnType<typeof this.createWorkflow>,
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
