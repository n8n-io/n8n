import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ParentGraphState } from './parent-graph-state';
import { BuilderSubgraph, type BuilderSubgraphConfig } from './subgraphs/builder.subgraph';
import {
	ConfiguratorSubgraph,
	type ConfiguratorSubgraphConfig,
} from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph, type DiscoverySubgraphConfig } from './subgraphs/discovery.subgraph';
import { processOperations } from './utils/operations-processor';
import { trimWorkflowJSON } from './utils/trim-workflow-context';

export interface OrchestratorConfig {
	llm: BaseChatModel;
}

export class Orchestrator {
	private llm: BaseChatModel;

	constructor(config: OrchestratorConfig) {
		this.llm = config.llm;
	}

	build(config: DiscoverySubgraphConfig & BuilderSubgraphConfig & ConfiguratorSubgraphConfig) {
		const supervisorAgent = new SupervisorAgent({ llm: this.llm });
		const responderAgent = new ResponderAgent({ llm: this.llm });

		// Create subgraph instances
		const discoverySubgraph = new DiscoverySubgraph();
		const builderSubgraph = new BuilderSubgraph();
		const configuratorSubgraph = new ConfiguratorSubgraph();

		// Compile subgraphs
		const compiledDiscovery = discoverySubgraph.create(config);
		const compiledBuilder = builderSubgraph.create(config);
		const compiledConfigurator = configuratorSubgraph.create(config);

		// Build graph using method chaining for proper TypeScript inference
		return (
			new StateGraph(ParentGraphState)
				// Add Supervisor Node
				.addNode('supervisor', async (state) => {
					console.log('[Supervisor] Routing', {
						messageCount: state.messages.length,
						nodeCount: state.workflowJSON.nodes.length,
					});

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

					console.log('[Supervisor] Decision', routing);

					return {
						nextPhase: routing.next,
						supervisorInstructions: routing.instructions ?? null,
					};
				})
				// Add Responder Node
				.addNode('responder', async (state) => {
					console.log('[Responder] Called');
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
					console.log('[Process Operations] Processing', {
						operationCount: state.workflowOperations?.length ?? 0,
					});

					// Process accumulated operations and clear the queue
					const result = processOperations(state);

					return {
						...result,
						workflowOperations: [], // Clear operations after processing
					};
				})
				// Add Discovery Subgraph Node
				.addNode('discovery_subgraph', async (state) => {
					console.log('[discovery_subgraph] Starting');

					try {
						const input = discoverySubgraph.transformInput(state);
						const result = await compiledDiscovery.invoke(input);
						const output = discoverySubgraph.transformOutput(result, state);

						return output;
					} catch (error) {
						console.error('[discovery_subgraph] Error:', error);

						const errorMessage =
							error instanceof Error
								? error.message
								: `An error occurred in discovery_subgraph: ${String(error)}`;

						return {
							nextPhase: 'FINISH',
							finalResponse: `Error: ${errorMessage}`,
							messages: [
								new HumanMessage({
									content: `Error in discovery_subgraph: ${errorMessage}`,
									name: 'system_error',
								}),
							],
						};
					}
				})
				// Add Builder Subgraph Node
				.addNode('builder_subgraph', async (state) => {
					console.log('[builder_subgraph] Starting');

					try {
						const input = builderSubgraph.transformInput(state);
						const result = await compiledBuilder.invoke(input);
						const output = builderSubgraph.transformOutput(result, state);

						return output;
					} catch (error) {
						console.error('[builder_subgraph] Error:', error);

						const errorMessage =
							error instanceof Error
								? error.message
								: `An error occurred in builder_subgraph: ${String(error)}`;

						return {
							nextPhase: 'FINISH',
							finalResponse: `Error: ${errorMessage}`,
							messages: [
								new HumanMessage({
									content: `Error in builder_subgraph: ${errorMessage}`,
									name: 'system_error',
								}),
							],
						};
					}
				})
				// Add Configurator Subgraph Node
				.addNode('configurator_subgraph', async (state) => {
					console.log('[configurator_subgraph] Starting');

					try {
						const input = configuratorSubgraph.transformInput(state);
						const result = await compiledConfigurator.invoke(input);
						const output = configuratorSubgraph.transformOutput(result, state);

						return output;
					} catch (error) {
						console.error('[configurator_subgraph] Error:', error);

						const errorMessage =
							error instanceof Error
								? error.message
								: `An error occurred in configurator_subgraph: ${String(error)}`;

						return {
							nextPhase: 'FINISH',
							finalResponse: `Error: ${errorMessage}`,
							messages: [
								new HumanMessage({
									content: `Error in configurator_subgraph: ${errorMessage}`,
									name: 'system_error',
								}),
							],
						};
					}
				})
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
					console.log('[Router] Routing to', next);

					if (next === 'responder') return 'responder';
					if (next === 'FINISH') return END;

					// Static name mapping
					if (next === 'discovery') return 'discovery_subgraph';
					if (next === 'builder') return 'builder_subgraph';
					if (next === 'configurator') return 'configurator_subgraph';

					// Default fallback
					return 'discovery_subgraph';
				})
				// Responder ends the workflow
				.addEdge('responder', END)
				// Compile the graph
				.compile()
		);
	}
}
