import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, INodeTypes } from 'n8n-workflow';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { ILicenseService } from './interfaces';
import { anthropicClaudeSonnet4, gpt41mini } from './llm-config';
import { WorkflowState } from './workflow-state';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createNodeSearchTool } from './tools/node-search.tool';
import { createAddNodeTool } from './tools/add-node.tool';
import { createNodeDetailsTool } from './tools/node-details.tool';
import { createConnectNodesTool } from './tools/connect-nodes.tool';

@Service()
export class AiWorkflowBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	private llmSimpleTask: BaseChatModel | undefined;

	private llmComplexTask: BaseChatModel | undefined;

	private client: AiAssistantClient | undefined;

	private checkpointer = new MemorySaver();

	constructor(
		private readonly licenseService: ILicenseService,
		private readonly nodeTypes: INodeTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly n8nVersion: string,
	) {
		this.parsedNodeTypes = this.getNodeTypes();
	}

	private async setupModels(user: IUser) {
		if (this.llmSimpleTask && this.llmComplexTask) {
			return;
		}

		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		// If base URL is set, use api-proxy to access LLMs
		if (baseUrl) {
			if (!this.client) {
				const licenseCert = await this.licenseService.loadCertStr();
				const consumerId = this.licenseService.getConsumerId();

				this.client = new AiAssistantClient({
					licenseCert,
					consumerId,
					baseUrl,
					n8nVersion: this.n8nVersion,
				});
			}

			assert(this.client, 'Client not setup');

			const authHeaders = await this.client.generateApiProxyCredentials(user);
			this.llmSimpleTask = await gpt41mini({
				baseUrl: baseUrl + '/v1/api-proxy/openai',
				// When using api-proxy the key will be populated automatically, we just need to pass a placeholder
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});
			this.llmComplexTask = await anthropicClaudeSonnet4({
				baseUrl: baseUrl + '/v1/api-proxy/anthropic',
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});
			return;
		}
		// If base URL is not set, use environment variables
		this.llmSimpleTask = await gpt41mini({
			apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '',
		});
		this.llmComplexTask = await anthropicClaudeSonnet4({
			apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
		});
	}

	private getNodeTypes(): INodeTypeDescription[] {
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());

		const nodeTypes = nodeTypesKeys
			.map((nodeName) => {
				return { ...this.nodeTypes.getByNameAndVersion(nodeName).description, name: nodeName };
			})
			.filter((nodeType) => nodeType.hidden !== true)
			.map((nodeType, _index, nodeTypes: INodeTypeDescription[]) => {
				const isTool = nodeType.name.endsWith('Tool');
				if (!isTool) return nodeType;

				const nonToolNode = nodeTypes.find((nt) => nt.name === nodeType.name.replace('Tool', ''));
				if (!nonToolNode) return nodeType;

				return {
					...nonToolNode,
					...nodeType,
				};
			});

		return nodeTypes;
	}

	private getAgent() {
		const tools = [
			createNodeSearchTool(this.parsedNodeTypes),
			createNodeDetailsTool(this.parsedNodeTypes),
			createAddNodeTool(this.parsedNodeTypes),
			createConnectNodesTool(this.parsedNodeTypes),
		];
		const callModel = async (state: typeof WorkflowState.State) => {
			assert(this.llmSimpleTask, 'LLM not setup');
			assert(this.llmSimpleTask.bindTools, 'LLM does not support tools');

			// @ts-ignore
			const response = await this.llmSimpleTask.bindTools(tools).invoke(state.messages);

			return { messages: [response] };
		};

		const shouldContinue = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage = messages[messages.length - 1] as AIMessage;

			if (lastMessage.tool_calls?.length) {
				return 'tools';
			}
			return '__end__';
		};

		const toolNode = new ToolNode(tools);
		const workflow = new StateGraph(WorkflowState)
			.addNode('agent', callModel)
			.addEdge('__start__', 'agent')
			.addNode('tools', toolNode)
			.addEdge('tools', 'agent')
			.addConditionalEdges('agent', shouldContinue);

		return workflow;
	}

	async *chat(
		payload: { question: string; currentWorkflowJSON?: string; workflowId?: string },
		user: IUser,
	) {
		if (!this.llmComplexTask || !this.llmSimpleTask) {
			await this.setupModels(user);
		}

		const agent = this.getAgent().compile({ checkpointer: this.checkpointer });

		// Generate thread ID from workflowId and userId
		// This ensures one session per workflow per user
		const threadId = payload.workflowId
			? `workflow-${payload.workflowId}-user-${user.id}`
			: `user-${user.id}-default`;

		// Configure thread
		const threadConfig = {
			configurable: {
				thread_id: threadId,
			},
		};

		const initialState: typeof WorkflowState.State = {
			messages: [
				new SystemMessage({
					content: `You are an AI assistant that helps users create and edit workflows in n8n. Before adding any node or responding with node details, make sure to search for each node first using the "search_nodes" tool. If you don't know the node, respond with "I don't know".

					<current_workflow_json>
						${JSON.stringify(payload.currentWorkflowJSON, null, 2)}
					</current_workflow_json>

					CRITICAL RULES FOR TOOL USAGE:
					1. BEFORE ADDING NODES: You MUST call "get_node_details" for EACH node type you plan to add. This is MANDATORY to understand the node's input/output structure and ensure proper connections.
					2. ALWAYS use the "add_nodes" tool with an array of nodes when adding multiple nodes. NEVER call "add_nodes" multiple times in parallel.
					3. When you need to add multiple nodes, collect all nodes you want to add and call "add_nodes" ONCE with the complete array.
					4. The "add_nodes" tool must be called sequentially, not in parallel, to ensure proper state management.

					WORKFLOW CREATION SEQUENCE:
					1. Search for nodes using "search_nodes" to find available node types
					2. Call "get_node_details" for EACH node type to understand inputs/outputs (MANDATORY)
					3. Add all nodes at once using "add_nodes" with an array
					4. Connect nodes using "connect_nodes" based on the input/output information from step 2

					IMPORTANT: If you need to use both "add_nodes" and "connect_nodes" tools, use the "add_nodes" tool first, wait for response to get the node IDs, and then use the "connect_nodes" tool. This is to make sure that the nodes are available for the "connect_nodes" tool.

					UNDERSTANDING NODE CONNECTIONS:
					In n8n workflows, connections are stored as: connections[SOURCE_NODE] → TARGET_NODE
					- SOURCE NODE: The node whose output connects to another (appears as key in connections)
					- TARGET NODE: The node that receives the connection (appears in the connection array)
					- Connection direction: Source → Target

					FOR MAIN CONNECTIONS:
					- Data flows from the output of the source node to the input of the target node
					- Example: HTTP Request (source) → Set (target) - HTTP Request output connects to Set input

					FOR AI SUB-NODE CONNECTIONS (ai_languageModel, ai_tool, ai_memory, ai_embedding, etc.):
					- Sub-nodes provide capabilities TO main nodes or other sub-nodes
					- The SUB-NODE is ALWAYS the SOURCE (provides the capability)
					- The MAIN NODE or receiving sub-node is the TARGET (consumes the capability)

					CORRECT CONNECTION EXAMPLES:
					- OpenAI Chat Model (source) → AI Agent (target) [ai_languageModel]
					- Calculator Tool (source) → AI Agent (target) [ai_tool]
					- Window Buffer Memory (source) → AI Agent (target) [ai_memory]
					- Token Splitter (source) → Default Data Loader (target) [ai_textSplitter]
					- Default Data Loader (source) → Vector Store (target) [ai_document]
					- Embeddings OpenAI (source) → Vector Store (target) [ai_embedding]

					REMEMBER: Sub-nodes are always sources in AI connections, providing their capabilities to targets.
					`,
				}),
				new HumanMessage({ content: payload.question }),
			],
			prompt: payload.question,
			steps: [],
			nodes: [],
			workflowJSON: payload.currentWorkflowJSON
				? JSON.parse(payload.currentWorkflowJSON)
				: { nodes: [], connections: {} },
			isWorkflowPrompt: false,
			next: 'PLAN',
		};

		const stream = agent.streamEvents(initialState, {
			...threadConfig,
			// streamMode: 'custom',
			recursionLimit: 30,
			version: 'v2',
		});

		for await (const chunk of stream) {
			if (chunk.event === 'on_tool_end' && ['connect_nodes', 'add_nodes'].includes(chunk.name)) {
				console.log('Updating WF');
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify(chunk.data.output.update.workflowJSON, null, 2),
						},
					],
				};
			} else if (chunk.event === 'on_chain_end' && chunk.name === 'LangGraph') {
				const lastAiMessage = (chunk.data.output.messages ?? [])[
					chunk.data.output.messages.length - 1
				].content;
				// let messageChunk: MessageResponse;
				const messageChunk = {
					role: 'assistant',
					type: 'message',
					text: lastAiMessage,
					step: chunk.name,
				};

				yield { messages: [messageChunk] };
				// if (chunk.event === 'on_custom_event') {
				// 	if (this.isWorkflowEvent(chunk.name)) {
				// 		messageChunk = chunk.data as MessageResponse;
				// 	} else {
				// 	}
				// }
			}

			// console.log('chunk.event:', chunk.event, JSON.stringify(chunk, null, 2))
		}
	}
}
