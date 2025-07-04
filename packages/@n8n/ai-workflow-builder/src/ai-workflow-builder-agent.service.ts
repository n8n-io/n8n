import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, MemorySaver, isCommand } from '@langchain/langgraph';
import type { Command } from '@langchain/langgraph';
import { isAIMessage } from '@langchain/core/messages';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, INodeTypes } from 'n8n-workflow';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { ILicenseService } from './interfaces';
import { anthropicClaudeSonnet4, gpt41, gpt41mini } from './llm-config';
import { createAddNodeTool } from './tools/add-node.tool';
import { createConnectNodesTool } from './tools/connect-nodes.tool';
import { createNodeDetailsTool } from './tools/node-details.tool';
import { createNodeSearchTool } from './tools/node-search.tool';
import { createUpdateNodeParametersTool } from './tools/update-node-parameters.tool';
import { WorkflowState } from './workflow-state';
import type { SimpleWorkflow } from './types';

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

		this.llmComplexTask = await gpt41({
			apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '',
		});
		// this.llmComplexTask = await anthropicClaudeSonnet4({
		// 	apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
		// });
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

	/**
	 * Deep merge connections objects
	 */
	private deepMergeConnections(
		base: SimpleWorkflow['connections'],
		update: SimpleWorkflow['connections'],
	): SimpleWorkflow['connections'] {
		const merged = { ...base };

		for (const [nodeName, nodeConnections] of Object.entries(update)) {
			if (!merged[nodeName]) {
				merged[nodeName] = nodeConnections;
			} else {
				// Merge connections for this node
				for (const [connectionType, connections] of Object.entries(nodeConnections)) {
					if (!merged[nodeName][connectionType]) {
						merged[nodeName][connectionType] = connections;
					} else {
						// Merge arrays of connections (NodeInputConnections type)
						const existingConnections = merged[nodeName][connectionType];
						const newConnections = connections;

						// Both are arrays where each index can contain IConnection[] or null
						for (let i = 0; i < newConnections.length; i++) {
							const newConnArray = newConnections[i];
							if (!newConnArray) continue;

							if (!existingConnections[i]) {
								// No existing connections at this index
								existingConnections[i] = newConnArray;
							} else {
								// Merge connections at this index
								const existingConnArray = existingConnections[i];
								if (!existingConnArray) continue;

								// Create a set of existing connection strings for comparison
								const existingSet = new Set(
									existingConnArray.map((conn) =>
										JSON.stringify({
											node: conn.node,
											type: conn.type,
											index: conn.index,
										}),
									),
								);

								// Add only new connections
								for (const conn of newConnArray) {
									const connString = JSON.stringify({
										node: conn.node,
										type: conn.type,
										index: conn.index,
									});
									if (!existingSet.has(connString)) {
										existingConnArray.push(conn);
									}
								}
							}
						}
					}
				}
			}
		}

		return merged;
	}

	private async getAgent(user: IUser) {
		if (!this.llmComplexTask || !this.llmSimpleTask) {
			await this.setupModels(user);
		}

		const updateNodeParametersTool = createUpdateNodeParametersTool(this.parsedNodeTypes)
			.withLlm(this.llmComplexTask!)
			.createLangChainTool();

		const tools = [
			createNodeSearchTool(this.parsedNodeTypes),
			createNodeDetailsTool(this.parsedNodeTypes),
			createAddNodeTool(this.parsedNodeTypes),
			createConnectNodesTool(this.parsedNodeTypes),
			updateNodeParametersTool,
		];

		// Create a map for quick tool lookup
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		const callModel = async (state: typeof WorkflowState.State) => {
			assert(this.llmComplexTask, 'LLM not setup');
			assert(this.llmComplexTask.bindTools, 'LLM does not support tools');

			// @ts-ignore
			const response = await this.llmComplexTask.bindTools(tools).invoke(state.messages);

			return { messages: [response] };
		};

		const shouldContinue = ({ messages }: typeof WorkflowState.State) => {
			const lastMessage = messages[messages.length - 1] as AIMessage;

			if (lastMessage.tool_calls?.length) {
				return 'tools';
			}
			return '__end__';
		};

		// Custom tool executor that properly merges state updates
		const customToolExecutor = async (state: typeof WorkflowState.State) => {
			const lastMessage = state.messages.at(-1);
			if (!lastMessage || !isAIMessage(lastMessage) || !lastMessage.tool_calls?.length) {
				throw new Error('Most recent message must be an AIMessage with tool calls');
			}

			console.log(`Executing ${lastMessage.tool_calls.length} tools in parallel`);

			// Execute all tools in parallel
			const toolResults = await Promise.all(
				lastMessage.tool_calls.map(async (toolCall) => {
					const tool = toolMap.get(toolCall.name);
					if (!tool) {
						throw new Error(`Tool ${toolCall.name} not found`);
					}
					console.log(`Executing tool: ${toolCall.name}`);
					// Pass the tool call arguments and tool call ID in config
					const result = await (tool as any).invoke(toolCall.args, {
						toolCall: {
							id: toolCall.id,
						},
					});
					console.log(`Tool ${toolCall.name} completed`);
					return result;
				}),
			);

			// Separate Command objects from regular results
			const commands = toolResults.filter((result): result is Command => isCommand(result));
			const regularResults = toolResults.filter((result): result is any => !isCommand(result));

			// Extract state updates from Command objects
			const stateUpdates = commands.map((cmd: Command) => cmd.update).filter(Boolean);

			// Merge workflowJSON updates intelligently
			let mergedWorkflowJSON = state.workflowJSON;
			const allMessages = [];

			console.log(`Processing ${stateUpdates.length} state updates`);
			console.log(`Initial workflow has ${mergedWorkflowJSON.nodes.length} nodes`);

			// Process each state update
			for (let i = 0; i < stateUpdates.length; i++) {
				const update = stateUpdates[i] as Partial<typeof WorkflowState.State>;
				if (!update || typeof update !== 'object' || Array.isArray(update)) continue;

				// Collect messages
				if (update.messages && Array.isArray(update.messages)) {
					allMessages.push(...update.messages);
				}

				// Merge workflowJSON if present
				if (update.workflowJSON && typeof update.workflowJSON === 'object') {
					const beforeNodeCount = mergedWorkflowJSON.nodes.length;
					const beforeConnectionCount = Object.keys(mergedWorkflowJSON.connections).length;

					// Deep merge nodes
					// Start with existing nodes
					const nodeMap = new Map(mergedWorkflowJSON.nodes.map((node) => [node.id, node]));

					// Add new nodes from the update
					// Since each tool starts with the same initial state, we need to merge carefully
					if (update.workflowJSON.nodes && Array.isArray(update.workflowJSON.nodes)) {
						update.workflowJSON.nodes.forEach((node) => {
							const existingNode = nodeMap.get(node.id);
							if (!existingNode) {
								// This is a new node added by this tool
								nodeMap.set(node.id, node);
							} else {
								// Node exists - merge parameters if they've been updated
								// This handles the case where update-node-parameters runs in parallel
								console.log(`Merging node ${node.id} - updating parameters`);
								const mergedNode = {
									...existingNode,
									// Preserve all existing node properties
									...node,
									// Deep merge parameters
									parameters: {
										...existingNode.parameters,
										...node.parameters,
									},
								};
								nodeMap.set(node.id, mergedNode);
							}
						});
					}

					const mergedNodes = Array.from(nodeMap.values());

					// Deep merge connections
					const mergedConnections = this.deepMergeConnections(
						mergedWorkflowJSON.connections,
						update.workflowJSON.connections || {},
					);

					mergedWorkflowJSON = {
						nodes: mergedNodes,
						connections: mergedConnections,
					};

					console.log(
						`Update ${i + 1}: Added ${mergedNodes.length - beforeNodeCount} nodes, ` +
							`${Object.keys(mergedConnections).length - beforeConnectionCount} connection groups`,
					);
				}
			}

			console.log(`Final workflow has ${mergedWorkflowJSON.nodes.length} nodes`);
			console.log(
				`Final workflow has ${Object.keys(mergedWorkflowJSON.connections).length} connection groups`,
			);

			// Add any regular tool results as messages
			allMessages.push(...regularResults);

			// Return the merged state update
			return {
				messages: allMessages,
				workflowJSON: mergedWorkflowJSON,
			};
		};

		const workflow = new StateGraph(WorkflowState)
			.addNode('agent', callModel)
			.addEdge('__start__', 'agent')
			.addNode('tools', customToolExecutor)
			.addEdge('tools', 'agent')
			.addConditionalEdges('agent', shouldContinue);

		return workflow;
	}

	async *chat(
		payload: { question: string; currentWorkflowJSON?: string; workflowId?: string },
		user: IUser,
	) {
		const agent = (await this.getAgent(user)).compile({ checkpointer: this.checkpointer });

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
					PARALLEL TOOL EXECUTION (FOR PERFORMANCE):
					1. "search_nodes" and "get_node_details" can and SHOULD be called in parallel when gathering information about multiple node types
					2. "update_node_parameters" can be called in parallel AS LONG AS it's for different nodes
					3. Always batch information-gathering operations to minimize wait time

					PARAMETER UPDATES:
					1. Use "update_node_parameters" to modify existing node parameters based on natural language instructions
					2. You can update multiple nodes' parameters in parallel if they are different nodes
					3. If you have all the information needed, proceed directly with parameter updates without asking for confirmation
					4. The tool intelligently preserves existing parameters while applying only the requested changes

					PROACTIVE WORKFLOW DESIGN:
					When asked to generate a workflow, proactively think about and suggest:
					- Flow control nodes: IF nodes for conditional logic, Switch nodes for multiple branches
					- Data manipulation: Set nodes for transforming data, Code nodes for custom logic
					- Timing control: Schedule Trigger for recurring workflows, Wait nodes for delays
					- Error handling: Error Trigger nodes, Try-Catch patterns
					- Data aggregation: Merge nodes, Split In Batches for processing large datasets
					Don't wait to be asked - suggest these when they would improve the workflow!

					4. The "add_nodes" tool must be called sequentially, not in parallel, to ensure proper state management.

					WORKFLOW CREATION SEQUENCE:
					1. Search for nodes using "search_nodes" to find available node types (done in parallel)
					2. Call "get_node_details" for EACH node type to understand inputs/outputs (MANDATORY, done in parallel)
					5. Update node parameters using "update_node_parameters" for any nodes that need configuration (can be done in parallel)
					3. Add all nodes at once using "add_nodes" with an array
					4. Connect nodes using "connect_nodes"(done in parallel) based on the input/output information from step 2

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
			workflowJSON: payload.currentWorkflowJSON
				? JSON.parse(payload.currentWorkflowJSON)
				: { nodes: [], connections: {} },
			isWorkflowPrompt: false,
			next: 'PLAN',
		};

		const stream = await agent.stream(initialState, {
			...threadConfig,
			streamMode: ['updates', 'custom'],
			recursionLimit: 80,
		});

		for await (const [streamMode, chunk] of stream) {
			if (streamMode === 'updates') {
				// Handle final messages
				if ((chunk?.agent?.messages ?? [])?.length > 0) {
					const lastMessage = chunk.agent.messages[chunk.agent.messages.length - 1];
					if (lastMessage.content) {
						let content = lastMessage.content;

						if (Array.isArray(lastMessage.content)) {
							// @ts-ignore
							content = lastMessage.content
								.filter((c: any) => c.type === 'text')
								.map((b: any) => b.text)
								.join('\n');
						}
						const messageChunk = {
							role: 'assistant',
							type: 'message',
							text: content,
						};
						yield { messages: [messageChunk] };
					}
				}
			} else if (streamMode === 'custom') {
				// Handle custom tool updates
				if (chunk?.type === 'tool') {
					yield {
						messages: [chunk],
					};
					if (
						['add_nodes', 'connect_nodes', 'update_node_parameters'].includes(chunk.toolName) &&
						chunk.status === 'completed'
					) {
						const currentState = await agent.getState(threadConfig);
						// console.log('Updating WF', currentState);
						yield {
							messages: [
								{
									role: 'assistant',
									type: 'workflow-updated',
									codeSnippet: JSON.stringify(currentState.values.workflowJSON, null, 2),
								},
							],
						};
					}
				}
			}
		}
	}
}
