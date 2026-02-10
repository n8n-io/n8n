import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { AiAssistantClient, AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import assert from 'assert';
import { Client as TracingClient } from 'langsmith';
import type { IUser, INodeTypeDescription, ITelemetryTrackProperties } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';
import { anthropicClaudeSonnet45, anthropicClaudeSonnet45Think } from '@/llm-config';
import { SessionManagerService } from '@/session-manager.service';
import { ResourceLocatorCallbackFactory } from '@/types/callbacks';
import type { HITLInterruptValue } from '@/types/planning';
import {
	BuilderFeatureFlags,
	WorkflowBuilderAgent,
	type ChatPayload,
} from '@/workflow-builder-agent';

type OnCreditsUpdated = (userId: string, creditsQuota: number, creditsClaimed: number) => void;

type OnTelemetryEvent = (event: string, properties: ITelemetryTrackProperties) => void;

@Service()
export class AiWorkflowBuilderService {
	private nodeTypes: INodeTypeDescription[];

	private sessionManager: SessionManagerService;

	constructor(
		parsedNodeTypes: INodeTypeDescription[],
		private readonly client?: AiAssistantClient,
		private readonly logger?: Logger,
		private readonly instanceId?: string,
		private readonly instanceUrl?: string,
		private readonly n8nVersion?: string,
		private readonly onCreditsUpdated?: OnCreditsUpdated,
		private readonly onTelemetryEvent?: OnTelemetryEvent,
		private readonly nodeDefinitionDirs?: string[],
		private readonly resourceLocatorCallbackFactory?: ResourceLocatorCallbackFactory,
	) {
		this.nodeTypes = this.filterNodeTypes(parsedNodeTypes);
		this.sessionManager = new SessionManagerService(this.nodeTypes, logger);
	}

	/**
	 * Update the node types available to the AI workflow builder.
	 * Called when community packages are installed, updated, or uninstalled.
	 * This preserves existing sessions while making new node types available.
	 */
	updateNodeTypes(nodeTypes: INodeTypeDescription[]) {
		this.nodeTypes = this.filterNodeTypes(nodeTypes);
		this.sessionManager.updateNodeTypes(this.nodeTypes);
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
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'anthropic-beta': 'prompt-caching-2024-07-31',
			},
		});
	}

	private static async getAnthropicClaudeThinkModel({
		baseUrl,
		authHeaders = {},
		apiKey = '-',
	}: {
		baseUrl?: string;
		authHeaders?: Record<string, string>;
		apiKey?: string;
	} = {}): Promise<ChatAnthropic> {
		return await anthropicClaudeSonnet45Think({
			baseUrl,
			apiKey,
			headers: {
				...authHeaders,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'anthropic-beta': 'prompt-caching-2024-07-31',
			},
		});
	}

	private async getApiProxyAuthHeaders(user: IUser, userMessageId: string) {
		assert(this.client);

		const authResponse = await this.client.getBuilderApiProxyToken(user, { userMessageId });
		const authHeaders = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: `${authResponse.tokenType} ${authResponse.accessToken}`,
		};

		return authHeaders;
	}

	private async setupModels(
		user: IUser,
		userMessageId: string,
	): Promise<{
		anthropicClaude: ChatAnthropic;
		anthropicClaudeThink: ChatAnthropic;
		tracingClient?: TracingClient;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		authHeaders?: { Authorization: string };
	}> {
		try {
			// If client is provided, use it for API proxy
			if (this.client) {
				const authHeaders = await this.getApiProxyAuthHeaders(user, userMessageId);

				// Extract baseUrl from client configuration
				const baseUrl = this.client.getApiProxyBaseUrl();

				const modelConfig = {
					baseUrl: baseUrl + '/anthropic',
					authHeaders,
				};

				const anthropicClaude = await AiWorkflowBuilderService.getAnthropicClaudeModel(modelConfig);
				const anthropicClaudeThink =
					await AiWorkflowBuilderService.getAnthropicClaudeThinkModel(modelConfig);

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

				return { tracingClient, anthropicClaude, anthropicClaudeThink, authHeaders };
			}

			// If base URL is not set, use environment variables
			const envConfig = { apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? '' };
			const anthropicClaude = await AiWorkflowBuilderService.getAnthropicClaudeModel(envConfig);
			const anthropicClaudeThink =
				await AiWorkflowBuilderService.getAnthropicClaudeThinkModel(envConfig);

			return { anthropicClaude, anthropicClaudeThink };
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

	private async getAgent(user: IUser, userMessageId: string, featureFlags?: BuilderFeatureFlags) {
		const { anthropicClaude, anthropicClaudeThink, tracingClient, authHeaders } =
			await this.setupModels(user, userMessageId);

		// Create resource locator callback scoped to this user if factory is provided
		const resourceLocatorCallback = this.resourceLocatorCallbackFactory?.(user.id);

		const agent = new WorkflowBuilderAgent({
			parsedNodeTypes: this.nodeTypes,
			// Use the same model for all stages in production
			// When code builder is enabled, use thinking model for the builder stage
			stageLLMs: {
				supervisor: anthropicClaude,
				responder: anthropicClaude,
				discovery: anthropicClaude,
				builder: featureFlags?.codeBuilder ? anthropicClaudeThink : anthropicClaude,
				parameterUpdater: anthropicClaude,
				planner: anthropicClaude,
			},
			logger: this.logger,
			checkpointer: this.sessionManager.getCheckpointer(),
			tracer: tracingClient
				? new LangChainTracer({
						client: tracingClient,
						projectName: featureFlags?.codeBuilder
							? 'code-workflow-builder'
							: 'n8n-workflow-builder',
					})
				: undefined,
			instanceUrl: this.instanceUrl,
			runMetadata: {
				n8nVersion: this.n8nVersion,
				featureFlags: featureFlags ?? {},
			},
			onGenerationSuccess: async () => await this.onGenerationSuccess(user, authHeaders),
			nodeDefinitionDirs: this.nodeDefinitionDirs,
			resourceLocatorCallback,
			onTelemetryEvent: this.onTelemetryEvent,
		});

		return { agent };
	}

	private async onGenerationSuccess(
		user?: IUser,
		// eslint-disable-next-line @typescript-eslint/naming-convention
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
		const { agent } = await this.getAgent(user, payload.id, payload.featureFlags);
		const userId = user?.id?.toString();
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const isCodeBuilder = payload.featureFlags?.codeBuilder ?? false;

		const threadId = SessionManagerService.generateThreadId(workflowId, userId);

		const pendingHitl = payload.resumeData
			? this.sessionManager.getAndClearPendingHitl(threadId)
			: undefined;

		// Store HITL interactions for session replay.
		// Command.update messages don't persist when a subgraph node interrupts multiple times.
		if (pendingHitl && payload.resumeData) {
			this.storeHitlInteraction(threadId, pendingHitl, payload.resumeData);
		}

		const resumeInterrupt = pendingHitl?.value;
		const agentPayload = resumeInterrupt ? { ...payload, resumeInterrupt } : payload;

		for await (const output of agent.chat(agentPayload, userId, abortSignal)) {
			const streamHitl = this.extractHitlFromStreamOutput(output);
			if (streamHitl) {
				this.sessionManager.setPendingHitl(threadId, streamHitl, payload.id);
			}

			yield output;
		}

		// Track telemetry after stream completes (onGenerationSuccess is called by the agent)
		if (this.onTelemetryEvent && userId) {
			try {
				await this.trackBuilderReplyTelemetry(agent, workflowId, userId, payload.id, isCodeBuilder);
			} catch (error) {
				this.logger?.error('Failed to track builder reply telemetry', { error });
			}
		}
	}

	private storeHitlInteraction(
		threadId: string,
		pendingHitl: { value: HITLInterruptValue; triggeringMessageId?: string },
		resumeData: unknown,
	): void {
		if (pendingHitl.value.type === 'questions') {
			this.sessionManager.addHitlEntry(threadId, {
				type: 'questions_answered',
				afterMessageId: pendingHitl.triggeringMessageId,
				interrupt: pendingHitl.value,
				answers: resumeData,
			});
		} else if (pendingHitl.value.type === 'plan') {
			const decision = resumeData as { action?: string; feedback?: string };
			// Only store non-approve decisions; approved plans survive in the checkpoint
			if (decision.action === 'reject' || decision.action === 'modify') {
				this.sessionManager.addHitlEntry(threadId, {
					type: 'plan_decided',
					afterMessageId: pendingHitl.triggeringMessageId,
					plan: pendingHitl.value.plan,
					decision: decision.action,
					feedback: decision.feedback,
				});
			}
		}
	}

	private extractLastAiMessageContent(messages: BaseMessage[]): string {
		const lastAiMessage = messages.findLast(
			(m: BaseMessage): m is AIMessage => m instanceof AIMessage,
		);
		return typeof lastAiMessage?.content === 'string'
			? lastAiMessage.content
			: JSON.stringify(lastAiMessage?.content ?? '');
	}

	private extractUniqueToolNames(messages: BaseMessage[]): string[] {
		const toolMessages = messages.filter(
			(m: BaseMessage): m is ToolMessage => m instanceof ToolMessage,
		);
		return [
			...new Set(
				toolMessages
					.map((m: ToolMessage) => m.name)
					.filter((name: string | undefined): name is string => name !== undefined),
			),
		];
	}

	private async trackBuilderReplyTelemetry(
		agent: WorkflowBuilderAgent,
		workflowId: string | undefined,
		userId: string,
		userMessageId: string,
		isCodeBuilder: boolean,
	): Promise<void> {
		if (!this.onTelemetryEvent) return;

		const state = await agent.getState(workflowId, userId);
		const threadId = SessionManagerService.generateThreadId(workflowId, userId);
		const messages = state?.values?.messages ?? [];

		const properties: ITelemetryTrackProperties = {
			user_id: userId,
			instance_id: this.instanceId,
			workflow_id: workflowId,
			sequence_id: threadId,
			message_ai: this.extractLastAiMessageContent(messages),
			tools_called: this.extractUniqueToolNames(messages),
			techniques_categories: state?.values?.techniqueCategories,
			validations: state?.values?.validationHistory,
			...((state?.values?.templateIds?.length ?? 0) > 0 && {
				templates_selected: state.values.templateIds,
			}),
			user_message_id: userMessageId,
			code_builder: isCodeBuilder,
		};

		this.onTelemetryEvent('Builder replied to user message', properties);
	}

	async getSessions(workflowId: string | undefined, user?: IUser, codeBuilder?: boolean) {
		const userId = user?.id?.toString();
		const agentType = codeBuilder ? 'code-builder' : undefined;
		return await this.sessionManager.getSessions(workflowId, userId, agentType);
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

	/**
	 * Truncate all messages including and after the message with the specified messageId
	 * Used when restoring to a previous version
	 */
	async truncateMessagesAfter(
		workflowId: string,
		user: IUser,
		messageId: string,
		codeBuilder?: boolean,
	): Promise<boolean> {
		const agentType = codeBuilder ? 'code-builder' : undefined;
		return await this.sessionManager.truncateMessagesAfter(
			workflowId,
			user.id,
			messageId,
			agentType,
		);
	}

	private static readonly questionsInterruptSchema = z.object({
		type: z.literal('questions'),
		introMessage: z.string().optional(),
		questions: z.array(
			z.object({
				id: z.string(),
				question: z.string(),
				type: z.enum(['single', 'multi', 'text']),
				options: z.array(z.string()).optional(),
			}),
		),
	});

	private static readonly planInterruptSchema = z.object({
		type: z.literal('plan'),
		plan: z.object({
			summary: z.string(),
			trigger: z.string(),
			steps: z.array(
				z.object({
					description: z.string(),
					subSteps: z.array(z.string()).optional(),
					suggestedNodes: z.array(z.string()).optional(),
				}),
			),
			additionalSpecs: z.array(z.string()).optional(),
		}),
	});

	private extractHitlFromStreamOutput(output: unknown): HITLInterruptValue | null {
		if (typeof output !== 'object' || output === null) return null;
		if (!('messages' in output)) return null;

		const messages = (output as { messages?: unknown }).messages;
		if (!Array.isArray(messages)) return null;

		for (const message of messages) {
			if (typeof message !== 'object' || message === null) continue;
			const m = message as Record<string, unknown>;

			if (m.type === 'questions') {
				const parsed = AiWorkflowBuilderService.questionsInterruptSchema.safeParse(m);
				if (parsed.success) return parsed.data;
				this.logger?.warn('[HITL] Invalid questions interrupt data', {
					errors: parsed.error.errors,
				});
				continue;
			}

			if (m.type === 'plan') {
				const parsed = AiWorkflowBuilderService.planInterruptSchema.safeParse(m);
				if (parsed.success) return parsed.data;
				this.logger?.warn('[HITL] Invalid plan interrupt data', {
					errors: parsed.error.errors,
				});
				continue;
			}
		}

		return null;
	}
}
