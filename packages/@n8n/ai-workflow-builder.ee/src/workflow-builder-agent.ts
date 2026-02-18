import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, ToolMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { MemorySaver, StateSnapshot } from '@langchain/langgraph';
import { Command, GraphRecursionError } from '@langchain/langgraph';
import type { SelectedNodeContext } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	ApplicationError,
	OperationalError,
	type INodeTypeDescription,
	type IRunExecutionData,
	type ITelemetryTrackProperties,
	type IWorkflowBase,
	type NodeExecutionSchema,
} from 'n8n-workflow';

import { MAX_AI_BUILDER_PROMPT_LENGTH, MAX_MULTI_AGENT_STREAM_ITERATIONS } from '@/constants';

import { parsePlanDecision } from './agents/planner.agent';
import type { AssistantHandler } from './assistant';
import { CodeWorkflowBuilder } from './code-builder';
import { TriageAgent } from './code-builder/triage.agent';
import type { TriageAgentOutcome } from './code-builder/triage.agent';
import {
	type CodeBuilderSession,
	loadCodeBuilderSession,
	saveCodeBuilderSession,
	generateCodeBuilderThreadId,
} from './code-builder/utils/code-builder-session';
import { ValidationError } from './errors';
import { createMultiAgentWorkflowWithSubgraphs } from './multi-agent-workflow-subgraphs';
import { SessionManagerService } from './session-manager.service';
import type { ResourceLocatorCallback } from './types/callbacks';
import type { HITLInterruptValue, PlanOutput } from './types/planning';
import type { SimpleWorkflow } from './types/workflow';
import { sanitizeLlmErrorMessage } from './utils/error-sanitizer';
import { createStreamProcessor, type StreamEvent } from './utils/stream-processor';
import type { WorkflowState } from './workflow-state';

const PROMPT_IS_TOO_LARGE_ERROR =
	'The current conversation and workflow state is too large to process. Try to simplify your workflow by breaking it into smaller parts.';

const WORKFLOW_TOO_COMPLEX_ERROR =
	'Workflow generation stopped: The AI reached the maximum number of steps while building your workflow. This usually means the workflow design became too complex or got stuck in a loop while trying to create the nodes and connections.';

/**
 * Type for the state snapshot with properly typed values.
 * Note: Uses WorkflowState.State for backward compatibility.
 * The actual graph uses ParentGraphState which includes additional fields like introspectionEvents.
 */
export type TypedStateSnapshot = Omit<StateSnapshot, 'values'> & {
	values: typeof WorkflowState.State & {
		// Additional fields from ParentGraphState that may be present at runtime
		introspectionEvents?: unknown[];
	};
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
	parameterUpdater: BaseChatModel;
	planner: BaseChatModel;
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
	/**
	 * Ordered list of directories to search for built-in node definitions.
	 */
	nodeDefinitionDirs?: string[];
	/** Callback for fetching resource locator options */
	resourceLocatorCallback?: ResourceLocatorCallback;
	/** Callback for emitting telemetry events */
	onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	/** Assistant handler for routing help/debug queries via the SDK (code builder only) */
	assistantHandler?: AssistantHandler;
}

export interface ExpressionValue {
	expression: string;
	resolvedValue: unknown;
	nodeType?: string;
}

export interface BuilderFeatureFlags {
	templateExamples?: boolean;
	/** Enable CodeWorkflowBuilder (default: false). When false, uses legacy multi-agent system. */
	codeBuilder?: boolean;
	/** Enable pin data generation in code builder (default: true when codeBuilder is true). */
	pinData?: boolean;
	planMode?: boolean;
	/** Enable introspection tool for diagnostic data collection. Disabled by default. */
	enableIntrospection?: boolean;
	/** Enable merged ask/build experience with assistant subgraph (default: false). */
	mergeAskBuild?: boolean;
}

