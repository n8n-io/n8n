/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable complexity */
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { tool, ToolInputParsingException } from '@langchain/core/tools';
import { Annotation, END, START, StateGraph, Command } from '@langchain/langgraph';
import { createReactAgent, ToolNode } from '@langchain/langgraph/prebuilt'; // Import ToolNode
import { ChatOpenAI } from '@langchain/openai'; // Assuming OpenAI
import { Service } from '@n8n/di';
import type { Operation as JsonPatchOperation } from 'fast-json-patch';
import { applyPatch } from 'fast-json-patch';
import type {
	IUser,
	INodeTypeDescription,
	INode,
	IWorkflowBase,
	IConnection,
	NodeConnectionType,
} from 'n8n-workflow';
import { deepCopy, OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { NodeTypes } from '@/node-types';

// --- Define Toolkit Input/Output Interfaces ---
const AddNodeSchema = z.object({
	type: z
		.string()
		.describe('The type name of the node to add (e.g., "Webhook", "Set", "HttpRequest").'),
	position: z
		.object({ x: z.number(), y: z.number() })
		.describe('The coordinates (x, y) where the node should be placed on the canvas.'),
	parameters: z.record(z.any()).optional().describe('Optional parameters to set on the new node.'),
	name: z.string().optional().describe('Optional custom name for the node.'),
});

const ConnectNodesSchema = z.object({
	sourceNodeId: z.string().describe('The ID of the source node for the connection.'),
	targetNodeId: z.string().describe('The ID of the target node for the connection.'),
	sourceOutput: z
		.enum([
			'main',
			'ai_agent',
			'ai_chain',
			'ai_document',
			'ai_embedding',
			'ai_languageModel',
			'ai_memory',
			'ai_outputParser',
			'ai_retriever',
			'ai_textSplitter',
			'ai_tool',
			'ai_vectorStore',
		])
		.default('main')
		.describe("The name of the source node's output handle."),
	targetInput: z
		.enum([
			'main',
			'ai_agent',
			'ai_chain',
			'ai_document',
			'ai_embedding',
			'ai_languageModel',
			'ai_memory',
			'ai_outputParser',
			'ai_retriever',
			'ai_textSplitter',
			'ai_tool',
			'ai_vectorStore',
		])
		.default('main')
		.describe("The name of the target node's input handle."),
	outputIndex: z
		.number()
		.optional()
		.describe('The index of the source output handle (default: 0).'),
	inputIndex: z.number().optional().describe('The index of the target input handle (default: 0).'),
});

const ConfigureNodeSchema = z.object({
	nodeId: z.string().describe('The ID of the node to configure.'),
	parameters: z.record(z.any()).describe('An object containing the parameters to update or add.'),
});

const SearchNodeLibrarySchema = z.object({
	intent: z
		.string()
		.describe('A description of the desired node functionality or the node name to search for.'),
});

// --- Define Workflow Structure ---
type WorkflowBuilderWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections'>;

// Use JSON Patch standard directly
export type WorkflowPatch = JsonPatchOperation;

// --- Define Message Types for Streaming ---
export type OrchestratorMessage =
	| { type: 'clarification_request'; question: string; options?: string[]; context?: any }
	| {
			type: 'step_update';
			stepDescription: string;
			status: 'in_progress' | 'completed' | 'failed';
			error?: string;
			agentName?: string;
	  }
	| { type: 'workflow_update'; patch: WorkflowPatch[] }
	| { type: 'workflow_snapshot'; workflow: WorkflowBuilderWorkflow }
	| { type: 'final_result'; workflow: WorkflowBuilderWorkflow; summary?: string }
	| { type: 'error'; message: string };

// --- LangGraph State Definition ---
const AgentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),
	// The current state of the workflow being built
	workflowState: Annotation<WorkflowBuilderWorkflow>({
		reducer: (x, y) => y ?? x, // Always take the latest workflow state
		default: () => ({ nodes: [], connections: {} }),
	}),
	// The agent node that last performed work or the next one to act
	next: Annotation<string>({
		reducer: (x, y) => y ?? x ?? END,
		default: () => END,
	}),
	// Store user prompt
	userPrompt: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),
	// Store the original tool call ID for ToolMessage
	toolCallId: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
		default: () => undefined,
	}),
});
type AgentStateType = typeof AgentState.State;

