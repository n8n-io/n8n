import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Annotation, type MemorySaver, StateGraph, START, END } from '@langchain/langgraph';
import type { SelectedNodeContext } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	INodeTypeDescription,
	IRunExecutionData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	NodeExecutionSchema,
} from 'n8n-workflow';

import { MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';

import { createPlannerAgent, invokePlannerNode, parsePlanDecision } from './agents/planner.agent';
import type { PlannerNodeInput, PlannerNodeResult } from './agents/planner.agent';
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
import { SessionManagerService } from './session-manager.service';
import type { ResourceLocatorCallback } from './types/callbacks';
import type { DiscoveryContext } from './types/discovery-types';
import type { HITLInterruptValue, PlanOutput } from './types/planning';
import type { PlanChunk, StreamOutput } from './types/streaming';
import { buildSelectedNodesContextBlock } from './utils/context-builders';

/**
 * Per-stage LLM configuration for the workflow builder.
 * All stages must be configured with an LLM instance.
 */
export interface StageLLMs {
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
	/** Enable pin data generation in code builder (default: true). */
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
	private runMetadata?: Record<string, unknown>;
	private onGenerationSuccess?: () => Promise<void>;
	private nodeDefinitionDirs?: string[];
	private onTelemetryEvent?: (event: string, properties: ITelemetryTrackProperties) => void;
	private assistantHandler?: AssistantHandler;

	constructor(config: WorkflowBuilderAgentConfig) {
		this.parsedNodeTypes = config.parsedNodeTypes;
		this.stageLLMs = config.stageLLMs;
		this.logger = config.logger;
		this.checkpointer = config.checkpointer;
		this.tracer = config.tracer;
		this.runMetadata = config.runMetadata;
		this.onGenerationSuccess = config.onGenerationSuccess;
		this.nodeDefinitionDirs = config.nodeDefinitionDirs;
		this.onTelemetryEvent = config.onTelemetryEvent;
		this.assistantHandler = config.assistantHandler;
	}

	async *chat(payload: ChatPayload, userId?: string, abortSignal?: AbortSignal) {
		this.validateMessageLength(payload.message);

		yield* this.routeCodeBuilder(payload, userId, abortSignal);
	}

	/**
	 * Route code-builder requests: handle resume flows, plan mode, and triage.
	 */
	private async *routeCodeBuilder(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	) {
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

			// Plan modify or reject: resume the planner graph
			this.logger?.debug('Plan modify/reject, resuming planner graph', {
				userId,
				action: decision.action,
			});
			yield* this.runPlanMode(payload, userId, abortSignal);
			return;
		}

		// Initial plan request: run planner agent via LangGraph wrapper
		const usePlanMode = payload.featureFlags?.planMode === true;
		if (usePlanMode && payload.mode === 'plan') {
			this.logger?.debug('Plan mode request, running planner agent', {
				userId,
			});
			yield* this.runPlanMode(payload, userId, abortSignal);
			return;
		}

		const isMergeAskBuildEnabled = payload.featureFlags?.mergeAskBuild === true;
		if (isMergeAskBuildEnabled && this.assistantHandler) {
			this.logger?.debug('Routing through triage agent', { userId });
			yield* this.runTriageAgent(payload, userId, abortSignal);
		} else {
			this.logger?.debug('Routing to code workflow builder', { userId });
			yield* this.runCodeWorkflowBuilder(payload, userId, abortSignal);
		}
	}

	/**
	 * Run the planner agent inside a minimal LangGraph StateGraph.
	 *
	 * The planner uses `interrupt()` from LangGraph to pause execution and yield
	 * a plan for user approval. This requires a compiled LangGraph graph context.
	 *
	 * Flow:
	 * - Initial request: invoke the graph, planner generates plan, hits interrupt()
	 * - Resume (modify): resume the graph with user feedback, planner re-plans
	 * - Resume (reject): the planner returns with planDecision='reject', we yield nothing
	 */
	private async *runPlanMode(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	): AsyncGenerator<StreamOutput> {
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const threadId = `planner-${SessionManagerService.generateThreadId(workflowId, userId)}`;

		// Build minimal discovery context (planner can generate plans from user request alone)
		const discoveryContext: DiscoveryContext = { nodesFound: [] };

		// Build the current workflow from payload context
		const currentWorkflow = payload.workflowContext?.currentWorkflow;
		const workflowJSON = {
			nodes: currentWorkflow?.nodes ?? [],
			connections: currentWorkflow?.connections ?? {},
			name: currentWorkflow?.name ?? '',
		};

		// Build selected nodes context string
		const selectedNodesContext =
			buildSelectedNodesContextBlock(payload.workflowContext) || undefined;

		// Check if this is a resume (modify/reject)
		const isResume = payload.resumeData && payload.resumeInterrupt?.type === 'plan';

		// Build the planner input for initial requests
		const plannerInput: PlannerNodeInput = {
			userRequest: payload.message,
			discoveryContext,
			workflowJSON,
			selectedNodesContext,
		};

		// For modify resumes, include previous plan and feedback
		if (isResume) {
			const decision = parsePlanDecision(payload.resumeData);
			if (decision.action === 'modify') {
				const planInterrupt = payload.resumeInterrupt;
				plannerInput.planPrevious = planInterrupt?.type === 'plan' ? planInterrupt.plan : null;
				plannerInput.planFeedback = decision.feedback ?? null;
			}
		}

		// Define minimal state for the planner graph
		const PlannerGraphState = Annotation.Root({
			plannerInput: Annotation<PlannerNodeInput>({
				reducer: (_x, y) => y,
				default: () => plannerInput,
			}),
			plannerResult: Annotation<PlannerNodeResult | null>({
				reducer: (_x, y) => y ?? null,
				default: () => null,
			}),
		});

		// Create graph with a single planner node
		const plannerLlm = this.stageLLMs.planner;
		const callbacks = this.tracer ? [this.tracer] : undefined;

		const graph = new StateGraph(PlannerGraphState)
			.addNode('planner', async (state) => {
				const agent = createPlannerAgent({ llm: plannerLlm });
				const result = await invokePlannerNode(agent, state.plannerInput, {
					callbacks,
					metadata: this.runMetadata,
				});
				return { plannerResult: result };
			})
			.addEdge(START, 'planner')
			.addEdge('planner', END)
			.compile({ checkpointer: this.checkpointer });

		const threadConfig = { configurable: { thread_id: threadId } };

		if (isResume) {
			const decision = parsePlanDecision(payload.resumeData);

			if (decision.action === 'reject') {
				// For reject, no need to resume the graph — just signal rejection
				this.logger?.debug('Plan rejected by user', { userId });
				return;
			}

			// Resume the graph for modify — the planner will see planPrevious + planFeedback
			// and re-invoke with feedback, then hit interrupt() again with the new plan
			this.logger?.debug('Resuming planner graph for modification', { userId });
			try {
				// We need to re-invoke the graph with updated input rather than resuming,
				// because modify means generating a new plan entirely
				const stream = await graph.stream(
					{
						plannerInput: plannerInput,
						plannerResult: null,
					},
					{
						...threadConfig,
						// Use a new thread for each modify to avoid checkpoint conflicts
						configurable: { thread_id: `${threadId}-${Date.now()}` },
						signal: abortSignal,
						streamMode: 'updates',
					},
				);

				yield* this.processPlannerStream(stream);
			} catch (error) {
				this.logger?.error('Planner graph error during modification', { error, userId });
				throw error;
			}
		} else {
			// Initial plan request — invoke the graph fresh
			this.logger?.debug('Invoking planner graph for initial plan', { userId });
			try {
				const stream = await graph.stream(
					{
						plannerInput: plannerInput,
						plannerResult: null,
					},
					{
						...threadConfig,
						signal: abortSignal,
						streamMode: 'updates',
					},
				);

				yield* this.processPlannerStream(stream);
			} catch (error) {
				this.logger?.error('Planner graph error', { error, userId });
				throw error;
			}
		}
	}

	/**
	 * Process the planner graph's update stream, extracting plan interrupt chunks.
	 */
	private async *processPlannerStream(
		stream: AsyncIterable<Record<string, unknown>>,
	): AsyncGenerator<StreamOutput> {
		for await (const chunk of stream) {
			// Check for interrupt payload (plan chunk)
			const interruptPayload = this.extractPlanInterrupt(chunk);
			if (interruptPayload) {
				const planChunk: PlanChunk = {
					role: 'assistant',
					type: 'plan',
					plan: interruptPayload,
				};
				yield { messages: [planChunk] };
			}
		}
	}

	/**
	 * Extract a plan interrupt value from a LangGraph updates stream chunk.
	 * The interrupt appears as `__interrupt__` in the chunk when the graph hits interrupt().
	 */
	private extractPlanInterrupt(chunk: Record<string, unknown>): PlanOutput | null {
		const interrupts = chunk.__interrupt__ as
			| Array<{ value?: { type?: string; plan?: PlanOutput } }>
			| undefined;
		if (!Array.isArray(interrupts) || interrupts.length === 0) return null;

		const first = interrupts[0];
		if (first?.value?.type === 'plan' && first.value.plan) {
			return first.value.plan;
		}
		return null;
	}

	private async *runCodeWorkflowBuilder(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	) {
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);

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
				workflowId,
				ls_thread_id: threadId,
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
}
