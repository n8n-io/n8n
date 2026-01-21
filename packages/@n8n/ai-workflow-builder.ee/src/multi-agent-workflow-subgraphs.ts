import { HumanMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, START, type MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import {
	DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS,
	MAX_BUILDER_ITERATIONS,
	MAX_CONFIGURATOR_ITERATIONS,
	MAX_DISCOVERY_ITERATIONS,
} from './constants';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import type { BaseSubgraph } from './subgraphs/subgraph-interface';
import type { SubgraphPhase } from './types/coordination';
import { createErrorMetadata } from './types/coordination';
import { getNextPhaseFromLog, hasErrorInLog } from './utils/coordination-log';
import { processOperations } from './utils/operations-processor';
import {
	determineStateAction,
	handleClearErrorState,
	handleCleanupDangling,
	handleCompactMessages,
	handleCreateWorkflowName,
	handleDeleteMessages,
} from './utils/state-modifier';
import type { BuilderFeatureFlags, StageLLMs } from './workflow-builder-agent';

/**
 * Maps routing decisions to graph node names.
 * Used by both supervisor (LLM-based) and process_operations (deterministic) routing.
 */
function routeToNode(next: string): string {
	const nodeMapping: Record<string, string> = {
		responder: 'responder',
		discovery: 'discovery_subgraph',
		builder: 'builder_subgraph',
		configurator: 'configurator_subgraph',
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
}

/**
 * Creates a subgraph node handler with standardized error handling.
 * Accepts RunnableConfig as second parameter to propagate callbacks for tracing.
 */
function createSubgraphNodeHandler<
	TSubgraph extends BaseSubgraph<unknown, Record<string, unknown>, Record<string, unknown>>,
>(
	subgraph: TSubgraph,
	compiledGraph: ReturnType<TSubgraph['create']>,
	name: string,
	logger?: Logger,
	recursionLimit?: number,
) {
	return async (state: typeof ParentGraphState.State, config?: RunnableConfig) => {
		try {
			const input = subgraph.transformInput(state);
			// Merge parent config (callbacks, metadata) with recursionLimit
			const invokeConfig: RunnableConfig = {
				...config,
				recursionLimit,
			};
			const result = await compiledGraph.invoke(input, invokeConfig);
			const output = subgraph.transformOutput(result, state);

			return output;
		} catch (error) {
			logger?.error(`[${name}] ERROR:`, { error });
			const errorMessage =
				error instanceof Error ? error.message : `An error occurred in ${name}: ${String(error)}`;

			// Extract phase from subgraph name (e.g., 'discovery_subgraph' → 'discovery')
			const phase = name.replace('_subgraph', '') as SubgraphPhase;

			// Route to responder to report error (terminal)
			// Add error entry to coordination log so getNextPhaseFromLog routes to responder
			return {
				nextPhase: 'responder',
				messages: [
					new HumanMessage({
						content: `Error in ${name}: ${errorMessage}`,
						name: 'system_error',
					}),
				],
				coordinationLog: [
					{
						phase,
						status: 'error' as const,
						timestamp: Date.now(),
						summary: `Error: ${errorMessage}`,
						metadata: createErrorMetadata({
							failedSubgraph: phase,
							errorMessage,
						}),
					},
				],
			};
		}
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
	} = config;

	const supervisorAgent = new SupervisorAgent({ llm: stageLLMs.supervisor });
	const responderAgent = new ResponderAgent({ llm: stageLLMs.responder });

	// Create subgraph instances
	const discoverySubgraph = new DiscoverySubgraph();
	const builderSubgraph = new BuilderSubgraph();
	const configuratorSubgraph = new ConfiguratorSubgraph();

	// Compile subgraphs with per-stage LLMs
	const compiledDiscovery = discoverySubgraph.create({
		parsedNodeTypes,
		llm: stageLLMs.discovery,
		logger,
		featureFlags,
	});
	const compiledBuilder = builderSubgraph.create({
		parsedNodeTypes,
		llm: stageLLMs.builder,
		logger,
		featureFlags,
	});
	const compiledConfigurator = configuratorSubgraph.create({
		parsedNodeTypes,
		llm: stageLLMs.configurator,
		llmParameterUpdater: stageLLMs.parameterUpdater,
		logger,
		instanceUrl,
		featureFlags,
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
					},
					config,
				);

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node (synthesizes final user-facing response)
			// Accepts config as second param to propagate callbacks for tracing
			.addNode('responder', async (state, config) => {
				const response = await responderAgent.invoke(
					{
						messages: state.messages,
						coordinationLog: state.coordinationLog,
						discoveryContext: state.discoveryContext,
						workflowJSON: state.workflowJSON,
						previousSummary: state.previousSummary,
					},
					config,
				);

				// Call success callback only when generation completed without errors
				if (onGenerationSuccess && !hasErrorInLog(state.coordinationLog)) {
					void Promise.resolve(onGenerationSuccess()).catch((error) => {
						logger?.warn('Failed to execute onGenerationSuccess callback', { error });
					});
				}

				return {
					messages: [response], // Only responder adds to user messages
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
			// Add Subgraph Nodes (using helper to reduce duplication)
			.addNode(
				'discovery_subgraph',
				createSubgraphNodeHandler(
					discoverySubgraph,
					compiledDiscovery,
					'discovery_subgraph',
					logger,
					MAX_DISCOVERY_ITERATIONS,
				),
			)
			.addNode(
				'builder_subgraph',
				createSubgraphNodeHandler(
					builderSubgraph,
					compiledBuilder,
					'builder_subgraph',
					logger,
					MAX_BUILDER_ITERATIONS,
				),
			)
			.addNode(
				'configurator_subgraph',
				createSubgraphNodeHandler(
					configuratorSubgraph,
					compiledConfigurator,
					'configurator_subgraph',
					logger,
					MAX_CONFIGURATOR_ITERATIONS,
				),
			)
			// Connect all subgraphs to process_operations
			.addEdge('discovery_subgraph', 'process_operations')
			.addEdge('builder_subgraph', 'process_operations')
			.addEdge('configurator_subgraph', 'process_operations')
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
			.addConditionalEdges('process_operations', (state) =>
				routeToNode(getNextPhaseFromLog(state.coordinationLog)),
			)
			// Responder ends the workflow
			.addEdge('responder', END)
			// Compile the graph
			.compile({ checkpointer })
	);
}