// Helper to apply patches safely
function applyPatchesSafely(
	workflow: WorkflowBuilderWorkflow,
	patches: WorkflowPatch[],
): WorkflowBuilderWorkflow {
	if (!patches || patches.length === 0) {
		return workflow;
	}
	console.log(`Applying ${patches.length} patches...`);
	try {
		const document = deepCopy(workflow);
		const result = applyPatch(document, patches, true, false);
		return result.newDocument;
	} catch (error: any) {
		console.error('Patch application failed:', error);
		throw new OperationalError(`Failed to apply workflow patches: ${error.message}`);
	}
}

@Service()
export class AiBuilderService {
	private allNodeTypes: INodeTypeDescription[] = [];

	private llm: ChatOpenAI;

	private graph: StateGraph<typeof AgentState>;

	constructor(private readonly nodeTypes: NodeTypes) {
		this.loadNodeTypes();
		// Initialize LLM
		this.llm = new ChatOpenAI({
			modelName: 'gpt-4o-mini',
			// modelName: 'gpt-4o',
			temperature: 0,
			// Add configuration like apiKey if not using environment variables
		});
		// @ts-ignore
		this.graph = this.buildGraph();
	}

	private loadNodeTypes(): void {
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());
		const nodeTypes = nodeTypesKeys
			.map((nodeName) => {
				try {
					// Handle potential errors if a node type fails to load
					const description = this.nodeTypes.getByNameAndVersion(nodeName)?.description;
					return description ? { ...description, name: nodeName } : null;
				} catch (error) {
					console.warn(`Could not load node type description for ${nodeName}:`, error);
					return null;
				}
			})
			.filter(
				(nodeType): nodeType is INodeTypeDescription & { name: string } =>
					Boolean(nodeType) && nodeType?.hidden !== true,
			);

