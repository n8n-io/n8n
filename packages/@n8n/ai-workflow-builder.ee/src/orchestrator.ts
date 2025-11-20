import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph';

import { ResponderAgent } from './agents/responder.agent';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ParentGraphState } from './parent-graph-state';
import type { BuilderSubgraph, BuilderSubgraphConfig } from './subgraphs/builder.subgraph';
import type {
	ConfiguratorSubgraph,
	ConfiguratorSubgraphConfig,
} from './subgraphs/configurator.subgraph';
import type { DiscoverySubgraph, DiscoverySubgraphConfig } from './subgraphs/discovery.subgraph';
import { processOperations } from './utils/operations-processor';
import { trimWorkflowJSON } from './utils/trim-workflow-context';

export interface OrchestratorConfig {
	llm: BaseChatModel;
}

type AnySubgraph = DiscoverySubgraph | BuilderSubgraph | ConfiguratorSubgraph;

export class Orchestrator {
	private subgraphs: Map<string, AnySubgraph> = new Map();
	private llm: BaseChatModel;

	constructor(config: OrchestratorConfig) {
		this.llm = config.llm;
	}

	registerSubgraph(subgraph: AnySubgraph) {
		this.subgraphs.set(subgraph.name, subgraph);
	}

	build(config: DiscoverySubgraphConfig & BuilderSubgraphConfig & ConfiguratorSubgraphConfig) {
		const supervisorAgent = new SupervisorAgent({ llm: this.llm });
		const responderAgent = new ResponderAgent({ llm: this.llm });

		const workflow = new StateGraph(ParentGraphState);

		// Add Supervisor Node
		workflow.addNode('supervisor', async (state) => {
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
		});

		// Add Responder Node
		workflow.addNode('responder', async (state) => {
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
		});

		// Add process_operations node for hybrid operations approach
		workflow.addNode('process_operations', (state: typeof ParentGraphState.State) => {
			console.log('[Process Operations] Processing', {
				operationCount: state.workflowOperations?.length ?? 0,
			});

			// Process accumulated operations and clear the queue
			const result = processOperations(state);

			return {
				...result,
				workflowOperations: [], // Clear operations after processing
			};
		});

		// Add Subgraph Nodes
		for (const [name, subgraph] of this.subgraphs) {
			const compiledSubgraph = subgraph.create(config);

			workflow.addNode(name, async (state: typeof ParentGraphState.State) => {
				console.log(`[${name}] Starting`);

				try {
					const input = subgraph.transformInput(state);
					const result = await compiledSubgraph.invoke(input);
					const output = subgraph.transformOutput(result, state);

					return output;
				} catch (error) {
					console.error(`[${name}] Error:`, error);

					// Abort workflow and return error to user
					const errorMessage =
						error instanceof Error
							? error.message
							: `An error occurred in ${name}: ${String(error)}`;

					return {
						nextPhase: 'FINISH',
						finalResponse: `Error: ${errorMessage}`,
						messages: [
							new HumanMessage({
								content: `Error in ${name}: ${errorMessage}`,
								name: 'system_error',
							}),
						],
					};
				}
			});
		}

		// Connect all subgraphs to process_operations
		for (const name of this.subgraphs.keys()) {
			workflow.addEdge(name, 'process_operations');
		}

		// After processing operations, go back to supervisor
		workflow.addEdge('process_operations', 'supervisor');

		workflow.addEdge(START, 'supervisor');

		// Conditional Edge for Supervisor
		workflow.addConditionalEdges('supervisor', (state: typeof ParentGraphState.State) => {
			const next = state.nextPhase;
			console.log('[Router] Routing to', next);

			if (next === 'responder') return 'responder';
			if (next === 'FINISH') return END;

			// Check if next matches a registered subgraph
			if (this.subgraphs.has(`${next}_subgraph`)) {
				return `${next}_subgraph`;
			}
			// Default
			return 'discovery_subgraph'; // Or handle error
		});

		workflow.addEdge('responder', END);

		return workflow.compile();
	}
}
