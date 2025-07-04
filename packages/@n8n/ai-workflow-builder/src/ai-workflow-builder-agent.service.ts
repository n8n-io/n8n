import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, INodeTypes } from 'n8n-workflow';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { ILicenseService } from './interfaces';
import { anthropicClaudeSonnet4, gpt41mini } from './llm-config';
import { createAddNodeTool } from './tools/add-node.tool';
import { createConnectNodesTool } from './tools/connect-nodes.tool';
import { createNodeDetailsTool } from './tools/node-details.tool';
import { createNodeSearchTool } from './tools/node-search.tool';
import { createRemoveNodeTool } from './tools/remove-node.tool';
import { createUpdateNodeParametersTool } from './tools/update-node-parameters.tool';
import { WorkflowState } from './workflow-state';
import { mainAgentPrompt } from './tools/prompts/mainAgent.prompt';
import { executeToolsInParallel } from './utils/tool-executor';

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
			createRemoveNodeTool(this.parsedNodeTypes),
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

		// Use the new tool executor helper
		const customToolExecutor = async (state: typeof WorkflowState.State) => {
			return executeToolsInParallel({ state, toolMap });
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
						['add_nodes', 'connect_nodes', 'update_node_parameters', 'remove_node'].includes(
							chunk.toolName,
						) &&
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
