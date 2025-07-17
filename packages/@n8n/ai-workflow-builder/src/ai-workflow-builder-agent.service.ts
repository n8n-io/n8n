import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { Client } from 'langsmith';
import { INodeTypes } from 'n8n-workflow';
import type { IUser, INodeTypeDescription, IRunExecutionData } from 'n8n-workflow';

import { anthropicClaudeSonnet4, gpt41mini } from './llm-config';
import { WorkflowBuilderAgent, type ChatPayload } from './workflow-builder-agent';

@Service()
export class AiWorkflowBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	private llmSimpleTask: BaseChatModel | undefined;

	private llmComplexTask: BaseChatModel | undefined;

	private tracingClient: Client | undefined;

	private checkpointer = new MemorySaver();

	private agent: WorkflowBuilderAgent | undefined;

	constructor(
		private readonly nodeTypes: INodeTypes,
		private readonly client?: AiAssistantClient,
		private readonly logger?: Logger,
	) {
		this.parsedNodeTypes = this.getNodeTypes();
	}

	private async setupModels(user?: IUser) {
		if (this.llmSimpleTask && this.llmComplexTask) {
			return;
		}

		// If client is provided, use it for API proxy
		if (this.client && user) {
			const authHeaders = await this.client.generateApiProxyCredentials(user);
			// Extract baseUrl from client configuration
			const baseUrl = this.client.getApiProxyBaseUrl();

			this.llmSimpleTask = await gpt41mini({
				baseUrl: baseUrl + '/openai',
				// When using api-proxy the key will be populated automatically, we just need to pass a placeholder
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});
			this.llmComplexTask = await anthropicClaudeSonnet4({
				baseUrl: baseUrl + '/anthropic',
				apiKey: '-',
				headers: {
					Authorization: authHeaders.apiKey,
				},
			});

			this.tracingClient = new Client({
				apiKey: '-',
				apiUrl: baseUrl + '/langsmith',
				autoBatchTracing: false,
				traceBatchConcurrency: 1,
				fetchOptions: {
					headers: {
						Authorization: authHeaders.apiKey,
					},
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
			headers: {
				'anthropic-beta': 'prompt-caching-2024-07-31',
			},
		});
	}

	private getNodeTypes(): INodeTypeDescription[] {
		// These types are ignored because they tend to cause issues when generating workflows
		const ignoredTypes = [
			'@n8n/n8n-nodes-langchain.toolVectorStore',
			'@n8n/n8n-nodes-langchain.documentGithubLoader',
			'@n8n/n8n-nodes-langchain.code',
		];
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());

		const nodeTypes = nodeTypesKeys
			.filter((nodeType) => !ignoredTypes.includes(nodeType))
			.map((nodeName) => {
				try {
					return { ...this.nodeTypes.getByNameAndVersion(nodeName).description, name: nodeName };
				} catch (error) {
					console.log('Error getting node type', 'nodeName:', nodeName, 'error:', error);
					return undefined;
				}
			})
			.filter(
				(nodeType): nodeType is INodeTypeDescription =>
					nodeType !== undefined && nodeType.hidden !== true,
			)
			.map((nodeType, _index, nodeTypes: INodeTypeDescription[]) => {
				// If the node type is a tool, we need to find the corresponding non-tool node type
				// and merge the two node types to get the full node type description.
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

	private async getAgent(user?: IUser) {
		if (!this.llmComplexTask || !this.llmSimpleTask) {
			await this.setupModels(user);
		}

		this.agent ??= new WorkflowBuilderAgent({
			parsedNodeTypes: this.parsedNodeTypes,
			llmSimpleTask: this.llmComplexTask!,
			llmComplexTask: this.llmComplexTask!,
			logger: this.logger,
			checkpointer: this.checkpointer,
			tracer: this.tracingClient
				? new LangChainTracer({ client: this.tracingClient, projectName: 'n8n-workflow-builder' })
				: undefined,
		});

		return this.agent;
	}

	async *chat(
		payload: {
			question: string;
			currentWorkflowJSON?: string;
			workflowId?: string;
			executionData?: IRunExecutionData['resultData'];
		},
		user?: IUser,
	) {
		const agent = await this.getAgent(user);

		const chatPayload: ChatPayload = {
			question: payload.question,
			currentWorkflowJSON: payload.currentWorkflowJSON,
			workflowId: payload.workflowId,
			executionData: payload.executionData,
		};

		for await (const output of agent.chat(chatPayload, user?.id?.toString())) {
			yield output;
		}
	}

	async getSessions(workflowId: string | undefined, user?: IUser) {
		const agent = await this.getAgent(user);
		return await agent.getSessions(workflowId, user?.id?.toString());
	}
}
