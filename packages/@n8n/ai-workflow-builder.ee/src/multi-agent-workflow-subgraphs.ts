import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';
import type { BaseSubgraph } from './subgraphs/subgraph-interface';
import { processOperations } from './utils/operations-processor';
import { trimWorkflowJSON } from './utils/trim-workflow-context';

export interface MultiAgentSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
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
			console.error(`[${name}] Error:`, error);
			const errorMessage =
				error instanceof Error ? error.message : `An error occurred in ${name}: ${String(error)}`;

			// Route to responder to report error (terminal)
			return {
				nextPhase: 'responder',
				finalResponse: `Error: ${errorMessage}`,
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
	const { parsedNodeTypes, llmComplexTask, logger, instanceUrl } = config;

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
			// Add Supervisor Node
			.addNode('supervisor', async (state) => {
				const trimmedWorkflow = trimWorkflowJSON(state.workflowJSON);
				const executionData = state.workflowContext?.executionData ?? {};
				const executionSchema = state.workflowContext?.executionSchema ?? [];

				const workflowContext = [
					'',
					'<current_workflow_json>',
					JSON.stringify(trimmedWorkflow, null, 2),
					'</current_workflow_json>',
					'<trimmed_workflow_json_note>',
					'Note: Large property values of the nodes in the workflow JSON above may be trimmed to fit within token limits.',
					'Use get_node_parameter tool to get full details when needed.',
					'</trimmed_workflow_json_note>',
					'',
					'<current_simplified_execution_data>',
					JSON.stringify(executionData, null, 2),
					'</current_simplified_execution_data>',
					'',
					'<current_execution_nodes_schemas>',
					JSON.stringify(executionSchema, null, 2),
					'</current_execution_nodes_schemas>',
				].join('\n');

				const supervisor = supervisorAgent.getAgent();
				const messagesWithContext = [
					...state.messages,
					new HumanMessage({ content: workflowContext }),
				];

				const routing = await supervisor.invoke({
					messages: messagesWithContext,
				});

				return {
					nextPhase: routing.next,
				};
			})
			// Add Responder Node
			.addNode('responder', async (state) => {
				const agent = responderAgent.getAgent();
				const response = await agent.invoke({
					messages: state.messages,
				});

				return {
					messages: [response],
					finalResponse:
						typeof response.content === 'string' ? response.content : '[Response received]',
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
			// After processing operations, go back to supervisor
			.addEdge('process_operations', 'supervisor')
			// Start flows to supervisor
			.addEdge(START, 'supervisor')
			// Conditional Edge for Supervisor
			.addConditionalEdges('supervisor', (state) => {
				const next = state.nextPhase;

				if (next === 'responder') return 'responder';

				// Static name mapping
				if (next === 'discovery') return 'discovery_subgraph';
				if (next === 'builder') return 'builder_subgraph';
				if (next === 'configurator') return 'configurator_subgraph';

				// Default fallback to responder (terminal)
				return 'responder';
			})
			// Responder ends the workflow
			.addEdge('responder', END)
			// Compile the graph
			.compile()
	);
}
