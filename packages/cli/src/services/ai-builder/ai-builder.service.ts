import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, START } from '@langchain/langgraph';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OperationalError, jsonParse } from 'n8n-workflow';
import type { IUser, INodeTypeDescription, INode } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import {
	supervisorChain,
	plannerAgent,
	nodeSelectionAgent,
	nodesComposerChain,
	connectionComposerAgent,
} from './agents';
import { anthropicClaude37Sonnet, o3mini } from './llm-config';
import type { SimpleWorkflow, MessageResponse } from './types';
import { WorkflowState } from './workflow-state';

@Service()
export class AiBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	private llmSimpleTask: BaseChatModel;

	private llmComplexTask: BaseChatModel;

	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
	) {
		this.parsedNodeTypes = this.getNodeTypes();
		// Api key provided by ai-sdk, but we need to set something here so LangChain doesn't throw an error
		this.llmSimpleTask = o3mini(
			this.globalConfig.aiAssistant.baseUrl + '/v1/api-proxy/openai',
			'_',
		);
		this.llmComplexTask = anthropicClaude37Sonnet(
			this.globalConfig.aiAssistant.baseUrl + '/v1/api-proxy/anthropic',
			'',
		);
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

	private getAgent() {
		const supervisorChainNode = async (
			state: typeof WorkflowState.State,
		): Promise<Partial<typeof WorkflowState.State>> => {
			const nextStep = await supervisorChain(this.llmSimpleTask).invoke({
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
			const result = await plannerAgent(this.llmComplexTask).invoke(
				{
					messages: [new HumanMessage({ content: state.prompt })],
				},
				config,
			);
			const lastMessage = result.messages
				.reverse()
				.find((message) => message instanceof ToolMessage);
			if (!lastMessage) {
				throw new OperationalError('No ToolMessage found in planner agent');
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
			const result = await nodeSelectionAgent(this.llmSimpleTask).invoke(
				{
					messages: [new HumanMessage({ content: message })],
				},
				config,
			);
			const lastMessage = result.messages.reverse().find((m) => m instanceof ToolMessage);
			if (!lastMessage) {
				throw new OperationalError('No ToolMessage found in node selection agent');
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
					throw new OperationalError(`Node type not found: ${nodeName}`);
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

			const result = await nodesComposerChain(this.llmComplexTask).invoke(
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
			const result = await connectionComposerAgent(this.llmComplexTask).invoke(
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
			.addNode('finalize', generateWorkflowJSON);

		// Define the graph edges to set the processing order:
		// Start with the supervisor.
		workflowGraph.addEdge(START, 'supervisor');
		// The supervisor returns the next phase to run:
		workflowGraph.addConditionalEdges('supervisor', (state) => state.next, {
			PLAN: 'planner',
			NODE_SELECTION: 'node_selector',
			FINALIZE: 'finalize',
			END,
		});
		// Planner node always flows into node selector:
		workflowGraph.addEdge('planner', 'node_selector');
		// Node selector is followed by nodes composer:
		workflowGraph.addEdge('node_selector', 'nodes_composer');
		// Nodes composer is followed by connection composer:
		workflowGraph.addEdge('nodes_composer', 'connection_composer');
		// Connection composer flows to finalization:
		workflowGraph.addEdge('connection_composer', 'finalize');
		// Finalization flows to end:
		workflowGraph.addEdge('finalize', END);

		return workflowGraph;
	}

	async *chat(payload: { question: string; currentWorkflow?: SimpleWorkflow }, _user?: IUser) {
		const agent = this.getAgent().compile();

		const initialState: typeof WorkflowState.State = {
			messages: [],
			prompt: payload.question,
			steps: [],
			nodes: [],
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
