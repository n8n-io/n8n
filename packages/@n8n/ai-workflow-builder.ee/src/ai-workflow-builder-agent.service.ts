import { ChatAnthropic } from '@langchain/anthropic';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { MemorySaver } from '@langchain/langgraph';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import assert from 'assert';
import { Client as TracingClient } from 'langsmith';
import { INodeTypes } from 'n8n-workflow';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from './errors';
import { anthropicClaudeSonnet4 } from './llm-config';
import { WorkflowBuilderAgent, type ChatPayload } from './workflow-builder-agent';

@Service()
export class AiWorkflowBuilderService {
	private parsedNodeTypes: INodeTypeDescription[] = [];

	private checkpointer = new MemorySaver();

	constructor(
		private readonly nodeTypes: INodeTypes,
		private readonly client?: AiAssistantClient,
		private readonly logger?: Logger,
		private readonly instanceUrl?: string,
	) {
		this.parsedNodeTypes = this.getNodeTypes();
	}

	private async getApiProxyAuthHeaders(
		user: IUser,
		requiresUpdatedCredentials = false,
		useDeprecatedCredentials = false,
	) {
		if (!requiresUpdatedCredentials) {
			return {
				Authorization: '',
			};
		}

		assert(this.client);

		let authHeaders: { Authorization: string };

		if (useDeprecatedCredentials) {
			const authResponse = await this.client.generateApiProxyCredentials(user);
			authHeaders = { Authorization: authResponse.apiKey };
		} else {
			const authResponse = await this.client.getBuilderApiProxyToken(user);
			authHeaders = {
				Authorization: `${authResponse.tokenType} ${authResponse.accessToken}`,
			};
		}

		return authHeaders;
	}

	private async setupModels(
		user?: IUser,
		requiresUpdatedCredentials = false,
		useDeprecatedCredentials = false,
	): Promise<{ anthropicClaude: ChatAnthropic; tracingClient?: TracingClient }> {
		try {
			// If client is provided, use it for API proxy
			if (this.client && user) {
				const authHeaders = await this.getApiProxyAuthHeaders(
					user,
					requiresUpdatedCredentials,
					useDeprecatedCredentials,
				);

				// Extract baseUrl from client configuration
				const baseUrl = this.client.getApiProxyBaseUrl();

				const chatModel = await anthropicClaudeSonnet4({
					baseUrl: baseUrl + '/anthropic',
					apiKey: '-',
					headers: {
						...authHeaders,
						'anthropic-beta': 'prompt-caching-2024-07-31',
					},
				});

				const tracingClient = new TracingClient({
					apiKey: '-',
					apiUrl: baseUrl + '/langsmith',
					autoBatchTracing: false,
					traceBatchConcurrency: 1,
					fetchOptions: {
						headers: {
							...authHeaders,
						},
					},
				});

				return { tracingClient, anthropicClaude: chatModel };
			}

			// If base URL is not set, use environment variables
			const anthropicClaude = await anthropicClaudeSonnet4({
				apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
				headers: {
					'anthropic-beta': 'prompt-caching-2024-07-31',
				},
			});

			return { anthropicClaude };
		} catch (error) {
			const errorMessage = error instanceof Error ? `: ${error.message}` : '';
			const llmError = new LLMServiceError(`Failed to connect to LLM Provider${errorMessage}`, {
				cause: error,
				tags: {
					hasClient: !!this.client,
					hasUser: !!user,
				},
			});
			throw llmError;
		}
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
					this.logger?.error('Error getting node type', {
						nodeName,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
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

	private async getAgent(
		user?: IUser,
		requiresUpdatedCredentials = false,
		useDeprecatedCredentials = false,
	) {
		const { anthropicClaude, tracingClient } = await this.setupModels(
			user,
			requiresUpdatedCredentials,
			useDeprecatedCredentials,
		);

		if (!anthropicClaude) {
			throw new LLMServiceError('Failed to initialize LLM models');
		}

		const agent = new WorkflowBuilderAgent({
			parsedNodeTypes: this.parsedNodeTypes,
			// We use Sonnet both for simple and complex tasks
			llmSimpleTask: anthropicClaude,
			llmComplexTask: anthropicClaude,
			logger: this.logger,
			checkpointer: this.checkpointer,
			tracer: tracingClient
				? new LangChainTracer({ client: tracingClient, projectName: 'n8n-workflow-builder' })
				: undefined,
			instanceUrl: this.instanceUrl,
			// onGenerationSuccess: () => {
			// 	void this.client?.markBuilderSuccess()
			// },
		});

		return agent;
	}

	async *chat(payload: ChatPayload, user?: IUser, abortSignal?: AbortSignal) {
		const agent = await this.getAgent(user, true, payload.useDeprecatedCredentials);

		for await (const output of agent.chat(payload, user?.id?.toString(), abortSignal)) {
			yield output;
		}
	}

	async getSessions(workflowId: string | undefined, user?: IUser) {
		const agent = await this.getAgent(user, false);
		return await agent.getSessions(workflowId, user?.id?.toString());
	}
}
