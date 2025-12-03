import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START, type MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import {
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
import { getNextPhaseFromLog } from './utils/coordination-log';
import { processOperations } from './utils/operations-processor';
import type { BuilderFeatureFlags } from './workflow-builder-agent';

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
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
	checkpointer?: MemorySaver;
	featureFlags?: BuilderFeatureFlags;
}

/**
 * Creates a subgraph node handler with standardized error handling
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
	return async (state: typeof ParentGraphState.State) => {
		try {
			const input = subgraph.transformInput(state);
			const result = await compiledGraph.invoke(input, { recursionLimit });
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
	const { parsedNodeTypes, llmComplexTask, logger, instanceUrl, checkpointer, featureFlags } =
		config;

	const supervisorAgent = new SupervisorAgent({ llm: llmComplexTask });
	const responderAgent = new ResponderAgent({ llm: llmComplexTask });

	// Create subgraph instances
	const discoverySubgraph = new DiscoverySubgraph();
	const builderSubgraph = new BuilderSubgraph();
	const configuratorSubgraph = new ConfiguratorSubgraph();

	// Compile subgraphs
	const compiledDiscovery = discoverySubgraph.create({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
		featureFlags,
	});
	const compiledBuilder = builderSubgraph.create({ parsedNodeTypes, llm: llmComplexTask, logger });
	const compiledConfigurator = configuratorSubgraph.create({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
		instanceUrl,
	});

	// Build graph using method chaining for proper TypeScript inference
	return (
		new StateGraph(ParentGraphState)
			// Add Supervisor Node (only used for initial routing)
			.addNode('supervisor', async (state) => {
				const routing = await supervisorAgent.invoke({
					messages: state.messages,
					workflowJSON: state.workflowJSON,
					coordinationLog: state.coordinationLog,
				});

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node (synthesizes final user-facing response)
			.addNode('responder', async (state) => {
				const response = await responderAgent.invoke({
					messages: state.messages,
					coordinationLog: state.coordinationLog,
					discoveryContext: state.discoveryContext,
					workflowJSON: state.workflowJSON,
				});

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
			// Start flows to supervisor (initial routing only)
			.addEdge(START, 'supervisor')
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