export interface ChatPayload {
	id: string;
	message: string;
	workflowContext?: {
		executionSchema?: NodeExecutionSchema[];
		currentWorkflow?: Partial<IWorkflowBase>;
		executionData?: IRunExecutionData['resultData'];
		expressionValues?: Record<string, ExpressionValue[]>;
		/** Whether execution schema values were excluded (redacted) */
		valuesExcluded?: boolean;
		/** Node names whose output schema was derived from pin data */
		pinnedNodes?: string[];
		/**
		 * Nodes explicitly selected/focused by the user for AI context.
		 * When present, the AI should prioritize responses around these nodes,
		 * resolving deictic references ("this node", "it") to these nodes.
		 */
		selectedNodes?: SelectedNodeContext[];
	};
	featureFlags?: BuilderFeatureFlags;
	/** Version ID to store in message metadata for restore functionality */
	versionId?: string;
	/** Builder mode: 'build' for direct generation, 'plan' for planning first */
	mode?: 'build' | 'plan';
	/** Resume payload for LangGraph interrupt() */
	resumeData?: unknown;
	/** Interrupt record for session replay (server-provided on resume) */
	resumeInterrupt?: HITLInterruptValue;
	/** Approved plan from planning phase (injected when routing plan approval to code builder) */
	planOutput?: PlanOutput;
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
	private nodeDefinitionDirs?: string[];
	private resourceLocatorCallback?: ResourceLocatorCallback;
	private onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	private assistantHandler?: AssistantHandler;
	/** Feature flags stored from the first chat call to ensure consistency across a session */
	private sessionFeatureFlags?: BuilderFeatureFlags;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.stageLLMs = config.stageLLMs;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer;
		this.tracer = config.tracer;
		this.instanceUrl = config.instanceUrl;
		this.runMetadata = config.runMetadata;
		this.onGenerationSuccess = config.onGenerationSuccess;
		this.nodeDefinitionDirs = config.nodeDefinitionDirs;
		this.resourceLocatorCallback = config.resourceLocatorCallback;
		this.onTelemetryEvent = config.onTelemetryEvent;
		this.assistantHandler = config.assistantHandler;
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
			resourceLocatorCallback: this.resourceLocatorCallback,
			assistantHandler: this.assistantHandler,
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
		historicalMessages?: BaseMessage[],
	) {
		this.validateMessageLength(payload.message);

		// Feature flag: Route to CodeWorkflowBuilder if enabled (default: false)
		const useCodeWorkflowBuilder = payload.featureFlags?.codeBuilder ?? false;

		if (useCodeWorkflowBuilder) {
			const usePlanMode = payload.featureFlags?.planMode === true;

			// Check if this is a plan decision resume (approval/modify/reject)
			if (payload.resumeData && payload.resumeInterrupt?.type === 'plan') {
				const decision = parsePlanDecision(payload.resumeData);

				if (decision.action === 'approve') {
					// Plan approved: extract plan, route to CodeWorkflowBuilder with plan context
					this.logger?.debug('Plan approved, routing to CodeWorkflowBuilder with plan', {
						userId,
					});
					const codePayload: ChatPayload = {
						...payload,
						planOutput: payload.resumeInterrupt.plan,
						resumeData: undefined,
						resumeInterrupt: undefined,
					};
					yield* this.runCodeWorkflowBuilder(codePayload, userId, abortSignal);
					return;
				}

				// Plan modify or reject: resume multi-agent system
				this.logger?.debug('Plan modify/reject, resuming multi-agent system', {
					userId,
					action: decision.action,
				});
				yield* this.runMultiAgentSystem(
					payload,
					userId,
					abortSignal,
					externalCallbacks,
					historicalMessages,
				);
				return;
			}

			// Initial plan request: route to multi-agent for discovery + planning
			if (usePlanMode && payload.mode === 'plan') {
				this.logger?.debug('Plan mode with code builder, routing to multi-agent for planning', {
					userId,
				});
				yield* this.runMultiAgentSystem(
					payload,
					userId,
					abortSignal,
					externalCallbacks,
					historicalMessages,
				);
				return;
			}

			const isMergeAskBuildEnabled = process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD === 'true';
			if (isMergeAskBuildEnabled && this.assistantHandler) {
				this.logger?.debug('Routing through triage agent', { userId });
				yield* this.runTriageAgent(payload, userId, abortSignal);
			} else {
				this.logger?.debug('Routing to code workflow builder', { userId });
				yield* this.runCodeWorkflowBuilder(payload, userId, abortSignal);
			}
			return;
		}

		// Fall back to legacy multi-agent system
		this.logger?.debug('Routing to legacy multi-agent system', { userId });
		yield* this.runMultiAgentSystem(
			payload,
			userId,
			abortSignal,
			externalCallbacks,
			historicalMessages,
		);
	}

	private async *runCodeWorkflowBuilder(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	) {
		const codeWorkflowBuilder = new CodeWorkflowBuilder({
			llm: this.stageLLMs.builder,
			nodeTypes: this.parsedNodeTypes,
			logger: this.logger,
			nodeDefinitionDirs: this.nodeDefinitionDirs,
			checkpointer: this.checkpointer,
			onGenerationSuccess: this.onGenerationSuccess,
			callbacks: this.tracer ? [this.tracer] : undefined,
			runMetadata: {
				...this.runMetadata,
				userMessageId: payload.id,
				workflowId: payload.workflowContext?.currentWorkflow?.id,
			},
			onTelemetryEvent: this.onTelemetryEvent,
			generatePinData: payload.featureFlags?.pinData ?? true,
		});

		yield* codeWorkflowBuilder.chat(payload, userId ?? 'unknown', abortSignal);
	}

	private async *runTriageAgent(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	) {
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const resolvedUserId = userId ?? 'unknown';
		let session: CodeBuilderSession | undefined;
		let threadId: string | undefined;

		if (workflowId) {
			threadId = generateCodeBuilderThreadId(workflowId, resolvedUserId);
			session = await loadCodeBuilderSession(this.checkpointer, threadId);
		}

		const triageAgent = new TriageAgent({
			llm: this.stageLLMs.builder,
			assistantHandler: this.assistantHandler!,
			buildWorkflow: (p, u, s) => this.runCodeWorkflowBuilder(p, u, s),
			logger: this.logger,
		});

		// Only reuse the SDK session if the most recent interaction was an
		// assistant exchange. If build requests or plans happened in between,
		// the SDK's internal conversation context is stale and would confuse
		// the assistant.
		const lastEntry = session?.conversationEntries?.at(-1);
		const sdkSessionId =
			lastEntry?.type === 'assistant-exchange' ? session?.sdkSessionId : undefined;

		const gen = triageAgent.run({
			payload,
			userId: resolvedUserId,
			abortSignal,
			sdkSessionId,
			conversationHistory: session?.conversationEntries,
		});

		const { outcome, collectedText } = yield* this.drainTriageGenerator(gen);

		if (session && threadId) {
			await this.saveTriageOutcome(session, threadId, payload.message, outcome, collectedText);
		}
	}

	/**
	 * Drain the triage generator, yielding each chunk and collecting text along the way.
	 */
	private async *drainTriageGenerator(gen: ReturnType<TriageAgent['run']>) {
		const collectedText: string[] = [];
		let iterResult = await gen.next();
		while (!iterResult.done) {
			yield iterResult.value;
			for (const msg of iterResult.value.messages ?? []) {
				if (msg.type === 'message' && 'text' in msg) {
					collectedText.push(msg.text);
				}
			}
			iterResult = await gen.next();
		}
		return { outcome: iterResult.value, collectedText };
	}

	/**
	 * Persist triage outcome to the code builder session.
	 */
	private async saveTriageOutcome(
		session: CodeBuilderSession,
		threadId: string,
		userMessage: string,
		outcome: TriageAgentOutcome,
		collectedText: string[],
	) {
		if (outcome.assistantSummary) {
			session.conversationEntries.push({
				type: 'assistant-exchange',
				userQuery: userMessage,
				assistantSummary: outcome.assistantSummary,
			});
			session.sdkSessionId = outcome.sdkSessionId;
		}
		if (outcome.buildExecuted) {
			if (outcome.assistantSummary) {
				await saveCodeBuilderSession(this.checkpointer, threadId, session);
			}
			return;
		}
		if (!outcome.assistantSummary) {
			session.conversationEntries.push({
				type: 'plan',
				userQuery: userMessage,
				plan: collectedText.join('\n'),
			});
		}
		await saveCodeBuilderSession(this.checkpointer, threadId, session);
	}

	private async *runMultiAgentSystem(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
		externalCallbacks: Callbacks | undefined,
		historicalMessages?: BaseMessage[],
	) {
		const { agent, threadConfig, streamConfig } = this.setupAgentAndConfigs(
			payload,
			userId,
			abortSignal,
			externalCallbacks,
		);

		try {
			const stream = await this.createAgentStream(payload, streamConfig, agent, historicalMessages);
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
		// Store feature flags from the first call; reuse for all subsequent calls
		// to prevent mid-session flag changes from causing inconsistency
		if (!this.sessionFeatureFlags && payload.featureFlags) {
			this.sessionFeatureFlags = payload.featureFlags;
		}
		const agent = this.createWorkflow(this.sessionFeatureFlags ?? payload.featureFlags);
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		// Generate thread ID from workflowId and userId
		// This ensures one session per workflow per user
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
		const threadConfig: RunnableConfig = {
			configurable: {
				thread_id: threadId,
				userId,
			},
		};

		const callbacks = externalCallbacks ?? (this.tracer ? [this.tracer] : undefined);

		const streamConfig = {
			...threadConfig,
			streamMode: ['updates', 'custom'] as const,
			recursionLimit: MAX_MULTI_AGENT_STREAM_ITERATIONS,
			signal: abortSignal,
			callbacks,
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
		historicalMessages?: BaseMessage[],
	): Promise<AsyncIterable<StreamEvent>> {
		const additionalKwargs: Record<string, unknown> = {};
		if (payload.versionId) additionalKwargs.versionId = payload.versionId;
		if (payload.id) additionalKwargs.messageId = payload.id;
		if (payload.resumeData !== undefined) additionalKwargs.resumeData = payload.resumeData;

		const humanMessage = new HumanMessage({
			id: payload.id,
			content: payload.message,
			additional_kwargs: additionalKwargs,
		});

		const workflowJSON = this.getDefaultWorkflowJSON(payload);
		const workflowContext = payload.workflowContext;
		const mode = payload.mode ?? 'build';

		// Include historical messages (from persistent storage) along with the new message.
		// The messagesStateReducer will properly merge these with any existing checkpoint state.
		const messages = [...(historicalMessages ?? []), humanMessage];

		const stream = payload.resumeData
			? await agent.stream(
					new Command({
						resume: payload.resumeData,
						update: {
							messages: [
								...(payload.resumeInterrupt
									? [
											new AIMessage({
												content: JSON.stringify(payload.resumeInterrupt),
												additional_kwargs: { messageType: payload.resumeInterrupt.type },
											}),
										]
									: []),
								humanMessage,
							],
							workflowJSON,
							workflowContext,
							...(payload.mode ? { mode: payload.mode } : {}),
						},
					}),
					streamConfig,
				)
			: await agent.stream(
					{
						messages,
						workflowJSON,
						workflowOperations: [],
						workflowContext,
						mode,
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

		if (this.isLlmQuotaOrRateLimitError(error)) {
			throw new OperationalError(sanitizeLlmErrorMessage(error), {
				cause: error instanceof Error ? error : undefined,
			});
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

	/**
	 * Checks if the error is a 429 rate-limit / quota-exceeded error from the LLM provider.
	 * These are transient provider-side issues that users cannot act on, so we wrap them
	 * in OperationalError (level: warning) to prevent them from reaching Sentry.
	 */
	private isLlmQuotaOrRateLimitError(error: unknown): boolean {
		return !!error && typeof error === 'object' && 'status' in error && error.status === 429;
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
