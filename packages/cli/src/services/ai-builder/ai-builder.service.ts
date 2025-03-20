import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, START } from '@langchain/langgraph';
import { Service } from '@n8n/di';
import { ApplicationError, jsonParse, OperationalError } from 'n8n-workflow';
import type { IUser, INodeTypeDescription, INode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import {
	supervisorChain,
	plannerAgent,
	nodeSelectionAgent,
	nodesComposerChain,
	connectionComposerAgent,
} from './agents';
import type { SimpleWorkflow, MessageResponse } from './types';
import { WorkflowState } from './workflow-state';

@Service()
export class AiBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	constructor(private readonly nodeTypes: NodeTypes) {
		this.parsedNodeTypes = this.getNodeTypes();
	}

	private getNodeTypes(): INodeTypeDescription[] {
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());

		const nodeTypes = nodeTypesKeys
			.map((nodeName) => {
				return { ...this.nodeTypes.getByNameAndVersion(nodeName).description, name: nodeName };
			})
			.filter((nodeType) => nodeType.hidden !== true);

		return nodeTypes;
	}

	private isWorkflowEvent(eventName: string): boolean {
		return [
			'generated_steps',
			'generated_nodes',
			'composed_nodes',
			'composed_connections',
			'generated_workflow_json',
		].includes(eventName);
	}

	// Helper method to setup and return our full workflow agent graph.
	private getAgent() {
		const supervisorChainNode = async (
			state: typeof WorkflowState.State,
			config: RunnableConfig,
		): Promise<Partial<typeof WorkflowState.State>> => {
			const nextStep = await supervisorChain.invoke({
				user_workflow_prompt: state.prompt,
				workflow: state.workflowJSON,
				steps: state.steps.join(', '),
				nodes: state.nodes.join(', '),
			});

			return {
				next: nextStep.next,
			};
		};

		const plannerAgentNode = async (
			state: typeof WorkflowState.State,
			config: RunnableConfig,
		): Promise<Partial<typeof WorkflowState.State>> => {
			const result = await plannerAgent.invoke(
				{
					messages: [new HumanMessage({ content: state.prompt })],
				},
				config,
			);
			const lastMessage = result.messages
				.reverse()
				.find((message) => message instanceof ToolMessage);
			if (!lastMessage) {
				throw new ApplicationError('No ToolMessage found in planner agent');
			}
			const parsedSteps = jsonParse<{ steps: string[] }>(lastMessage.content as string);

			await dispatchCustomEvent('generated_steps', {
				role: 'assistant',
				type: 'workflow-step',
				steps: parsedSteps.steps,
				id: Date.now().toString(),
				read: false,
			});

			return {
				messages: [new HumanMessage({ content: lastMessage.content })],
				steps: parsedSteps.steps,
			};
		};

		const nodeSelectionAgentNode = async (
			state: typeof WorkflowState.State,
			config: RunnableConfig,
		) => {
			const getNodeMessage = (node: INodeTypeDescription) => {
				return `
					<node_name>${node.name}</node_name>
					<node_description>${node.description}</node_description>
				`;
			};
			const message = `
				<user_request>
					${state.prompt}
				</user_request>
				<steps>
					${state.steps.join('\n')}
				</steps>
				<allowed_n8n_nodes>
					${this.parsedNodeTypes.map(getNodeMessage).join('')}
				</allowed_n8n_nodes>
			`;
			const result = await nodeSelectionAgent.invoke(
				{
					messages: [new HumanMessage({ content: message })],
				},
				config,
			);
			const lastMessage = result.messages.reverse().find((m) => m instanceof ToolMessage);
			if (!lastMessage) {
				throw new ApplicationError('No ToolMessage found in node selection agent');
			}
			const selectedNodes = jsonParse<{
				steps: Array<{ step: string; recommended_nodes: string[]; reasoning: string }>;
			}>(lastMessage.content as string);
			const nodes = [...new Set(selectedNodes.steps.map((step) => step.recommended_nodes).flat())];

			await dispatchCustomEvent('generated_nodes', {
				role: 'assistant',
				type: 'workflow-node',
				nodes,
				id: Date.now().toString(),
				read: false,
			});

			return {
				messages: [new HumanMessage({ content: lastMessage.content })],
				nodes,
			};
		};

		const nodesComposerChainNode = async (
			state: typeof WorkflowState.State,
			config: RunnableConfig,
		) => {
			const getNodeMessage = (nodeName: string) => {
				const node = this.parsedNodeTypes.find((n) => n.name === nodeName);
				if (!node) {
					throw new ApplicationError(`Node type not found: ${nodeName}`);
				}
				return `
					<node_name>
						${node.name}
					</node_name>
					<node_description>
						${node.description}
					</node_description>
					<node_parameters>
						${JSON.stringify(node.properties)}
					</node_parameters>
				`;
			};

			const result = await nodesComposerChain.invoke(
				{
					user_workflow_prompt: state.prompt,
					nodes: state.nodes.map(getNodeMessage).join('\n\n'),
				},
				config,
			);

			const composedNodes = result.map((node, index) => ({
				...node,
				position: [index * 150, 0],
			}));

			await dispatchCustomEvent('composed_nodes', {
				role: 'assistant',
				type: 'workflow-composed',
				nodes: composedNodes,
				id: Date.now().toString(),
				read: false,
			});

			return {
				messages: [new HumanMessage({ content: result })],
				workflowJSON: {
					nodes: composedNodes,
					connections: {},
				},
			};
		};

		const connectionComposerAgentNode = async (
			state: typeof WorkflowState.State,
			config: RunnableConfig,
		) => {
			// Pass the selected nodes as input to create connections.
			const getNodeMessage = (node: INode) => {
				return `
					<node>
						${JSON.stringify(node)}
					</node>
				`;
			};
			const result = await connectionComposerAgent.invoke(
				{
					messages: [
						new HumanMessage({
							content: state.workflowJSON.nodes.map(getNodeMessage).join('\n\n'),
						}),
					],
				},
				config,
			);
			let connections = {};
			const lastMessage = result.messages.reverse().find((m) => m instanceof ToolMessage);
			if (lastMessage) {
				const parsedConnections = jsonParse<{
					connections: Record<
						string,
						{ main: Array<{ node: string; type: string; index: number }> }
					>;
				}>(lastMessage.content as string);
				connections = parsedConnections.connections;
			}
			const workflowJSON = {
				...state.workflowJSON,
				connections,
			};

			await dispatchCustomEvent('composed_connections', {
				role: 'assistant',
				type: 'workflow-connections',
				workflowJSON,
				id: Date.now().toString(),
				read: false,
			});

			return {
				messages: [new HumanMessage({ content: JSON.stringify(connections, null, 2) })],
				workflowJSON,
			};
		};

		///////////////////// User Review /////////////////////
		// The user review node checks if the workflow is approved. In a real application, you might request manual review.
		function userReview(state: typeof WorkflowState.State) {
			// If the user has accepted the workflow, then we proceed to finalize the workflow.
			// Otherwise, we cycle back to node selection for refinement.
			return { next: state.userReview ? 'FINALIZE' : 'NODE_SELECTION' };
		}

		///////////////////// Finalization /////////////////////
		// Finalize the workflow JSON by combining nodes and their connections.
		async function generateWorkflowJSON(state: typeof WorkflowState.State) {
			await dispatchCustomEvent('generated_workflow_json', {
				role: 'assistant',
				type: 'workflow-generated',
				codeSnippet: JSON.stringify(state.workflowJSON, null, 4),
			});
			return { workflowJSON: JSON.stringify(state.workflowJSON, null, 2) };
		}

		///////////////////// Workflow Graph Definition /////////////////////
		const workflowGraph = new StateGraph(WorkflowState)
			.addNode('supervisor', supervisorChainNode)
			.addNode('planner', plannerAgentNode)
			.addNode('node_selector', nodeSelectionAgentNode)
			.addNode('nodes_composer', nodesComposerChainNode)
			.addNode('connection_composer', connectionComposerAgentNode)
			// .addNode("parameter_prefiller", parameterPrefillerAgentNode)
			.addNode('user_review', userReview)
			.addNode('finalize', generateWorkflowJSON);

		// Define the graph edges to set the processing order:
		// Start with the supervisor.
		workflowGraph.addEdge(START, 'supervisor');
		// The supervisor returns the next phase to run:
		workflowGraph.addConditionalEdges('supervisor', (state) => state.next, {
			PLAN: 'planner',
			NODE_SELECTION: 'node_selector',
			USER_REVIEW: 'user_review',
			FINALIZE: 'finalize',
			END,
		});
		// Planner node always flows into node selector:
		workflowGraph.addEdge('planner', 'node_selector');
		// Node selector is followed by nodes composer:
		workflowGraph.addEdge('node_selector', 'nodes_composer');
		// Nodes composer is followed by connection composer:
		workflowGraph.addEdge('nodes_composer', 'connection_composer');
		// Connection composer flows to user review:
		workflowGraph.addEdge('connection_composer', 'user_review');
		// If user review is positive, then finalize; otherwise allow re-adjustment by re-running node selection.
		workflowGraph.addConditionalEdges(
			'user_review',
			(state) => (state.userReview ? 'true' : 'false'),
			{
				true: 'finalize',
				false: 'node_selector',
			},
		);
		workflowGraph.addEdge('finalize', END);

		return workflowGraph;
	}

	// The chat function simulates the agent streaming events from initial state to final workflow JSON.
	async *chat(payload: { question: string; currentWorkflow?: SimpleWorkflow }, _user?: IUser) {
		const agent = this.getAgent().compile();

		const initialState: typeof WorkflowState.State = {
			messages: [],
			prompt: payload.question,
			steps: [],
			nodes: [],
			userReview: true,
			workflowJSON: payload.currentWorkflow ?? { nodes: [], connections: {} },
			next: 'PLAN',
		};

		const stream = agent.streamEvents(initialState, {
			streamMode: 'custom',
			recursionLimit: 10,
			version: 'v2',
		});

		for await (const chunk of stream) {
			let messageChunk: MessageResponse;
			if (chunk.event === 'on_custom_event') {
				if (this.isWorkflowEvent(chunk.name)) {
					messageChunk = chunk.data as MessageResponse;
				} else {
					messageChunk = {
						role: 'assistant',
						type: 'intermediate-step',
						text: chunk.data as string,
						step: chunk.name,
					};
				}
				yield { messages: [messageChunk] };
			}
		}
	}
}
