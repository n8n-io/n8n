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
import { mainAgentPrompt } from './tools/prompts/mainAgent.prompt';

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

		// this.llmComplexTask = await gpt41({
		// 	apiKey: process.env.N8N_AI_OPENAI_API_KEY ?? '',
		// });
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

			const prompt = await mainAgentPrompt.invoke(state);
			// @ts-ignore
			const response = await this.llmComplexTask.bindTools(tools).invoke(prompt);

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
			messages: [new HumanMessage({ content: payload.question })],
			prompt: payload.question,
			workflowJSON: payload.currentWorkflowJSON
				? JSON.parse(payload.currentWorkflowJSON)
				: { nodes: [], connections: {} },
			isWorkflowPrompt: false,
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
