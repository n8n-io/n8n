import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START, type MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import type { BaseSubgraph } from './subgraphs/subgraph-interface';
import { buildWorkflowSummary } from './utils/context-builders';
import {
	getNextPhaseFromLog,
	getConfiguratorOutput,
	getBuilderOutput,
	summarizeCoordinationLog,
} from './utils/coordination-log';
import { processOperations } from './utils/operations-processor';

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
}

/**
 * Creates a subgraph node handler with standardized error handling
 */
function createSubgraphNodeHandler<
	TSubgraph extends BaseSubgraph<unknown, Record<string, unknown>, Record<string, unknown>>,
>(subgraph: TSubgraph, compiledGraph: ReturnType<TSubgraph['create']>, name: string) {
	return async (state: typeof ParentGraphState.State) => {
		try {
			const input = subgraph.transformInput(state);
			const result = await compiledGraph.invoke(input);
			const output = subgraph.transformOutput(result, state);

			return output;
		} catch (error) {
			console.error(`[${name}] ERROR:`, error);
			const errorMessage =
				error instanceof Error ? error.message : `An error occurred in ${name}: ${String(error)}`;

			// Route to responder to report error (terminal)
			return {
				nextPhase: 'responder',
				messages: [
					new HumanMessage({
						content: `Error in ${name}: ${errorMessage}`,
						name: 'system_error',
					}),
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
	const { parsedNodeTypes, llmComplexTask, logger, instanceUrl, checkpointer } = config;

	const supervisorAgent = new SupervisorAgent({ llm: llmComplexTask });
	const responderAgent = new ResponderAgent({ llm: llmComplexTask });

	// Create subgraph instances
	const discoverySubgraph = new DiscoverySubgraph();
	const builderSubgraph = new BuilderSubgraph();
	const configuratorSubgraph = new ConfiguratorSubgraph();

	// Compile subgraphs
	const compiledDiscovery = discoverySubgraph.create({ parsedNodeTypes, llm: llmComplexTask });
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
				// Supervisor only needs summary context for routing decisions
				const contextParts: string[] = [];

				// 1. Workflow summary (node count and names only)
				if (state.workflowJSON.nodes.length > 0) {
					contextParts.push('<workflow_summary>');
					contextParts.push(buildWorkflowSummary(state.workflowJSON));
					contextParts.push('</workflow_summary>');
				}

				// 2. Coordination log summary (what phases completed)
				if (state.coordinationLog.length > 0) {
					contextParts.push('<completed_phases>');
					contextParts.push(summarizeCoordinationLog(state.coordinationLog));
					contextParts.push('</completed_phases>');
				}

				const supervisor = supervisorAgent.getAgent();
				const contextMessage =
					contextParts.length > 0 ? new HumanMessage({ content: contextParts.join('\n\n') }) : null;

				const messagesToSend = contextMessage
					? [...state.messages, contextMessage]
					: state.messages;

				const routing = await supervisor.invoke({
					messages: messagesToSend,
				});

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node (synthesizes final user-facing response)
			.addNode('responder', async (state) => {
				const agent = responderAgent.getAgent();

				// Build context for responder from coordination log
				const contextParts: string[] = [];

				if (state.discoveryContext?.nodesFound.length) {
					contextParts.push(
						`**Discovery:** Found ${state.discoveryContext.nodesFound.length} relevant nodes`,
					);
				}

				const builderOutput = getBuilderOutput(state.coordinationLog);
				if (builderOutput) {
					contextParts.push(`**Builder:** ${builderOutput}`);
				} else if (state.workflowJSON.nodes.length) {
					contextParts.push(`**Workflow:** ${state.workflowJSON.nodes.length} nodes created`);
				}

				const configuratorOutput = getConfiguratorOutput(state.coordinationLog);
				if (configuratorOutput) {
					contextParts.push(`**Configuration:**\n${configuratorOutput}`);
				}

				const contextMessage =
					contextParts.length > 0
						? new HumanMessage({
								content: `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`,
							})
						: null;

				const messagesToSend = contextMessage
					? [...state.messages, contextMessage]
					: state.messages;

				const response = await agent.invoke({
					messages: messagesToSend,
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
				createSubgraphNodeHandler(discoverySubgraph, compiledDiscovery, 'discovery_subgraph'),
			)
			.addNode(
				'builder_subgraph',
				createSubgraphNodeHandler(builderSubgraph, compiledBuilder, 'builder_subgraph'),
			)
			.addNode(
				'configurator_subgraph',
				createSubgraphNodeHandler(
					configuratorSubgraph,
					compiledConfigurator,
					'configurator_subgraph',
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
