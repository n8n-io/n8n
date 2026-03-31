import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Command, type MemorySaver } from '@langchain/langgraph';
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
import { DiscoveryGraph } from './discovery/discovery.graph';
import { ValidationError } from './errors';
import { SessionManagerService } from './session-manager.service';
import type { HITLInterruptValue, PlannerQuestion, PlanOutput } from './types/planning';
import type { StreamOutput } from './types/streaming';
import { buildSelectedNodesContextBlock } from './utils/context-builders';

/**
 * Extract a plan interrupt value from a LangGraph updates stream chunk.
 */
function extractPlanInterrupt(chunk: Record<string, unknown>): PlanOutput | null {
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

/**
 * Extract a questions interrupt value from a LangGraph updates stream chunk.
 */
function extractQuestionsInterrupt(
	chunk: Record<string, unknown>,
): { introMessage?: string; questions: PlannerQuestion[] } | null {
	const interrupts = chunk.__interrupt__ as
		| Array<{ value?: { type?: string; introMessage?: string; questions?: PlannerQuestion[] } }>
		| undefined;
	if (!Array.isArray(interrupts) || interrupts.length === 0) return null;

	const first = interrupts[0];
	if (first?.value?.type === 'questions' && Array.isArray(first.value.questions)) {
		return {
			introMessage: first.value.introMessage,
			questions: first.value.questions,
		};
	}
	return null;
}

/**
 * Extract a web_fetch_approval interrupt value from a LangGraph updates stream chunk.
 */
function extractWebFetchApprovalInterrupt(
	chunk: Record<string, unknown>,
): { requestId: string; url: string; domain: string } | null {
	const interrupts = chunk.__interrupt__ as
		| Array<{ value?: { type?: string; requestId?: string; url?: string; domain?: string } }>
		| undefined;
	if (!Array.isArray(interrupts) || interrupts.length === 0) return null;

	const first = interrupts[0];
	if (
		first?.value?.type === 'web_fetch_approval' &&
		typeof first.value.requestId === 'string' &&
		typeof first.value.url === 'string' &&
		typeof first.value.domain === 'string'
	) {
		return {
			requestId: first.value.requestId,
			url: first.value.url,
			domain: first.value.domain,
		};
	}
	return null;
}

/**
 * Per-stage LLM configuration for the workflow builder.
 * All stages must be configured with an LLM instance.
 */
export interface StageLLMs {
	builder: BaseChatModel;
	parameterUpdater: BaseChatModel;
	planner: BaseChatModel;
	discovery: BaseChatModel;
}

export interface WorkflowBuilderAgentConfig {
	parsedNodeTypes: INodeTypeDescription[];
	/** Per-stage LLM configuration */
	stageLLMs: StageLLMs;
	logger?: Logger;
	checkpointer: MemorySaver;
	tracer?: LangChainTracer;
	/** Metadata to include in LangSmith traces */
	runMetadata?: Record<string, unknown>;
	/** Callback when generation completes successfully (not aborted) */
	onGenerationSuccess?: () => Promise<void>;
	/**
	 * Ordered list of directories to search for built-in node definitions.
	 */
	nodeDefinitionDirs?: string[];
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
		// Check if this is a discovery graph resume (questions or web_fetch_approval)
		const isDiscoveryResume =
			payload.resumeData &&
			(payload.resumeInterrupt?.type === 'questions' ||
				payload.resumeInterrupt?.type === 'web_fetch_approval');
		if (isDiscoveryResume) {
			this.logger?.debug('Resuming discovery graph from interrupt', {
				userId,
				type: payload.resumeInterrupt?.type,
			});
			yield* this.runPlanMode(payload, userId, abortSignal);
			return;
		}

		// Check if this is a plan decision resume (approval/modify/reject)
		if (payload.resumeData && payload.resumeInterrupt?.type === 'plan') {
			yield* this.handlePlanResume(payload, userId, abortSignal);
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

	private async *handlePlanResume(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	): AsyncGenerator<StreamOutput> {
		const decision = parsePlanDecision(payload.resumeData);

		if (decision.action === 'approve') {
			this.logger?.debug('Plan approved, routing to CodeWorkflowBuilder with plan', { userId });
			const planInterrupt =
				payload.resumeInterrupt?.type === 'plan' ? payload.resumeInterrupt : undefined;
			const codePayload: ChatPayload = {
				...payload,
				planOutput: planInterrupt?.plan,
				resumeData: undefined,
				resumeInterrupt: undefined,
			};
			yield* this.runCodeWorkflowBuilder(codePayload, userId, abortSignal);
			return;
		}

		this.logger?.debug('Plan modify/reject, resuming planner graph', {
			userId,
			action: decision.action,
		});
		yield* this.runPlanMode(payload, userId, abortSignal);
	}

	/**
	 * Run the discovery graph for plan mode.
	 *
	 * The discovery graph handles node discovery, optional questions via interrupt,
	 * and plan generation/approval via interrupt. This replaces the old minimal
	 * planner-only StateGraph wrapper.
	 */
	private async *runPlanMode(
		payload: ChatPayload,
		userId: string | undefined,
		abortSignal: AbortSignal | undefined,
	): AsyncGenerator<StreamOutput> {
		const isResume = !!payload.resumeData;

		// Handle reject early — no graph invocation needed
		if (isResume && payload.resumeInterrupt?.type === 'plan') {
			const decision = parsePlanDecision(payload.resumeData);
			if (decision.action === 'reject') {
				this.logger?.debug('Plan rejected by user', { userId });
				return;
			}
		}

		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const baseThreadId = `discovery-${SessionManagerService.generateThreadId(workflowId, userId)}`;
		// Use stable thread for resume (must match the original), unique for new requests
		const threadId = isResume ? baseThreadId : `${baseThreadId}-${Date.now()}`;

		const graph = this.compileDiscoveryGraph();
		const streamConfig = this.buildDiscoveryStreamConfig(threadId, abortSignal);

		this.logger?.debug(isResume ? 'Resuming discovery graph' : 'Starting discovery graph', {
			userId,
		});

		const stream = isResume
			? await graph.stream(new Command({ resume: payload.resumeData }), streamConfig)
			: await graph.stream(this.buildDiscoveryInput(payload), streamConfig);

		for await (const chunk of stream) {
			yield* this.processDiscoveryChunk(chunk as Record<string, unknown>);
		}
	}

	private buildDiscoveryStreamConfig(threadId: string, abortSignal: AbortSignal | undefined) {
		return {
			configurable: { thread_id: threadId },
			signal: abortSignal,
			streamMode: 'updates' as const,
			callbacks: this.tracer ? [this.tracer] : undefined,
			metadata: this.runMetadata,
		};
	}

	private buildDiscoveryInput(payload: ChatPayload) {
		const currentWorkflow = payload.workflowContext?.currentWorkflow;
		return {
			userRequest: payload.message,
			workflowJSON: {
				nodes: currentWorkflow?.nodes ?? [],
				connections: currentWorkflow?.connections ?? {},
				name: currentWorkflow?.name ?? '',
			},
			mode: 'plan' as const,
			selectedNodesContext: buildSelectedNodesContextBlock(payload.workflowContext) || '',
		};
	}

	/** Map tool names to display titles for the frontend */
	private static readonly DISCOVERY_TOOL_TITLES: Record<string, string> = {
		search_nodes: 'Searching nodes',
		web_fetch: 'Fetching web content',
		get_documentation: 'Getting documentation',
		get_workflow_examples: 'Getting workflow examples',
		submit_questions: 'Asking questions',
		submit_discovery_results: 'Processing results',
	};

	/**
	 * Process a single chunk from the discovery graph stream,
	 * yielding tool progress, questions, or plan interrupts as StreamOutput.
	 */
	private *processDiscoveryChunk(chunk: Record<string, unknown>): Generator<StreamOutput> {
		// Check for interrupts first
		const questions = extractQuestionsInterrupt(chunk);
		if (questions) {
			yield {
				messages: [{ role: 'assistant' as const, type: 'questions' as const, ...questions }],
			};
			return;
		}

		const webFetch = extractWebFetchApprovalInterrupt(chunk);
		if (webFetch) {
			yield {
				messages: [
					{ role: 'assistant' as const, type: 'web_fetch_approval' as const, ...webFetch },
				],
			};
			return;
		}

		const plan = extractPlanInterrupt(chunk);
		if (plan) {
			yield {
				messages: [{ role: 'assistant' as const, type: 'plan' as const, plan }],
			};
			return;
		}

		// Extract tool progress from node updates
		yield* this.extractToolProgress(chunk);
	}

	/**
	 * Extract tool call progress from discovery graph stream updates.
	 * Emits 'running' when agent makes tool calls, 'completed' when tools finish.
	 */
	private *extractToolProgress(chunk: Record<string, unknown>): Generator<StreamOutput> {
		// Agent node produced tool calls → emit 'running' for each
		const agentUpdate = chunk.discovery_agent as
			| { messages?: Array<{ tool_calls?: Array<{ name: string; id?: string }> }> }
			| undefined;
		if (agentUpdate?.messages) {
			for (const msg of agentUpdate.messages) {
				if (msg.tool_calls) {
					for (const tc of msg.tool_calls) {
						const displayTitle = WorkflowBuilderAgent.DISCOVERY_TOOL_TITLES[tc.name] ?? tc.name;
						yield {
							messages: [
								{
									type: 'tool' as const,
									toolName: tc.name,
									toolCallId: tc.id,
									displayTitle,
									status: 'running',
								},
							],
						};
					}
				}
			}
		}

		// Tools node finished → emit 'completed' for each tool message
		const toolsUpdate = chunk.tools as
			| { messages?: Array<{ tool_call_id?: string; name?: string }> }
			| undefined;
		if (toolsUpdate?.messages) {
			for (const msg of toolsUpdate.messages) {
				if (msg.tool_call_id) {
					yield {
						messages: [
							{
								type: 'tool' as const,
								toolName: msg.name ?? 'unknown',
								toolCallId: msg.tool_call_id,
								status: 'completed',
							},
						],
					};
				}
			}
		}
	}

	/**
	 * Compile the discovery subgraph with node search, questions, and planner.
	 */
	private compileDiscoveryGraph() {
		const discoveryGraph = new DiscoveryGraph();
		return discoveryGraph.create({
			parsedNodeTypes: this.parsedNodeTypes,
			llm: this.stageLLMs.discovery,
			plannerLLM: this.stageLLMs.planner,
			logger: this.logger,
			featureFlags: { planMode: true },
			checkpointer: this.checkpointer,
		});
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
