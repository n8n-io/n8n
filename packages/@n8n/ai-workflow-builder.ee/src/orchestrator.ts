import { HumanMessage } from '@langchain/core/messages';
import { StateGraph, END, START } from '@langchain/langgraph';
import type { ISubgraph } from './subgraphs/subgraph-interface';
import { ParentGraphState } from './parent-graph-state';
import { SupervisorAgent } from './agents/supervisor.agent';
import { ResponderAgent } from './agents/responder.agent';
import { trimWorkflowJSON } from './utils/trim-workflow-context';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface OrchestratorConfig {
	llm: BaseChatModel;
}

export class Orchestrator {
	private subgraphs: Map<string, ISubgraph> = new Map();
	private llm: BaseChatModel;

	constructor(config: OrchestratorConfig) {
		this.llm = config.llm;
	}

	registerSubgraph(subgraph: ISubgraph) {
		this.subgraphs.set(subgraph.name, subgraph);
	}

	build(config: any) {
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

		// Add Subgraph Nodes
		for (const [name, subgraph] of this.subgraphs) {
			const compiledSubgraph = subgraph.create(config);

			workflow.addNode(name, async (state) => {
				console.log(`[${name}] Starting`);

				const input = (subgraph as any).transformInput
					? (subgraph as any).transformInput(state)
					: state;
				const result = await compiledSubgraph.invoke(input);
				const output = (subgraph as any).transformOutput
					? (subgraph as any).transformOutput(result, state)
					: result;

				return output;
			});

			// @ts-ignore
			workflow.addEdge(name, 'supervisor');
		}

		// @ts-ignore
		workflow.addEdge(START, 'supervisor');

		// Conditional Edge for Supervisor
		workflow.addConditionalEdges('supervisor' as any, (state) => {
			const next = state.nextPhase;
			console.log('[Router] Routing to', next);

			if (next === 'responder') return 'responder';
			if (next === 'FINISH') return END;

			// Check if next matches a registered subgraph
			if (this.subgraphs.has(next)) {
				return next;
			}

			// Fallback mapping (legacy support or fuzzy match)
			if (next === 'discovery' && this.subgraphs.has('discovery_subgraph'))
				return 'discovery_subgraph';
			if (next === 'builder' && this.subgraphs.has('builder_subgraph')) return 'builder_subgraph';
			if (next === 'configurator' && this.subgraphs.has('configurator_subgraph'))
				return 'configurator_subgraph';

			// Default
			return 'discovery_subgraph'; // Or handle error
		});

		workflow.addEdge('responder' as any, END);

		return workflow.compile();
	}
}