		this.allNodeTypes = nodeTypes;
		// Log the number of loaded node types
		console.log(`Loaded ${this.allNodeTypes.length} node types.`);
	}

	// --- Toolkit Implementations (wrapped as methods for clarity) ---

	private _searchNodeLibrary(intent: string): INodeTypeDescription[] {
		console.log(`Toolkit: Searching for nodes matching intent: ${intent}`);
		const lowerIntent = intent.toLowerCase();
		const candidates = this.allNodeTypes.filter(
			(nt) =>
				nt.name.toLowerCase().includes(lowerIntent) ||
				nt.displayName?.toLowerCase().includes(lowerIntent) ||
				nt.description?.toLowerCase().includes(lowerIntent) ||
				nt.subtitle?.toLowerCase().includes(lowerIntent),
		);
		candidates.sort((a, b) => {
			if (a.name.toLowerCase() === lowerIntent) return -1;
			if (b.name.toLowerCase() === lowerIntent) return 1;
			if (a.displayName?.toLowerCase() === lowerIntent) return -1;
			if (b.displayName?.toLowerCase() === lowerIntent) return 1;
			return 0;
		});
		// Return essential info for the LLM
		return candidates.slice(0, 10).map(
			(nt) =>
				({
					name: nt.name,
					displayName: nt.displayName,
					description: nt.description,
					subtitle: nt.subtitle,
				}) as INodeTypeDescription,
		);
	}

	private _addNode(
		input: z.infer<typeof AddNodeSchema>,
		currentWorkflow: WorkflowBuilderWorkflow,
	): WorkflowPatch[] {
		console.log(`Toolkit: Adding node ${input.type}`);
		const nodeTypeInfo = this.allNodeTypes.find((nt) => nt.name === input.type);
		if (!nodeTypeInfo) {
			// Attempt to find by display name as a fallback
			const foundByDisplayName = this.allNodeTypes.find((nt) => nt.displayName === input.type);
			if (foundByDisplayName) {
				input.type = foundByDisplayName.name; // Correct the type
			} else {
				throw new OperationalError(`Node type "${input.type}" not found.`);
			}
		}

		const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; // More unique ID
		const newNode: Partial<INode> = {
			id: newNodeId,
			name: input.name ?? input.type,
			type: input.type,
			typeVersion: nodeTypeInfo?.defaultVersion ?? 1,
			position: [input.position.x, input.position.y],
			parameters: input.parameters ?? {},
		};

		const patches: WorkflowPatch[] = [];
		if (!currentWorkflow.nodes) {
			patches.push({ op: 'add', path: '/nodes', value: [] });
		}
		patches.push({ op: 'add', path: '/nodes/-', value: newNode });
		return patches;
	}

	private _connectNodes(
		input: z.infer<typeof ConnectNodesSchema>,
		currentWorkflow: WorkflowBuilderWorkflow,
	): WorkflowPatch[] {
		console.log(
			`Toolkit: Connecting ${input.sourceNodeId} (${input.sourceOutput}) to ${input.targetNodeId} (${input.targetInput})`,
		);

		const sourceNodeExists = currentWorkflow.nodes.some((n) => n.id === input.sourceNodeId);
		const targetNodeExists = currentWorkflow.nodes.some((n) => n.id === input.targetNodeId);

		if (!sourceNodeExists)
			throw new OperationalError(`Source node "${input.sourceNodeId}" not found.`);
		if (!targetNodeExists)
			throw new OperationalError(`Target node "${input.targetNodeId}" not found.`);

		const connectionData: IConnection = {
			node: input.targetNodeId,
			type: input.targetInput as NodeConnectionType,
			index: input.inputIndex ?? 0,
		};

		const connectionPath = `/connections/${input.sourceNodeId}`;
		const outputTypePath = `${connectionPath}/${input.sourceOutput}`;

		const patches: WorkflowPatch[] = [];

		if (!currentWorkflow.connections) {
			patches.push({ op: 'add', path: '/connections', value: {} });
		}
		if (!currentWorkflow.connections?.[input.sourceNodeId]) {
			patches.push({ op: 'add', path: connectionPath, value: {} });
		}
		if (!currentWorkflow.connections?.[input.sourceNodeId]?.[input.sourceOutput]) {
			patches.push({ op: 'add', path: outputTypePath, value: [] });
		}

		// Check if connection already exists to prevent duplicates
		const existingConnections =
			currentWorkflow.connections?.[input.sourceNodeId]?.[input.sourceOutput] ?? [];
		// Ensure conn is not null/undefined before accessing properties
		const connectionExists = existingConnections.some(
			(conn) =>
				conn && // Add null check
				// @ts-ignore
				conn.node === connectionData.node &&
				// @ts-ignore
				conn.type === connectionData.type &&
				// @ts-ignore
				conn.index === connectionData.index,
		);

		if (!connectionExists) {
			const targetPath = `${outputTypePath}/-`; // Append to the array for this output handle
			patches.push({ op: 'add', path: targetPath, value: connectionData });
		} else {
			console.warn(
				`Connection from ${input.sourceNodeId}:${input.sourceOutput}[${input.outputIndex ?? 0}] to ${input.targetNodeId}:${input.targetInput}[${input.inputIndex ?? 0}] already exists. Skipping.`,
			);
		}

		return patches;
	}

	private _configureNode(
		input: z.infer<typeof ConfigureNodeSchema>,
		currentWorkflow: WorkflowBuilderWorkflow,
	): WorkflowPatch[] {
		console.log(`Toolkit: Configuring node ${input.nodeId}`);
		const nodeIndex = currentWorkflow.nodes.findIndex((n) => n.id === input.nodeId);
		if (nodeIndex === -1) {
			throw new OperationalError(`Node "${input.nodeId}" not found for configuration.`);
		}

		const patches: WorkflowPatch[] = [];
		for (const [key, value] of Object.entries(input.parameters)) {
			// Use 'add' which also replaces if the path exists.
			// Need to escape special characters like '/' in keys
			const escapedKey = key.replace(/~/g, '~0').replace(/\//g, '~1');
			const paramPath = `/nodes/${nodeIndex}/parameters/${escapedKey}`;
			patches.push({ op: 'add', path: paramPath, value });
		}
		return patches;
	}

	// --- Langchain Tools Definition ---
	private createTools(): DynamicStructuredTool[] {
		const searchTool = tool(
			async ({ intent }, config) => {
				const toolCallId = config?.toolCall?.id;
				try {
					const results = this._searchNodeLibrary(intent);
					const content = `Found nodes: ${JSON.stringify(results)}`;
					return new Command({
						update: {
							messages: [new ToolMessage({ content, tool_call_id: toolCallId })],
						},
					});
				} catch (error: any) {
					const content = `Error searching node library: ${error.message}`;
					return new Command({
						update: {
							messages: [new ToolMessage({ content, tool_call_id: toolCallId, status: 'error' })],
						},
					});
				}
			},
			{
				name: 'searchNodeLibrary',
				description:
					'Searches the n8n node library based on a description or name to find relevant nodes.',
				schema: SearchNodeLibrarySchema,
			},
		);

		const addNodeTool = tool(
			async (input, config) => {
				const toolCallId = config?.toolCall?.id;
				const state = config?.configurable?.state as AgentStateType | undefined;
				if (!state) {
					return new Command({
						update: {
							messages: [
								new ToolMessage({
									content: 'Error: State not available in tool.',
									tool_call_id: toolCallId,
									status: 'error',
								}),
							],
						},
					});
				}
				try {
					const patches = this._addNode(input, state.workflowState);
					const newWorkflowState = applyPatchesSafely(state.workflowState, patches);
					const content = `Successfully added node ${input.type}. Patches applied.`;
					return new Command({
						update: {
							workflowState: newWorkflowState,
							messages: [new ToolMessage({ content, tool_call_id: toolCallId })],
						},
					});
				} catch (error: any) {
					const content = `Error adding node: ${error.message}`;
					return new Command({
						update: {
							messages: [new ToolMessage({ content, tool_call_id: toolCallId, status: 'error' })],
						},
					});
				}
			},
			{
				name: 'addNode',
				description:
					'Adds a new node of a specified type to the workflow canvas at a given position.',
				schema: AddNodeSchema,
			},
		);

		const connectNodesTool = tool(
			async (input, config) => {
				const toolCallId = config?.toolCall?.id;
				const state = config?.configurable?.state as AgentStateType | undefined;
				if (!state) {
					return new Command({
						update: {
							messages: [
								new ToolMessage({
									content: 'Error: State not available in tool.',
									tool_call_id: toolCallId,
									status: 'error',
								}),
							],
						},
					});
				}
				try {
					const patches = this._connectNodes(input, state.workflowState);
					if (patches.length === 0) {
						const content =
							'Skipped connecting nodes: Connection already exists or no changes needed.';
						return new Command({
							update: {
								messages: [new ToolMessage({ content, tool_call_id: toolCallId })],
							},
						});
					}
					const newWorkflowState = applyPatchesSafely(state.workflowState, patches);
					const content = `Successfully connected ${input.sourceNodeId} to ${input.targetNodeId}. Patches applied.`;
					return new Command({
						update: {
							workflowState: newWorkflowState,
							messages: [new ToolMessage({ content, tool_call_id: toolCallId })],
						},
					});
				} catch (error: any) {
					const content = `Error connecting nodes: ${error.message}`;
					return new Command({
						update: {
							messages: [new ToolMessage({ content, tool_call_id: toolCallId, status: 'error' })],
						},
					});
				}
			},
			{
				name: 'connectNodes',
				description: 'Connects two nodes in the workflow using specified output and input handles.',
				schema: ConnectNodesSchema,
			},
		);

		const configureNodeTool = tool(
			async (input, config) => {
				const toolCallId = config?.toolCall?.id;
				const state = config?.configurable?.state as AgentStateType | undefined;
				if (!state) {
					return new Command({
						update: {
							messages: [
								new ToolMessage({
									content: 'Error: State not available in tool.',
									tool_call_id: toolCallId,
									status: 'error',
								}),
							],
						},
					});
				}
				try {
					const patches = this._configureNode(input, state.workflowState);
					const newWorkflowState = applyPatchesSafely(state.workflowState, patches);
					const content = `Successfully configured node ${input.nodeId}. Patches applied.`;
					return new Command({
						update: {
							workflowState: newWorkflowState,
							messages: [new ToolMessage({ content, tool_call_id: toolCallId })],
						},
					});
				} catch (error: any) {
					const content = `Error configuring node: ${error.message}`;
					return new Command({
						update: {
							messages: [new ToolMessage({ content, tool_call_id: toolCallId, status: 'error' })],
						},
					});
				}
			},
			{
				name: 'configureNode',
				description: 'Configures the parameters of an existing node in the workflow.',
				schema: ConfigureNodeSchema,
			},
		);

		return [searchTool, addNodeTool, connectNodesTool, configureNodeTool];
	}

	// --- Agent and Graph Construction ---

	private buildGraph() {
		const tools = this.createTools();
		const toolNode = new ToolNode(tools); // Use ToolNode

		const members = ['workflowBuilder', 'nodeSearcher'] as const; // Use 'as const' for z.enum

		// --- Worker Agent: Node Searcher ---
		const nodeSearcherAgent = createReactAgent({
			llm: this.llm,
			tools: [tools.find((t) => t.name === 'searchNodeLibrary')!],
			stateModifier: new SystemMessage(
				`You are a helpful assistant responsible for searching the n8n node library.
				Based on the user request and conversation history, identify the best nodes to use.
				Use the searchNodeLibrary tool to find suitable nodes.
				Provide the search results clearly. Call the tool and respond with the results.`,
			),
		});

		const nodeSearcherNode = async (state: AgentStateType, config?: RunnableConfig) => {
			// Pass state to the agent's config so tools can access it
			const agentConfig = { ...config, configurable: { ...config?.configurable, state } };
			const result = await nodeSearcherAgent.invoke(state, agentConfig);
			return { messages: result.messages.slice(-1) }; // Return only the last message
		};

		// --- Worker Agent: Workflow Builder ---
		const workflowBuilderAgent = createReactAgent({
			llm: this.llm,
			tools: tools.filter((t) => t.name !== 'searchNodeLibrary'), // Tools for modifying the workflow
			stateModifier: new SystemMessage(
				`You are an expert n8n workflow builder.
				Your goal is to modify the n8n workflow based on the user's request and the conversation history.
				You have access to tools for adding nodes, connecting nodes, and configuring nodes.
				Use the provided tools to make changes to the workflow state.
				Think step-by-step:
				1. Understand the user's goal for the workflow modification.
				2. Identify the necessary nodes (use nodeSearcher's output if available). Make sure to also search for flow control nodes(Schedule Trigger, IF Node, Switch Node, etc.).
				3. Plan the sequence of actions (add, connect, configure).
				4. Call the appropriate tool for EACH action required to fulfill the current step/request.
				5. Ensure nodes are connected logically.
				6. When adding nodes, determine appropriate positions (e.g., place new nodes relative to existing ones).
				7. When configuring nodes, set the parameters as requested.
				The current workflow state is available via the tools. The tools will update the state directly.
				Focus on calling the tools correctly with the right parameters based on the plan. Respond with the final status or result after calling the necessary tools.`,
			),
		});
		const workflowBuilderNode = async (state: AgentStateType, config?: RunnableConfig) => {
			// Pass state to the agent's config so tools can access it
			const agentConfig = { ...config, configurable: { ...config?.configurable, state } };
			const result = await workflowBuilderAgent.invoke(state, agentConfig);
			// The ToolNode will handle executing the tool calls from the agent's response
			return { messages: result.messages.slice(-1) };
		};

		// --- Supervisor Agent ---
		const supervisorSystemPrompt = `You are a supervisor managing a team of AI agents to build an n8n workflow based on a user's request.
			The team members are: ${members.join(', ')}.
			- nodeSearcher: Searches the n8n node library for relevant nodes.
			- workflowBuilder: Adds, connects, and configures nodes in the workflow by calling tools.

			The current workflow state and conversation history are provided.
			Your tasks:
			1. Receive the user's request.
			2. Decide which agent should act next based on the request and the current state.
			   - If the user asks to find nodes, route to 'nodeSearcher'.
			   - If the user asks to build or modify the workflow (add, connect, configure nodes), route to 'workflowBuilder'.
			   - If the builder needs node suggestions, route to 'nodeSearcher' first, then back to 'workflowBuilder'.
			3. If an agent provides results, review them and decide the next step.
			4. The tools called by 'workflowBuilder' update the state directly.
			5. Continue routing until the user's request seems complete or requires clarification.
			6. If the request is fulfilled, respond with FINISH.

			Respond ONLY with the name of the next agent to act or FINISH.`;

		const supervisorOptions = [END, ...members] as const;
		// Define the routing tool schema *outside* the supervisor chain definition
		const supervisorRoutingToolSchema = z.object({
			next: z
				.enum(supervisorOptions)
				.describe('The next agent to act, or FINISH if the task is complete.'),
		});
		const supervisorTool = tool(
			async ({ next }) => {
				if (!['__end__', 'workflowBuilder', 'nodeSearcher'].includes(next)) {
					// eslint-disable-next-line n8n-local-rules/no-plain-errors
					throw new Error(`Invalid next agent: ${next}`);
				}
				return next;
			},
			{
				name: 'supervisorTool',
				description: 'Supervisor tool',
				schema: supervisorRoutingToolSchema,
			},
		);

		const supervisorPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				`${supervisorSystemPrompt}
				Current Workflow State:
				Nodes: {node_names}
				Connections: {connection_summary}
				Based on the conversation and current state, who should act next? Choose one: {options}`,
			],
			new MessagesPlaceholder('messages'),
		]);

		const supervisorLlm = this.llm.bindTools([supervisorTool], {
			// Pass the schema here for binding
			tool_choice: { type: 'function', function: { name: 'supervisorTool' } }, // Correctly specify tool_choice
		});

		const supervisorChain = supervisorPrompt.pipe(supervisorLlm).pipe((msg: AIMessage) => {
			const toolCalls = msg.tool_calls as
				| Array<{ name: string; arguments: string; args: { next: string } }>
				| undefined;
			if (toolCalls?.[0]?.args?.next) {
				try {
					if (toolCalls[0].name === 'supervisorTool') {
						return { next: toolCalls[0].args.next };
					}
				} catch (e) {
					console.error('Supervisor failed to parse routing decision:', toolCalls[0].args.next, e);
					return { next: END }; // Default to END on parsing error
				}
			}
			console.warn('Supervisor did not provide a valid routing tool call.');
			return { next: END }; // Default to END if no valid tool call
		});

		// --- Graph Definition ---
		const workflow = new StateGraph(AgentState)
			.addNode('nodeSearcher', nodeSearcherNode)
			.addNode('workflowBuilder', workflowBuilderNode)
			.addNode('action', toolNode) // Add ToolNode

			// Node for the supervisor logic
			.addNode('supervisor', async (state: AgentStateType) => {
				// Prepare context for the supervisor prompt
				const nodeNames = state.workflowState.nodes.map((n) => n.name).join(', ') || 'None';
				const connectionSummary = JSON.stringify(state.workflowState.connections) || '{}';
				const result = await supervisorChain.invoke({
					messages: state.messages,
					options: supervisorOptions.join(', '),
					node_names: nodeNames,
					connection_summary: connectionSummary,
				});
				return { next: result.next };
			})

			// Define edges
			.addEdge(START, 'supervisor') // Start with the supervisor
			.addEdge('nodeSearcher', 'action')
			.addEdge('workflowBuilder', 'action')
			// After tools are executed by 'action' node, go back to supervisor
			.addEdge('action', 'supervisor')

			// Conditional routing from supervisor
			.addConditionalEdges('supervisor', (state: AgentStateType) => state.next, {
				nodeSearcher: 'nodeSearcher',
				workflowBuilder: 'workflowBuilder',
				[END]: END,
			});

		return workflow;
	}

	// --- Main Orchestration Method ---

	async *chat(
		payload: { prompt: string; currentWorkflow?: IWorkflowBase },
		_user?: IUser, // Keep user for potential future use (e.g., permissions)
	): AsyncGenerator<OrchestratorMessage> {
		const initialWorkflowState = payload.currentWorkflow
			? {
					nodes: deepCopy(payload.currentWorkflow.nodes),
					connections: deepCopy(payload.currentWorkflow.connections),
				}
			: { nodes: [], connections: {} };

		yield { type: 'workflow_snapshot', workflow: initialWorkflowState };

		const graphInstance = this.graph.compile();

		const initialState: AgentStateType = {
			messages: [new HumanMessage({ content: payload.prompt })],
			workflowState: initialWorkflowState,
			next: START, // Let supervisor decide first
			userPrompt: payload.prompt,
			toolCallId: undefined, // Initialize toolCallId
		};

		try {
			type GraphStepOutput =
				| {
						[key: string]: Partial<AgentStateType>;
				  }
				| { __end__: AgentStateType };

			const stream = graphInstance.stream(initialState, { recursionLimit: 150 });

			let previousWorkflowState = deepCopy(initialWorkflowState);

			for await (const step of (await stream) as AsyncIterable<GraphStepOutput>) {
				// Add type assertion
				if (step.__end__) {
					console.log('Step is __end__');
					const finalState = step.__end__ as AgentStateType;
					yield {
						type: 'final_result',
						workflow: finalState.workflowState,
						summary: 'Workflow generation process finished.',
					};
					break; // Exit the loop
				}

				const [agentName, agentOutput] = Object.entries(step)[0];
				const currentOutput = agentOutput; // Type assertion

				console.log(`--- Agent Step: ${agentName} ---`);
				console.log(JSON.stringify(currentOutput, null, 2));
				console.log('-----------------------------');

				// Yield step updates based on agent activity
				if (
					agentName !== 'supervisor' &&
					agentName !== 'action' &&
					agentName !== END &&
					agentName !== START
				) {
					yield {
						type: 'step_update',
						agentName,
						stepDescription: `Agent '${agentName}' processing...`,
						status: 'in_progress',
					};
				}

				// Check if workflowState was updated in this step
				if (
					currentOutput.workflowState &&
					JSON.stringify(currentOutput.workflowState) !== JSON.stringify(previousWorkflowState)
				) {
					yield { type: 'workflow_snapshot', workflow: currentOutput.workflowState };
					previousWorkflowState = deepCopy(currentOutput.workflowState);
					// TODO: Optionally calculate and yield 'workflow_update' with patches if needed downstream
				}

				// Report agent completion (excluding supervisor/utility nodes)
				if (
					agentName !== 'supervisor' &&
					agentName !== 'action' &&
					agentName !== END &&
					agentName !== START
				) {
					// Check if the agent produced an error message (via ToolMessage)
					const lastMessage = currentOutput.messages?.[currentOutput.messages.length - 1];
					const isError = lastMessage instanceof ToolMessage && lastMessage.status === 'error';
					const errorMessage = isError ? lastMessage.content : undefined;

					yield {
						type: 'step_update',
						agentName,
						stepDescription: `Agent '${agentName}' finished.`,
						status: isError ? 'failed' : 'completed',
						error: typeof errorMessage === 'string' ? errorMessage : undefined, // Ensure error is string
					};
				}
			}
		} catch (error: any) {
			console.error('AI Builder LangGraph Error:', error);
			// Catch specific ToolInputParsingException
			if (error instanceof ToolInputParsingException) {
				yield {
					type: 'error',
					message: `Tool Input Error: ${error.message}. Please check the parameters provided to the tool.`,
				};
			} else {
				yield {
					type: 'error',
					message: error.message || 'An unexpected error occurred during workflow generation.',
				};
			}
		}
	}
}
