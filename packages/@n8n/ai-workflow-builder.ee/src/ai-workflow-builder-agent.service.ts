import { ChatAnthropic } from '@langchain/anthropic';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { AiAssistantClient, AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import assert from 'assert';
import { Client as TracingClient } from 'langsmith';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { LLMServiceError } from '@/errors';
import { anthropicClaudeSonnet45 } from '@/llm-config';
import { SessionManagerService } from '@/session-manager.service';
import { WorkflowBuilderAgent, type ChatPayload } from '@/workflow-builder-agent';

type OnCreditsUpdated = (userId: string, creditsQuota: number, creditsClaimed: number) => void;

@Service()
export class AiWorkflowBuilderService {
	private readonly parsedNodeTypes: INodeTypeDescription[];
	private sessionManager: SessionManagerService;

	constructor(
		parsedNodeTypes: INodeTypeDescription[],
		private readonly client?: AiAssistantClient,
		private readonly logger?: Logger,
		private readonly instanceUrl?: string,
		private readonly onCreditsUpdated?: OnCreditsUpdated,
	) {
		this.parsedNodeTypes = this.filterNodeTypes(parsedNodeTypes);
		this.sessionManager = new SessionManagerService(this.parsedNodeTypes, logger);
	}

	private static async getAnthropicClaudeModel({
		baseUrl,
		authHeaders = {},
		apiKey = '-',
	}: {
		baseUrl?: string;
		authHeaders?: Record<string, string>;
		apiKey?: string;
	} = {}): Promise<ChatAnthropic> {
		return await anthropicClaudeSonnet45({
			baseUrl,
			apiKey,
			headers: {
				...authHeaders,
				'anthropic-beta': 'prompt-caching-2024-07-31',
			},
		});
	}

	private async getApiProxyAuthHeaders(user: IUser) {
		assert(this.client);

		const authResponse = await this.client.getBuilderApiProxyToken(user);
		const authHeaders = {
			Authorization: `${authResponse.tokenType} ${authResponse.accessToken}`,
		};

		return authHeaders;
	}

	private async setupModels(user: IUser): Promise<{
		anthropicClaude: ChatAnthropic;
		tracingClient?: TracingClient;
		authHeaders?: { Authorization: string };
	}> {
		try {
			// If client is provided, use it for API proxy
			if (this.client) {
				const authHeaders = await this.getApiProxyAuthHeaders(user);

				// Extract baseUrl from client configuration
				const baseUrl = this.client.getApiProxyBaseUrl();

				const anthropicClaude = await AiWorkflowBuilderService.getAnthropicClaudeModel({
					baseUrl: baseUrl + '/anthropic',
					authHeaders,
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

				return { tracingClient, anthropicClaude, authHeaders };
			}

			// If base URL is not set, use environment variables
			const anthropicClaude = await AiWorkflowBuilderService.getAnthropicClaudeModel({
				apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '',
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

	private filterNodeTypes(nodeTypes: INodeTypeDescription[]): INodeTypeDescription[] {
		// These types are ignored because they tend to cause issues when generating workflows
		const ignoredTypes = new Set([
			'@n8n/n8n-nodes-langchain.toolVectorStore',
			'@n8n/n8n-nodes-langchain.documentGithubLoader',
			'@n8n/n8n-nodes-langchain.code',
		]);

		const visibleNodeTypes = nodeTypes.filter(
			(nodeType) =>
				// We filter out hidden nodes, except for the Data Table node which has custom hiding logic
				// See more details in DataTable.node.ts#L29
				!ignoredTypes.has(nodeType.name) &&
				(nodeType.hidden !== true || nodeType.name === 'n8n-nodes-base.dataTable'),
		);

		return visibleNodeTypes.map((nodeType) => {
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
	}

	private async getAgent(user: IUser) {
		const { anthropicClaude, tracingClient, authHeaders } = await this.setupModels(user);

		const agent = new WorkflowBuilderAgent({
			parsedNodeTypes: this.parsedNodeTypes,
			// We use Sonnet both for simple and complex tasks
			llmSimpleTask: anthropicClaude,
			llmComplexTask: anthropicClaude,
			logger: this.logger,
			checkpointer: this.sessionManager.getCheckpointer(),
			tracer: tracingClient
				? new LangChainTracer({ client: tracingClient, projectName: 'n8n-workflow-builder' })
				: undefined,
			instanceUrl: this.instanceUrl,
			onGenerationSuccess: async () => {
				await this.onGenerationSuccess(user, authHeaders);
			},
		});

		return agent;
	}

	private async onGenerationSuccess(
		user?: IUser,
		authHeaders?: { Authorization: string },
	): Promise<void> {
		try {
			if (this.client) {
				assert(authHeaders, 'Auth headers must be set when AI Assistant Service client is used');
				assert(user);
				const creditsInfo = await this.client.markBuilderSuccess(user, authHeaders);

				// Call the callback with the credits info from the response
				if (this.onCreditsUpdated && user.id && creditsInfo) {
					this.onCreditsUpdated(user.id, creditsInfo.creditsQuota, creditsInfo.creditsClaimed);
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger?.error(`Unable to mark generation success ${error.message}`, { error });
			}
		}
	}

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		const agent = await this.getAgent(user);

		for await (const output of agent.chat(payload, user?.id?.toString(), abortSignal)) {
			yield output;
		}
	}

	async getSessions(workflowId: string | undefined, user?: IUser) {
		const userId = user?.id?.toString();
		return await this.sessionManager.getSessions(workflowId, userId);
	}

	async getBuilderInstanceCredits(
		user: IUser,
	): Promise<AiAssistantSDK.BuilderInstanceCreditsResponse> {
		if (this.client) {
			return await this.client.getBuilderInstanceCredits(user);
		}

		// if using env variables directly instead of ai proxy service
		return {
			creditsQuota: -1,
			creditsClaimed: 0,
		};
	}
}
