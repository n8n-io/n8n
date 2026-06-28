import type { AgentMessage, StreamChunk } from '@n8n/agents';
import { Container } from '@n8n/di';
import type { Author, Chat, Message, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { integrationMemoryResourceId } from '../utils/agent-memory-scope';
import type {
	AgentChatIntegration,
	BridgeExecutionContext,
	PlatformAgentContext,
} from './agent-chat-integration';
import { ChatIntegrationRegistry } from './agent-chat-integration';
import { AgentChatHitlResumeHandler } from './agent-chat-hitl-resume-handler';
import { AgentChatMessageContextBridge } from './agent-chat-message-context';
import { AgentChatStreamConsumer } from './agent-chat-stream-consumer';
import { buildSuspendCardPayload } from './agent-chat-suspension-cards';
import { CallbackStore } from './callback-store';
import type { ComponentMapper, ShortenCallback } from './component-mapper';
import { IntegrationMessageContextService } from './integration-message-context.service';
import type { AgentIntegrationConfig } from '@n8n/api-types';

import { type InternalThread, toInternalThreadId } from './types';

interface AgentExecutor {
	executeForChatPublished(config: {
		agentId: string;
		projectId: string;
		message: string;
		memory: { threadId: InternalThread; resourceId: string };
		integrationType?: string;
	}): AsyncGenerator<StreamChunk>;

	resumeForChat(config: {
		agentId: string;
		projectId: string;
		runId: string;
		toolCallId: string;
		resumeData: unknown;
		integrationType?: string;
	}): AsyncGenerator<StreamChunk>;
}

/**
 * Bridges Chat SDK events to the agent execution pipeline.
 *
 * Registers three handlers on a Chat SDK `Bot` instance:
 * 1. `onNewMention` — new @mentions and DMs → subscribe + execute
 * 2. `onSubscribedMessage` — follow-up messages in subscribed threads
 * 3. `onAction` — button clicks for HITL resume flow
 *
 * Stream consumption has two strategies, selected per integration via the
 * `disableStreaming` flag on `AgentChatIntegration`:
 *   • streaming (default, e.g. Slack): text deltas are piped as an
 *     AsyncIterable<string> into `thread.post()` so Chat SDK can render
 *     incrementally (post-and-edit).
 *   • buffered (Telegram): deltas accumulate into a string and are posted as
 *     a single message per flush event, so the platform adapter only ever
 *     sees well-formed Markdown (streaming edits ship half-formed markup).
 *
 * In both strategies, non-text chunks (`tool-call-suspended`, `message`,
 * `error`) flush any pending text before being handled, preserving ordering.
 */
export class AgentChatBridge {
	/** Store for shortening callback data on platforms with size limits (Telegram) */
	private readonly callbackStore?: CallbackStore;

	/** Resolved integration for this platform (may be undefined for unknown types). */
	private readonly integrationImpl: AgentChatIntegration | undefined;

	private readonly messageContextBridge: AgentChatMessageContextBridge;

	private readonly streamConsumer: AgentChatStreamConsumer;

	private readonly hitlResumeHandler: AgentChatHitlResumeHandler;

	constructor(
		private readonly chat: Chat,
		private readonly agentId: string,
		private readonly agentService: AgentExecutor,
		private readonly componentMapper: ComponentMapper,
		private readonly logger: Logger,
		private readonly n8nProjectId: string,
		private readonly integration: AgentIntegrationConfig,
		messageContextStore?: IntegrationMessageContextService,
	) {
		this.integrationImpl = Container.get(ChatIntegrationRegistry).get(integration.type);
		this.messageContextBridge = new AgentChatMessageContextBridge(
			messageContextStore,
			integration,
			agentId,
			logger,
		);
		if (this.integrationImpl?.needsShortCallbackData) {
			this.callbackStore = new CallbackStore();
		}
		const disableStreaming = this.integrationImpl?.disableStreaming ?? false;
		this.streamConsumer = new AgentChatStreamConsumer({
			disableStreaming,
			logger: this.logger,
			postErrorToThread: this.postErrorToThread.bind(this),
			handleSuspension: this.handleSuspension.bind(this),
			handleMessage: this.handleMessage.bind(this),
		});
		this.hitlResumeHandler = new AgentChatHitlResumeHandler({
			agentId,
			projectId: n8nProjectId,
			integration,
			agentService,
			logger,
			callbackStore: this.callbackStore,
			resolvePlatformThreadId: this.resolvePlatformThreadId.bind(this),
			toAgentThreadId: this.toAgentThreadId.bind(this),
			getPlatformAgentContext: this.getPlatformAgentContext.bind(this),
			messageContextBridge: this.messageContextBridge,
			streamConsumer: this.streamConsumer,
			createResumeExecutionContext: async (thread) => {
				const params = {
					chat: this.chat,
					thread,
					logger: this.logger,
					agentId: this.agentId,
				};
				const resumeExecutionContext =
					await this.integrationImpl?.createResumeExecutionContext?.(params);
				if (resumeExecutionContext) return resumeExecutionContext;
				return {};
			},
		});
		this.registerHandlers();
	}

	// ---------------------------------------------------------------------------
	// Static factory
	// ---------------------------------------------------------------------------

	static create(
		chat: Chat,
		agentId: string,
		agentService: AgentExecutionOrchestratorService,
		componentMapper: ComponentMapper,
		logger: Logger,
		n8nProjectId: string,
		integration: AgentIntegrationConfig,
	): AgentChatBridge {
		const agentExecutor: AgentExecutor = {
			async *executeForChatPublished({ memory, agentId: aid, message, integrationType }) {
				yield* agentService.executeForChatPublished({
					agentId: aid,
					projectId: n8nProjectId,
					message,
					memory: {
						threadId: memory.threadId.id,
						resourceId: memory.resourceId,
						...(memory.resourceId !== undefined && {
							resourceId: memory.resourceId,
						}),
					},
					integrationType,
				});
			},
			async *resumeForChat(config) {
				yield* agentService.resumeForChat(config);
			},
		};
		return new AgentChatBridge(
			chat,
			agentId,
			agentExecutor,
			componentMapper,
			logger,
			n8nProjectId,
			integration,
			Container.get(IntegrationMessageContextService),
		);
	}

	// ---------------------------------------------------------------------------
	// Handler registration
	// ---------------------------------------------------------------------------

	private registerHandlers(): void {
		this.chat.onNewMention(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				await thread.subscribe();
				await this.executeAndStream(thread, message);
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.chat.onSubscribedMessage(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				await this.executeAndStream(thread, message);
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.chat.onAction(async (event) => {
			try {
				if (!this.canUserAccess(event.user)) return;
				await this.hitlResumeHandler.handleAction(event);
			} catch (error) {
				await this.postErrorToThread(event.thread, error);
			}
		});
	}

	/** Release long-lived resources (callback store timer). */
	dispose(): void {
		this.callbackStore?.dispose();
	}

	private canUserAccess(author: Author): boolean {
		return this.integrationImpl?.isUserAllowed?.(author, this.integration) ?? true;
	}

	// ---------------------------------------------------------------------------
	// Thread ID resolution — single place to apply per-platform formatting
	// ---------------------------------------------------------------------------

	private resolvePlatformThreadId(thread: Thread<unknown, unknown>) {
		return this.integrationImpl?.formatThreadId?.fromSdk(thread) ?? thread.id;
	}

	private toAgentThreadId(platformThreadId: string) {
		return toInternalThreadId(`${this.agentId}:${platformThreadId}`);
	}

	/**
	 * Returns a callback shortener function for platforms with short callback
	 * data limits (Telegram). Returns undefined for other platforms.
	 */
	getShortenCallback(): ShortenCallback | undefined {
		if (!this.callbackStore) return undefined;
		const store = this.callbackStore;
		return async (actionId: string, value: string) => {
			const key = await store.store(actionId, value);
			return { id: key, value: '' };
		};
	}

	// ---------------------------------------------------------------------------
	// Core execution pipeline
	// ---------------------------------------------------------------------------

	private async executeAndStream(thread: Thread, message: Message): Promise<void> {
		const platformAgentContext = this.getPlatformAgentContext();
		const text = this.prepareInboundText(message.text, platformAgentContext).trim();
		if (!text) return;

		const platformThreadId = this.resolvePlatformThreadId(thread);
		const threadId = this.toAgentThreadId(platformThreadId);
		const statusRetry = new AbortController();
		// Platform status hooks and the lazy
		// `message.subject` fetch are both remote round-trips on independent
		// resources — run them concurrently.
		const [bridgeExecutionContext, subject] = await Promise.all([
			this.resolveBridgeExecutionContext(thread, message, platformAgentContext, statusRetry),
			this.messageContextBridge.resolveSubject(message),
		]);
		await this.messageContextBridge.updateLatest(threadId.id, message.author.userId, thread, {
			messageId: message.id,
			interactingUserId: message.author.userId,
			...bridgeExecutionContext.platformAgentContext,
			subject,
		});
		// threadId.id is agent-prefixed for observation storage; resourceId keeps
		// the platform user identity so episodic recall works across threads for
		// the same user while staying isolated between users.
		// Always run the published snapshot — integrations are production traffic.
		const stream = this.agentService.executeForChatPublished({
			agentId: this.agentId,
			projectId: this.n8nProjectId,
			message: text,
			memory: {
				threadId,
				resourceId: integrationMemoryResourceId(this.integration.type, message.author.userId),
			},
			integrationType: this.integration.type,
		});

		try {
			await this.streamConsumer.consume(stream, thread, {
				forceBuffered: bridgeExecutionContext.forceBuffered,
				statusHandle: bridgeExecutionContext.statusHandle,
			});
		} finally {
			statusRetry.abort();
		}
	}

	private async resolveBridgeExecutionContext(
		thread: Thread<unknown, unknown>,
		message: Message<unknown>,
		platformAgentContext: PlatformAgentContext,
		statusRetry: AbortController,
	): Promise<BridgeExecutionContext> {
		return (
			(await this.integrationImpl?.createBridgeExecutionContext?.({
				chat: this.chat,
				thread,
				message,
				logger: this.logger,
				agentId: this.agentId,
				statusRetry,
			})) ?? { platformAgentContext }
		);
	}

	// ---------------------------------------------------------------------------
	// Suspension handling (HITL tool cards)
	// ---------------------------------------------------------------------------

	private async handleSuspension(
		chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
		thread: Thread,
	): Promise<void> {
		const { runId, toolCallId, suspendPayload } = chunk;

		if (!runId || !toolCallId) {
			this.logger.warn('[AgentChatBridge] Suspended chunk missing runId or toolCallId');
			return;
		}

		const cardPayload = buildSuspendCardPayload(suspendPayload);
		if (!cardPayload) return;

		try {
			const card = await this.componentMapper.toCard(
				cardPayload,
				runId,
				toolCallId,
				chunk.resumeSchema,
				this.getShortenCallback(),
				this.integration.type,
			);
			await thread.post({ card });
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post suspension card', {
				agentId: this.agentId,
				runId,
				toolCallId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// ---------------------------------------------------------------------------
	// Custom message handling (tool toMessage output)
	// ---------------------------------------------------------------------------

	private async handleMessage(
		chunk: Extract<StreamChunk, { type: 'message' }>,
		thread: Thread,
	): Promise<void> {
		const agentMessage: AgentMessage = chunk.message;

		// AgentMessage is a union. LLM messages (Message) have a `content` array
		// of typed content parts. Extract only text parts for display.
		if (!('content' in agentMessage) || !Array.isArray(agentMessage.content)) return;

		const textParts = agentMessage.content
			.filter(
				(part): part is { type: 'text'; text: string } => part.type === 'text' && 'text' in part,
			)
			.map((part) => part.text);

		const textToPost = textParts.join('');

		// Skip messages with no displayable text (e.g. tool-call-only messages)
		if (!textToPost.trim()) return;

		try {
			await thread.post(textToPost);
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post message chunk', {
				agentId: this.agentId,
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private getPlatformAgentContext(): PlatformAgentContext {
		return this.integrationImpl?.getPlatformAgentContext?.(this.chat) ?? {};
	}

	private prepareInboundText(text: string | undefined, context: PlatformAgentContext): string {
		const trimmed = text?.trim() ?? '';
		return this.integrationImpl?.prepareInboundText?.(trimmed, context) ?? trimmed;
	}

	// ---------------------------------------------------------------------------
	// Error posting
	// ---------------------------------------------------------------------------

	private async postErrorToThread(
		thread: Thread<unknown, unknown> | null,
		error: unknown,
	): Promise<void> {
		const message = error instanceof Error ? error.message : 'An unexpected error occurred';

		this.logger.error('[AgentChatBridge] Error in handler', {
			agentId: this.agentId,
			threadId: thread?.id,
			error: message,
		});

		try {
			if (!thread) {
				this.logger.warn(
					"[AgentChatBridge] Couldn't post error message because thread is not set",
					{
						agentId: this.agentId,
						error: message,
					},
				);
				return;
			}
			await thread.post('⚠️ Something went wrong while processing your request. Please try again.');
		} catch (postError) {
			this.logger.error('[AgentChatBridge] Failed to post error message', {
				agentId: this.agentId,
				error: postError instanceof Error ? postError.message : String(postError),
			});
		}
	}
}
