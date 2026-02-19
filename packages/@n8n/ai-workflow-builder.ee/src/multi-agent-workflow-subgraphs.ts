import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
	StateGraph,
	END,
	START,
	type MemorySaver,
	isGraphInterrupt,
	getWriter,
} from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	createResponderAgent,
	invokeResponderAgent,
	type ResponderAgentType,
} from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import type { AssistantHandler } from './assistant';
import {
	ASSISTANT_SDK_TIMEOUT_MS,
	DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS,
	MAX_BUILDER_ITERATIONS,
	MAX_DISCOVERY_ITERATIONS,
} from './constants';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import type { BaseSubgraph } from './subgraphs/subgraph-interface';
import type { ResourceLocatorCallback } from './types/callbacks';
import {
	type CoordinationLogEntry,
	type CoordinationMetadata,
	type SubgraphPhase,
	createAssistantMetadata,
	createErrorMetadata,
	createResponderMetadata,
} from './types/coordination';
import type { StreamChunk } from './types/streaming';
import {
	getLastCompletedPhase,
	getNextPhaseFromLog,
	hasBuilderPhaseInLog,
	hasErrorInLog,
} from './utils/coordination-log';
import { sanitizeLlmErrorMessage } from './utils/error-sanitizer';
import { processOperations } from './utils/operations-processor';
import {
	determineStateAction,
	handleClearErrorState,
	handleCleanupDangling,
	handleCompactMessages,
	handleCreateWorkflowName,
	handleDeleteMessages,
} from './utils/state-modifier';
import { extractUserRequest } from './utils/subgraph-helpers';
import type { BuilderFeatureFlags, StageLLMs } from './workflow-builder-agent';

/**
 * Type guard to check if a value is a coordination log entry-like object.
 * Validates the required fields without requiring the full CoordinationLogEntry type.
 */
function isCoordinationLogEntry(
	value: unknown,
): value is { phase: SubgraphPhase; status: string; timestamp: number; summary: string } {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.phase === 'string' &&
		typeof obj.status === 'string' &&
		typeof obj.timestamp === 'number' &&
		typeof obj.summary === 'string'
	);
}

/**
 * Maps routing decisions to graph node names.
 * Used by both supervisor (LLM-based) and route_next_phase (deterministic) routing.
 */
function routeToNode(next: string): string {
	const nodeMapping: Record<string, string> = {
		responder: 'responder',
		discovery: 'discovery_subgraph',
		builder: 'builder_subgraph',
		assistant: 'assistant_subgraph',
	};
	return nodeMapping[next] ?? 'responder';
}

export interface MultiAgentSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	/** Per-stage LLM configuration */
	stageLLMs: StageLLMs;
	logger?: Logger;
	instanceUrl?: string;
	checkpointer?: MemorySaver;
	/** Token threshold for auto-compaction. Defaults to DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS */
	autoCompactThresholdTokens?: number;
	featureFlags?: BuilderFeatureFlags;
	/** Callback invoked when a successful generation completes (e.g., for credit deduction) */
	onGenerationSuccess?: () => Promise<void>;
	/** Callback for fetching resource locator options */
	resourceLocatorCallback?: ResourceLocatorCallback;
	/** Assistant handler for routing help/debug queries via the SDK */
	assistantHandler?: AssistantHandler;
}

type ParentState = typeof ParentGraphState.State;

/**
 * Result returned by a subgraph node's execute function.
 * The handler wraps this with timing and error coordination log entries.
 */
interface SubgraphNodeResult {
	output: Partial<ParentState>;
	coordinationLog: unknown[];
}

/**
 * Creates a subgraph node handler with standardized error handling and coordination logging.
 * Accepts an execute function that performs the actual work; the handler adds timing,
 * in_progress/completed/error coordination log entries, and error recovery.
 */
function createSubgraphNodeHandler(
	phase: SubgraphPhase,
	execute: (state: ParentState, config?: RunnableConfig) => Promise<SubgraphNodeResult>,
	logger?: Logger,
) {
	return async (state: ParentState, config?: RunnableConfig) => {
		const startTimestamp = Date.now();

		logger?.debug(`[${phase}_subgraph] Starting ${phase}`);

		try {
			const { output, coordinationLog } = await execute(state, config);

			const validLog = coordinationLog.filter(isCoordinationLogEntry);

			return {
				...output,
				coordinationLog: [
					{
						phase,
						status: 'in_progress' as const,
						timestamp: startTimestamp,
						summary: `Starting ${phase}`,
						metadata: { phase } as CoordinationMetadata,
					},
					...validLog,
				],
			};
		} catch (error) {
			if (isGraphInterrupt(error)) {
				throw error;
			}
			logger?.error(`[${phase}_subgraph] ERROR:`, { error });
			const rawErrorMessage =
				error instanceof Error
					? error.message
					: `An error occurred in ${phase}_subgraph: ${String(error)}`;
			const userFacingMessage = sanitizeLlmErrorMessage(error);

			return {
				nextPhase: 'responder',
				messages: [
					new HumanMessage({
						content: `Error in ${phase}_subgraph: ${userFacingMessage}`,
						name: 'system_error',
					}),
				],
				coordinationLog: [
					{
						phase,
						status: 'in_progress' as const,
						timestamp: startTimestamp,
						summary: `Starting ${phase}`,
						metadata: { phase } as CoordinationMetadata,
					},
					{
						phase,
						status: 'error' as const,
						timestamp: Date.now(),
						summary: `Error: ${userFacingMessage}`,
						metadata: createErrorMetadata({
							failedSubgraph: phase,
							errorMessage: rawErrorMessage,
						}),
					},
				],
			};
		}
	};
}

