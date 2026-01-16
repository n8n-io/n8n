import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { MemorySaver, StateSnapshot } from '@langchain/langgraph';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import {
	ApplicationError,
	type INodeTypeDescription,
	type IRunExecutionData,
	type IWorkflowBase,
	type NodeExecutionSchema,
} from 'n8n-workflow';

import { MAX_AI_BUILDER_PROMPT_LENGTH, MAX_MULTI_AGENT_STREAM_ITERATIONS } from '@/constants';

import { ValidationError } from './errors';
import { createMultiAgentWorkflowWithSubgraphs } from './multi-agent-workflow-subgraphs';
import { SessionManagerService } from './session-manager.service';
import type { SimpleWorkflow } from './types/workflow';
import { createStreamProcessor, type StreamEvent } from './utils/stream-processor';
import type { WorkflowState } from './workflow-state';

const PROMPT_IS_TOO_LARGE_ERROR =
	'The current conversation and workflow state is too large to process. Try to simplify your workflow by breaking it into smaller parts.';

const WORKFLOW_TOO_COMPLEX_ERROR =
	'Workflow generation stopped: The AI reached the maximum number of steps while building your workflow. This usually means the workflow design became too complex or got stuck in a loop while trying to create the nodes and connections.';

/**
 * Type for the state snapshot with properly typed values
 */
export type TypedStateSnapshot = Omit<StateSnapshot, 'values'> & {
	values: typeof WorkflowState.State;
};

/**
 * Per-stage LLM configuration for the workflow builder.
 * All stages must be configured with an LLM instance.
 */
export interface StageLLMs {
	supervisor: BaseChatModel;
	responder: BaseChatModel;
	discovery: BaseChatModel;
	builder: BaseChatModel;
	configurator: BaseChatModel;
	parameterUpdater: BaseChatModel;
}

export interface WorkflowBuilderAgentConfig {
	parsedNodeTypes: INodeTypeDescription[];
	/** Per-stage LLM configuration */
	stageLLMs: StageLLMs;
	logger?: Logger;
	checkpointer: MemorySaver;
	tracer?: LangChainTracer;
	instanceUrl?: string;
	/** Metadata to include in LangSmith traces */
	runMetadata?: Record<string, unknown>;
	/** Feature flags for enabling/disabling features */
	featureFlags?: BuilderFeatureFlags;
	/** Callback when generation completes successfully (not aborted) */
	onGenerationSuccess?: () => Promise<void>;
}

export interface ExpressionValue {
	expression: string;
	resolvedValue: unknown;
	nodeType?: string;
}

export interface BuilderFeatureFlags {
	templateExamples?: boolean;
}

export interface ChatPayload {
	id: string;
	message: string;
	workflowContext?: {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowBase>;
		executionData?: IRunExecutionData['resultData'];
		expressionValues?: Record<string, ExpressionValue[]>;
	};
	featureFlags?: BuilderFeatureFlags;
	/** Version ID to store in message metadata for restore functionality */
	versionId?: string;
}

export class WorkflowBuilderAgent {
	private checkpointer: MemorySaver;
	private parsedNodeTypes: INodeTypeDescription[];
	private stageLLMs: StageLLMs;
	private logger?: Logger;
	private tracer?: LangChainTracer;
	private instanceUrl?: string;
	private runMetadata?: Record<string, unknown>;
	private onGenerationSuccess?: () => Promise<void>;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.stageLLMs = config.stageLLMs;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer;
		this.tracer = config.tracer;
		this.instanceUrl = config.instanceUrl;
		this.runMetadata = config.runMetadata;
		this.onGenerationSuccess = config.onGenerationSuccess;
	}

	/**
	 * Create the multi-agent workflow graph
	 * Uses supervisor pattern with specialized agents
	 */
	private createWorkflow(featureFlags?: BuilderFeatureFlags) {
		return createMultiAgentWorkflowWithSubgraphs({
			parsedNodeTypes: this.parsedNodeTypes,
			stageLLMs: this.stageLLMs,
			logger: this.logger,
			instanceUrl: this.instanceUrl,
			checkpointer: this.checkpointer,
			featureFlags,
			onGenerationSuccess: this.onGenerationSuccess,
		});
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

	async *chat(
		payload: ChatPayload,
		userId?: string,
		abortSignal?: AbortSignal,
		externalCallbacks?: Callbacks,
	) {
		this.validateMessageLength(payload.message);

		const { agent, threadConfig, streamConfig } = this.setupAgentAndConfigs(
			payload,
			userId,
			abortSignal,
			externalCallbacks,
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

	private setupAgentAndConfigs(
		payload: ChatPayload,
		userId?: string,
		abortSignal?: AbortSignal,
		externalCallbacks?: Callbacks,
	) {
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
			recursionLimit: MAX_MULTI_AGENT_STREAM_ITERATIONS,
			signal: abortSignal,
			// Use external callbacks if provided (e.g., from LangSmith traceable context),
			// otherwise fall back to the instance tracer
			callbacks: externalCallbacks ?? (this.tracer ? [this.tracer] : undefined),
			metadata: this.runMetadata,
			// Enable subgraph streaming for multi-agent architecture
			subgraphs: true,
		};

		return { agent, threadConfig, streamConfig };
	}

	private async createAgentStream(
		payload: ChatPayload,
		streamConfig: RunnableConfig,
		agent: ReturnType<typeof this.createWorkflow>,
	): Promise<AsyncIterable<StreamEvent>> {
		const humanMessage = new HumanMessage({
			content: payload.message,
			additional_kwargs: {
				...(payload.versionId && { versionId: payload.versionId }),
				...(payload.id && { messageId: payload.id }),
			},
		});
		const stream = await agent.stream(
			{
				messages: [humanMessage],
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
			// handleAgentStreamError returns for aborts, throws for other errors
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
			throw new ApplicationError(WORKFLOW_TOO_COMPLEX_ERROR);
		}

		// Check for 401 expired token errors (typically from long-running generations)
		if (this.isTokenExpiredError(error)) {
			throw new ApplicationError(WORKFLOW_TOO_COMPLEX_ERROR);
		}

		// Re-throw any other errors
		throw error;
	}

	/**
	 * Checks if the error is a 401 expired token error from the LLM provider proxy.
	 * This typically occurs during very long-running workflow generations when
	 * the AI assistant service proxy token expires.
	 *
	 * We specifically check for LangChain's MODEL_AUTHENTICATION error code to ensure
	 * we only catch authentication errors from the LLM provider, not unrelated 401s.
	 */
	private isTokenExpiredError(error: unknown): boolean {
		const LC_MODEL_AUTHENTICATION_ERROR = 'MODEL_AUTHENTICATION';

		return (
			!!error &&
			typeof error === 'object' &&
			'lc_error_code' in error &&
			error.lc_error_code === LC_MODEL_AUTHENTICATION_ERROR &&
			'status' in error &&
			error.status === 401
		);
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
					// Override original error message from model provider for prompt size issues
					if (errorDetails.message.toLocaleLowerCase().includes('prompt is too long')) {
						return PROMPT_IS_TOO_LARGE_ERROR;
					}

					return errorDetails.message;
				}
			}
		}

		return undefined;
	}
}
