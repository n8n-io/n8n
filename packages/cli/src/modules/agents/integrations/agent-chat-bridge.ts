import type { AgentMessage, StreamChunk } from '@n8n/agents';
import {
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
} from '@n8n/api-types';
import { LockService } from '@n8n/backend-common';
import { type HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { Attachment, Author, Chat, Message, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import {
	AgentChatAttachmentService,
	type StoredAttachmentRef,
} from '../agent-chat-attachment.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { CacheService } from '@/services/cache/cache.service';
import { integrationMemoryResourceId } from '../utils/agent-memory-scope';
import { resolveInboundMimeType } from '../utils/inbound-attachments';
import type {
	AgentChatIntegration,
	BridgeExecutionContext,
	PlatformAgentContext,
} from './agent-chat-integration';
import { ChatIntegrationRegistry, onceStatusHandle } from './agent-chat-integration';
import { AgentChatHitlResumeHandler } from './agent-chat-hitl-resume-handler';
import { AgentChatMessageContextBridge } from './agent-chat-message-context';
import {
	AgentChatStreamConsumer,
	type SuspensionHandlingResult,
} from './agent-chat-stream-consumer';
import { buildSuspendCardPayload, isApprovalSuspendPayload } from './agent-chat-suspension-cards';
import { CallbackStore, type CallbackMetadata } from './callback-store';
import type { ComponentMapper, ShortenCallback } from './component-mapper';
import { IntegrationMessageContextService } from './integration-message-context.service';
import type { ReplyExpectation } from './integration-tools';
import { downloadDiscordAttachment } from './platforms/discord-operations';
import type { AgentIntegrationConfig } from '@n8n/api-types';

import { type InternalThread, toInternalThreadId } from './types';

interface AgentExecutor {
	executeForChatPublished(config: {
		agentId: string;
		projectId: string;
		message: string;
		attachments?: StoredAttachmentRef[];
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
		private readonly attachmentService?: AgentChatAttachmentService,
		private readonly discordHttpClient?: HttpRequestClient,
	) {
		this.integrationImpl = Container.get(ChatIntegrationRegistry).get(integration.type);
		this.messageContextBridge = new AgentChatMessageContextBridge(
			messageContextStore,
			integration,
			agentId,
			logger,
		);
		if (this.integrationImpl?.needsShortCallbackData) {
			this.callbackStore = new CallbackStore(
				Container.get(CacheService),
				Container.get(LockService),
				`${agentId}:${integration.type}:${integration.credentialId}`,
			);
		}
		const disableStreaming = this.integrationImpl?.disableStreaming ?? false;
		// Matches this platform's action tool names as generated by
		// getIntegrationToolConnectionDescriptors: `${type}_action`,
		// `${type}_2_action`, … for additional connections of the same type.
		const actionToolNamePattern = new RegExp(`^${integration.type}(_\\d+)?_action$`);
		this.streamConsumer = new AgentChatStreamConsumer({
			disableStreaming,
			logger: this.logger,
			postErrorToThread: this.postErrorToThread.bind(this),
			handleSuspension: this.handleSuspension.bind(this),
			handleMessage: this.handleMessage.bind(this),
			isIntegrationActionTool: (toolName) => actionToolNamePattern.test(toolName),
		});
		this.hitlResumeHandler = new AgentChatHitlResumeHandler({
			agentId,
			projectId: n8nProjectId,
			integration,
			agentService,
			logger,
			callbackStore: this.callbackStore,
			deleteActionMessageBeforeResume:
				this.integrationImpl?.deleteActionMessageBeforeResume ?? true,
			formatActionDecisionMessage: (params) =>
				this.integrationImpl?.formatActionDecisionMessage?.(params),
			settleActionMessage: this.integrationImpl?.settleActionMessage?.bind(this.integrationImpl),
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
			async *executeForChatPublished({
				memory,
				agentId: aid,
				message,
				attachments,
				integrationType,
			}) {
				yield* agentService.executeForChatPublished({
					agentId: aid,
					projectId: n8nProjectId,
					message,
					attachments,
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
			Container.get(AgentChatAttachmentService),
			integration.type === 'discord'
				? Container.get(OutboundHttp).requests({
						ssrf: 'disabled', // Discord attachment URLs are restricted to its fixed CDN host
					})
				: undefined,
		);
	}

	// ---------------------------------------------------------------------------
	// Handler registration
	// ---------------------------------------------------------------------------

	private registerHandlers(): void {
		this.chat.onNewMention(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				const shouldSubscribe =
					this.integrationImpl?.shouldSubscribeToNewMention?.({ thread, message }) ?? true;
				if (shouldSubscribe) {
					await thread.subscribe();
				}
				await this.executeAndStream(thread, message, { isNewMention: true });
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.chat.onSubscribedMessage(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				await this.executeAndStream(thread, message, { isNewMention: false });
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
	getShortenCallback(metadata?: CallbackMetadata): ShortenCallback | undefined {
		if (!this.callbackStore) return undefined;
		const store = this.callbackStore;
		return async (actionId: string, value: string, label?: string) => {
			const key = await store.store(actionId, value, {
				...metadata,
				...(label !== undefined ? { label } : {}),
			});
			return { id: key, value: '' };
		};
	}

	// ---------------------------------------------------------------------------
	// Core execution pipeline
	// ---------------------------------------------------------------------------

	private async executeAndStream(
		thread: Thread,
		message: Message,
		options: { isNewMention: boolean },
	): Promise<void> {
		const { isNewMention } = options;
		const platformAgentContext = this.getPlatformAgentContext();
		const text = this.prepareInboundText(message.text, platformAgentContext).trim();
		// `?? []` guards rehydrated/serialized messages that predate the field.
		const inboundAttachments = message.attachments ?? [];
		if (!text && inboundAttachments.length === 0) return;

		const platformThreadId = this.resolvePlatformThreadId(thread);
		const threadId = this.toAgentThreadId(platformThreadId);
		const resourceId = integrationMemoryResourceId(this.integration.type, message.author.userId);
		const { attachments, attachmentNotes } = await this.storeInboundAttachments(
			inboundAttachments,
			threadId.id,
			resourceId,
		);
		const statusRetry = new AbortController();
		const replyExpectation =
			this.integrationImpl?.getReplyExpectation?.({
				message,
				isNewMention,
				platformAgentContext,
			}) ?? 'required';
		let statusHandle: ReturnType<typeof onceStatusHandle> | undefined;
		let consumeStarted = false;
		try {
			// Platform status hooks, the lazy `message.subject` fetch, and any
			// thread-history fetch are all remote round-trips on independent
			// resources — run them concurrently.
			const [bridgeExecutionContext, subject] = await Promise.all([
				this.resolveBridgeExecutionContext(
					thread,
					message,
					platformAgentContext,
					statusRetry,
					isNewMention,
					replyExpectation,
				),
				this.messageContextBridge.resolveSubject(message),
			]);
			statusHandle = onceStatusHandle(bridgeExecutionContext.statusHandle);
			await this.messageContextBridge.updateLatest(threadId.id, message.author.userId, thread, {
				messageId: message.id,
				interactingUserId: message.author.userId,
				...bridgeExecutionContext.platformAgentContext,
				subject,
				replyExpectation,
			});
			// threadId.id is agent-prefixed for observation storage; resourceId keeps
			// the platform user identity so episodic recall works across threads for
			// the same user while staying isolated between users.
			// Always run the published snapshot — integrations are production traffic.
			const textWithNotes = [text, ...attachmentNotes].filter(Boolean).join('\n');
			const agentInput = bridgeExecutionContext.historyContext
				? `${bridgeExecutionContext.historyContext}\n\n${textWithNotes}`
				: textWithNotes;
			const stream = this.agentService.executeForChatPublished({
				agentId: this.agentId,
				projectId: this.n8nProjectId,
				message: agentInput,
				attachments: attachments.length > 0 ? attachments : undefined,
				memory: {
					threadId,
					resourceId,
				},
				integrationType: this.integration.type,
			});

			consumeStarted = true;
			await this.streamConsumer.consume(stream, thread, {
				forceBuffered: bridgeExecutionContext.forceBuffered,
				statusHandle,
			});
		} catch (error) {
			// The execution generator is lazy: a throw before consumption started means
			// nothing ran and nothing references this turn's attachments — remove them
			// (best-effort). Once consumption starts, the turn may be persisted.
			if (!consumeStarted && attachments.length > 0) {
				await this.attachmentService?.deleteByIds(attachments.map((ref) => ref.id)).catch(() => {});
			}
			throw error;
		} finally {
			statusRetry.abort();
			// The stream consumer clears the status right before the first response;
			// this clear covers failures before/outside consumption, which would
			// otherwise leave a status indicator (e.g. Telegram's typing keepalive)
			// running after the error reply. The once-wrapped handle makes this a
			// no-op await of the consumer's clear when that already ran.
			await statusHandle?.clearBeforeResponse();
		}
	}

	/**
	 * Download and persist inbound platform attachments. Slack/Telegram adapters
	 * provide `fetchData`; Discord provides a signed CDN URL. Oversize or failed
	 * downloads degrade to a text note on the user turn — an attachment problem
	 * never aborts the run. Returns stored refs plus the notes to append.
	 */
	private async storeInboundAttachments(
		inboundAttachments: Attachment[],
		threadId: string,
		resourceId: string,
	): Promise<{ attachments: StoredAttachmentRef[]; attachmentNotes: string[] }> {
		const attachments: StoredAttachmentRef[] = [];
		const attachmentNotes: string[] = [];
		if (!this.attachmentService || inboundAttachments.length === 0) {
			return { attachments, attachmentNotes };
		}

		const skipped = inboundAttachments.slice(MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE);
		for (const attachment of skipped) {
			attachmentNotes.push(
				`[Attachment "${attachment.name ?? 'file'}" was not processed: too many attachments in one message]`,
			);
		}

		for (const attachment of inboundAttachments.slice(0, MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE)) {
			// Platform attachments bypass DTO validation, so cap the name to the
			// fileName column width here.
			const name = (attachment.name ?? 'attachment').slice(
				0,
				MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
			);
			try {
				if (
					attachment.size !== undefined &&
					attachment.size > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES
				) {
					attachmentNotes.push(
						`[Attachment "${name}" was skipped: larger than ${MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB} MB]`,
					);
					continue;
				}

				const data = await this.fetchAttachmentData(attachment);
				if (!data || data.byteLength === 0) {
					attachmentNotes.push(`[Attachment "${name}" could not be downloaded]`);
					continue;
				}
				if (data.byteLength > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
					attachmentNotes.push(
						`[Attachment "${name}" was skipped: larger than ${MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB} MB]`,
					);
					continue;
				}

				const mimeType = await resolveInboundMimeType(attachment.mimeType, data);
				const stored = await this.attachmentService.storeInbound({
					agentId: this.agentId,
					projectId: this.n8nProjectId,
					threadId,
					resourceId,
					source: this.integration.type,
					fileName: name,
					mimeType,
					data,
				});
				attachments.push({
					id: stored.id,
					fileName: stored.fileName,
					mimeType: stored.mimeType,
					sizeBytes: stored.fileSizeBytes,
				});
			} catch (error) {
				this.logger.warn('[AgentChatBridge] Failed to ingest attachment', {
					agentId: this.agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
				attachmentNotes.push(`[Attachment "${name}" could not be processed]`);
			}
		}

		return { attachments, attachmentNotes };
	}

	private async fetchAttachmentData(attachment: Attachment): Promise<Buffer | null> {
		if (attachment.fetchData) return await attachment.fetchData();
		if (Buffer.isBuffer(attachment.data)) return attachment.data;
		if (attachment.data) return Buffer.from(await attachment.data.arrayBuffer());
		if (this.integration.type === 'discord' && attachment.url && this.discordHttpClient) {
			return await downloadDiscordAttachment(attachment.url, this.discordHttpClient);
		}
		return null;
	}

	private async resolveBridgeExecutionContext(
		thread: Thread<unknown, unknown>,
		message: Message<unknown>,
		platformAgentContext: PlatformAgentContext,
		statusRetry: AbortController,
		isNewMention: boolean,
		replyExpectation: ReplyExpectation,
	): Promise<BridgeExecutionContext> {
		return (
			(await this.integrationImpl?.createBridgeExecutionContext?.({
				chat: this.chat,
				thread,
				message,
				logger: this.logger,
				agentId: this.agentId,
				statusRetry,
				isNewMention,
				replyExpectation,
			})) ?? { platformAgentContext }
		);
	}

	// ---------------------------------------------------------------------------
	// Suspension handling (HITL tool cards)
	// ---------------------------------------------------------------------------

	private async handleSuspension(
		chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
		thread: Thread,
	): Promise<SuspensionHandlingResult> {
		const { runId, toolCallId, suspendPayload } = chunk;

		if (!runId || !toolCallId) {
			this.logger.warn('[AgentChatBridge] Suspended chunk missing runId or toolCallId');
			return 'failed';
		}

		const cardPayload = buildSuspendCardPayload(suspendPayload);
		if (!cardPayload) return 'skipped';
		const callbackMetadata: CallbackMetadata = {
			groupId: JSON.stringify([runId, toolCallId]),
			...(isApprovalSuspendPayload(suspendPayload) ? { kind: 'approval' } : {}),
		};

		try {
			const card = await this.componentMapper.toCard(
				cardPayload,
				runId,
				toolCallId,
				chunk.resumeSchema,
				this.getShortenCallback(callbackMetadata),
				this.integration.type,
			);
			await thread.post({ card });
			return 'posted';
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post suspension card', {
				agentId: this.agentId,
				runId,
				toolCallId,
				error: error instanceof Error ? error.message : String(error),
			});
			return 'failed';
		}
	}

	// ---------------------------------------------------------------------------
	// Custom message handling (tool toMessage output)
	// ---------------------------------------------------------------------------

	private async handleMessage(
		chunk: Extract<StreamChunk, { type: 'message' }>,
		thread: Thread,
	): Promise<boolean> {
		const agentMessage: AgentMessage = chunk.message;

		// AgentMessage is a union. LLM messages (Message) have a `content` array
		// of typed content parts. Extract only text parts for display.
		if (!('content' in agentMessage) || !Array.isArray(agentMessage.content)) return false;

		const textParts = agentMessage.content
			.filter(
				(part): part is { type: 'text'; text: string } => part.type === 'text' && 'text' in part,
			)
			.map((part) => part.text);

		const textToPost = textParts.join('');

		// Skip messages with no displayable text (e.g. tool-call-only messages)
		if (!textToPost.trim()) return false;

		try {
			await thread.post(textToPost);
			return true;
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post message chunk', {
				agentId: this.agentId,
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
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