/**
 * Creates an execute function for compiled LangGraph subgraphs (discovery, builder).
 */
function createCompiledSubgraphExecutor<
	TSubgraph extends BaseSubgraph<unknown, Record<string, unknown>, Record<string, unknown>>,
>(
	subgraph: TSubgraph,
	compiledGraph: ReturnType<TSubgraph['create']>,
	recursionLimit?: number,
): (state: ParentState, config?: RunnableConfig) => Promise<SubgraphNodeResult> {
	return async (state, config) => {
		const input = subgraph.transformInput(state);
		const invokeConfig: RunnableConfig = { ...config, recursionLimit };
		const result = await compiledGraph.invoke(input, invokeConfig);
		const output = subgraph.transformOutput(result, state);

		const outputLogRaw = Array.isArray(output.coordinationLog) ? output.coordinationLog : [];
		return { output, coordinationLog: outputLogRaw };
	};
}

/**
 * Create Multi-Agent Workflow using Subgraph Pattern
 *
 * Each specialist agent runs in its own isolated subgraph.
 * Parent graph orchestrates between subgraphs with minimal shared state.
 */
export function createMultiAgentWorkflowWithSubgraphs(config: MultiAgentSubgraphConfig) {
	const {
		parsedNodeTypes,
		stageLLMs,
		logger,
		instanceUrl,
		checkpointer,
		autoCompactThresholdTokens = DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS,
		featureFlags,
		onGenerationSuccess,
		resourceLocatorCallback,
		assistantHandler,
	} = config;

	const mergeAskBuild =
		(featureFlags?.mergeAskBuild === true || process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD === 'true') &&
		!!assistantHandler;
	const supervisorAgent = new SupervisorAgent({
		llm: stageLLMs.supervisor,
		mergeAskBuild,
	});

	// Create Responder agent using LangChain v1 createAgent API
	const responderAgent: ResponderAgentType = createResponderAgent({
		llm: stageLLMs.responder,
		enableIntrospection: featureFlags?.enableIntrospection,
		logger,
	});

	// Create Discovery subgraph (discovery + planning)
	const discoverySubgraph = new DiscoverySubgraph();
	const compiledDiscovery = discoverySubgraph.create({
		parsedNodeTypes,
		llm: stageLLMs.discovery,
		plannerLLM: stageLLMs.planner,
		logger,
		featureFlags,
	});

	// Create Builder subgraph (still uses StateGraph pattern)
	const builderSubgraph = new BuilderSubgraph();
	const compiledBuilder = builderSubgraph.create({
		parsedNodeTypes,
		llm: stageLLMs.builder,
		llmParameterUpdater: stageLLMs.parameterUpdater,
		logger,
		instanceUrl,
		featureFlags,
		resourceLocatorCallback,
	});

	// Build graph using method chaining for proper TypeScript inference
	return (
		new StateGraph(ParentGraphState)
			// Add Supervisor Node (only used for initial routing)
			// Accepts config as second param to propagate callbacks for tracing
			.addNode('supervisor', async (state, config) => {
				const routing = await supervisorAgent.invoke(
					{
						messages: state.messages,
						workflowJSON: state.workflowJSON,
						coordinationLog: state.coordinationLog,
						previousSummary: state.previousSummary,
						workflowContext: state.workflowContext,
					},
					config,
				);

				logger?.debug(`[supervisor] Routing to: ${routing.next}`, {
					reasoning: routing.reasoning,
				});

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node (synthesizes final user-facing response)
			// Uses LangChain v1 createAgent API with context injection middleware
			.addNode('responder', async (state, config) => {
				// Record start time for timing metrics
				const startTimestamp = Date.now();

				// Only forward assistant response if assistant was the most recently
				// completed phase (i.e., it ran in the current turn). Stale entries from
				// previous turns must be ignored to avoid replaying old responses.
				const lastCompletedPhase = getLastCompletedPhase(state.coordinationLog);
				const assistantEntry =
					lastCompletedPhase === 'assistant'
						? state.coordinationLog.findLast(
								(e: CoordinationLogEntry) => e.phase === 'assistant' && e.status === 'completed',
							)
						: undefined;
				// Only short-circuit when the assistant actually produced text
				// (streamed to the frontend via custom events). If the SDK returned
				// empty text, fall through to the normal responder so it can generate
				// a meaningful reply instead of silently emitting nothing.
				if (assistantEntry?.output) {
					logger?.debug('[responder] Forwarding assistant response (no credits consumed)', {
						outputLength: assistantEntry.output.length,
						outputPreview: assistantEntry.output.substring(0, 100),
					});
					return {
						coordinationLog: [
							{
								phase: 'responder' as const,
								status: 'completed' as const,
								timestamp: Date.now(),
								summary: 'Assistant response forwarded (no credits consumed)',
								metadata: createResponderMetadata({ responseLength: 0 }),
							},
						],
					};
				}

				const { response, introspectionEvents } = await invokeResponderAgent(
					responderAgent,
					{
						messages: state.messages,
						coordinationLog: state.coordinationLog,
						discoveryContext: state.discoveryContext,
						workflowJSON: state.workflowJSON,
						workflowContext: state.workflowContext,
						previousSummary: state.previousSummary,
					},
					config,
					{ enableIntrospection: featureFlags?.enableIntrospection },
				);

				if (
					onGenerationSuccess &&
					!hasErrorInLog(state.coordinationLog) &&
					hasBuilderPhaseInLog(state.coordinationLog)
				) {
					void Promise.resolve(onGenerationSuccess()).catch((error) => {
						logger?.warn('Failed to execute onGenerationSuccess callback', { error });
					});
				}

				// Calculate response length for metadata
				const responseContent =
					typeof response.content === 'string'
						? response.content
						: JSON.stringify(response.content);

				return {
					messages: [response], // Only responder adds to user messages
					coordinationLog: [
						{
							phase: 'responder' as const,
							status: 'in_progress' as const,
							timestamp: startTimestamp,
							summary: 'Starting responder',
							metadata: createResponderMetadata({ responseLength: 0 }),
						},
						{
							phase: 'responder' as const,
							status: 'completed' as const,
							timestamp: Date.now(),
							summary: `Generated response (${responseContent.length} chars)`,
							metadata: createResponderMetadata({ responseLength: responseContent.length }),
						},
					],
					introspectionEvents, // Collected from responder's tool calls
				};
			})
			// Add process_operations node for hybrid operations approach
			.addNode('process_operations', (state) => {
				// Process accumulated operations and clear the queue
				const result = processOperations(state);

				return {
					...result,
					workflowOperations: [], // Clear operations after processing
				};
			})
			.addNode('route_next_phase', (state) => {
				const next = getNextPhaseFromLog(state.coordinationLog);

				if (state.planDecision === 'reject') {
					return {
						nextPhase: 'responder',
						planDecision: null,
						planOutput: null,
						planFeedback: null,
						planPrevious: null,
					};
				}

				if (state.planDecision === 'modify') {
					return { nextPhase: 'discovery', planDecision: null, planOutput: null };
				}

				if (
					next === 'builder' &&
					featureFlags?.planMode === true &&
					state.mode === 'plan' &&
					!state.planOutput
				) {
					return { nextPhase: 'discovery', planDecision: null };
				}

				return { nextPhase: next, planDecision: null };
			})
			// State modification nodes (preprocessing)
			.addNode('check_state', (state) => ({
				nextPhase: determineStateAction(state, autoCompactThresholdTokens),
			}))
			.addNode('cleanup_dangling', (state) => handleCleanupDangling(state.messages, logger))
			.addNode('compact_messages', async (state, config) => {
				const isAutoCompact = state.messages[state.messages.length - 1]?.content !== '/compact';
				return await handleCompactMessages(
					state.messages,
					state.previousSummary ?? '',
					stageLLMs.responder,
					isAutoCompact,
					config,
				);
			})
			.addNode('delete_messages', (state) => handleDeleteMessages(state.messages))
			.addNode('clear_error_state', (state) => handleClearErrorState(state.coordinationLog, logger))
			.addNode(
				'create_workflow_name',
				async (state, config) =>
					await handleCreateWorkflowName(
						state.messages,
						state.workflowJSON,
						stageLLMs.responder,
						logger,
						config,
					),
			)
			// Add Discovery Subgraph Node (discovery + planning)
			.addNode(
				'discovery_subgraph',
				createSubgraphNodeHandler(
					'discovery',
					createCompiledSubgraphExecutor(
						discoverySubgraph,
						compiledDiscovery,
						MAX_DISCOVERY_ITERATIONS,
					),
					logger,
				),
			)
			// Add Builder Subgraph Node (still uses StateGraph pattern)
			.addNode(
				'builder_subgraph',
				createSubgraphNodeHandler(
					'builder',
					createCompiledSubgraphExecutor(builderSubgraph, compiledBuilder, MAX_BUILDER_ITERATIONS),
					logger,
				),
			)
			// Add Assistant Subgraph Node (routes to SDK for help/debug queries)
			.addNode(
				'assistant_subgraph',
				createSubgraphNodeHandler(
					'assistant',
					async (state, nodeConfig) => {
						if (!assistantHandler) {
							throw new Error('Assistant handler not configured');
						}

						const query = extractUserRequest(state.messages);
						const userId = (nodeConfig?.configurable?.userId as string) ?? 'unknown';

						const streamWriter = getWriter(nodeConfig);

						let chunksDispatched = 0;
						const writer = (chunk: StreamChunk) => {
							if (streamWriter) {
								chunksDispatched++;
								streamWriter(chunk);
							}
						};

						const abortController = new AbortController();
						const timeoutId = setTimeout(() => abortController.abort(), ASSISTANT_SDK_TIMEOUT_MS);

						let result;
						try {
							result = await assistantHandler.execute(
								{
									query,
									workflowJSON: state.workflowJSON,
									sdkSessionId: state.sdkSessionId,
								},
								userId,
								writer,
								abortController.signal,
							);
						} finally {
							clearTimeout(timeoutId);
						}

						logger?.debug('[assistant_subgraph] Handler completed', {
							responseTextLength: result.responseText.length,
							sdkSessionId: result.sdkSessionId,
							hasCodeDiff: result.hasCodeDiff,
							suggestionCount: result.suggestionIds.length,
							chunksDispatched,
						});

						return {
							output: {
								messages: [new AIMessage({ content: result.responseText })],
								sdkSessionId: result.sdkSessionId,
							},
							coordinationLog: [
								{
									phase: 'assistant' as const,
									status: 'completed' as const,
									timestamp: Date.now(),
									summary: result.summary,
									output: result.responseText,
									metadata: createAssistantMetadata({
										hasCodeDiff: result.hasCodeDiff,
										suggestionCount: result.suggestionIds.length,
									}),
								},
							],
						};
					},
					logger,
				),
			)
			.addEdge('discovery_subgraph', 'process_operations')
			.addEdge('builder_subgraph', 'process_operations')
			.addEdge('process_operations', 'route_next_phase')
			.addEdge('assistant_subgraph', 'route_next_phase')
			// Start flows to check_state (preprocessing)
			.addEdge(START, 'check_state')
			// Conditional routing from check_state
			.addConditionalEdges('check_state', (state) => {
				const routes: Record<string, string> = {
					cleanup_dangling: 'cleanup_dangling',
					compact_messages: 'compact_messages',
					delete_messages: 'delete_messages',
					create_workflow_name: 'create_workflow_name',
					auto_compact_messages: 'compact_messages', // Reuse same node
					clear_error_state: 'clear_error_state',
					continue: 'supervisor',
				};

				// In plan mode, skip the supervisor and go directly to discovery
				// (which contains the planner) when no plan has been generated yet
				if (
					state.nextPhase === 'continue' &&
					featureFlags?.planMode === true &&
					state.mode === 'plan' &&
					!state.planOutput &&
					!mergeAskBuild
				) {
					return 'discovery_subgraph';
				}

				return routes[state.nextPhase] ?? 'supervisor';
			})
			// Route after state modification nodes
			.addEdge('cleanup_dangling', 'check_state') // Re-check after cleanup
			.addEdge('delete_messages', 'responder') // Clear → responder for acknowledgment
			.addEdge('clear_error_state', 'check_state') // Re-check after clearing errors (AI-1812)
			.addEdge('create_workflow_name', 'supervisor') // Continue after naming
			// Compact has conditional routing: auto → continue, manual → responder
			.addConditionalEdges('compact_messages', (state) => {
				// Auto-compact preserves the last user message, manual /compact clears all
				// If messages remain after compaction, it's auto-compact → continue processing
				const hasMessages = state.messages.length > 0;
				return hasMessages ? 'check_state' : 'responder';
			})
			// Conditional Edge for Supervisor (initial routing via LLM)
			.addConditionalEdges('supervisor', (state) => routeToNode(state.nextPhase))
			// Deterministic routing after subgraphs complete (based on coordination log)
			.addConditionalEdges('route_next_phase', (state) => routeToNode(state.nextPhase))
			// Responder ends the workflow
			.addEdge('responder', END)
			// Compile the graph
			.compile({ checkpointer })
	);
}
