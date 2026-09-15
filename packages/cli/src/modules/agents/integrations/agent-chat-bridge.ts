import type { AgentMessage, StreamChunk } from '@n8n/agents';
import {
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
	type AgentIntegrationConfig,
	type AgentMessageAuthor,
} from '@n8n/api-types';
import { LockNamespace, LockService } from '@n8n/backend-common';
import { type HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { Attachment, Author, Chat, Message, Thread } from 'chat';
import { OperationalError, UnexpectedError, UserError, type Logger } from 'n8n-workflow';

import { CacheService } from '@/services/cache/cache.service';

import {
	AgentChatAttachmentService,
	type StoredAttachmentRef,
} from '../agent-chat-attachment.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentExecutionService } from '../agent-execution.service';
import {
	hashAgentSandboxPrincipal,
	type AgentSandboxPrincipalHash,
} from '../agent-sandbox-principal';
import {
	AgentThreadQueueFullError,
	AgentTurnQueueService,
	type AgentTurnClaim,
	type AgentTurnSubmitResult,
} from '../agent-turn-queue.service';
import type { AgentExecution, QueuedChannelTurn } from '../entities/agent-execution.entity';
import { integrationMemoryResourceId } from '../utils/agent-memory-scope';
import { resolveInboundMimeType } from '../utils/inbound-attachments';
import type {
	AgentChatIntegration,
	BridgeExecutionContext,
	PlatformAgentContext,
} from './agent-chat-integration';
import { ChatIntegrationRegistry, onceStatusHandle } from './agent-chat-integration';
import {
	AgentChatHitlResumeHandler,
	type ChannelResumeConfig,
} from './agent-chat-hitl-resume-handler';
import { AgentChatMessageContextBridge } from './agent-chat-message-context';
import {
	AgentChatStreamConsumer,
	type SuspensionHandlingResult,
} from './agent-chat-stream-consumer';
import { buildSuspendCardPayload, isApprovalSuspendPayload } from './agent-chat-suspension-cards';
import { CallbackStore, type CallbackMetadata } from './callback-store';
import type { ComponentMapper, ShortenCallback } from './component-mapper';
import { loadChatSdk } from './esm-loader';
import { IntegrationMessageContextService } from './integration-message-context.service';
import type { IntegrationMessageSubject, ReplyExpectation } from './integration-tools';
import { N8NCheckpointStorage } from './n8n-checkpoint-storage';
import { downloadDiscordAttachment } from './platforms/discord-operations';

import { type InternalThread, toInternalThreadId } from './types';

import { rateLimitMessageFromError } from './channel-rate-limit';

const RESET_SESSION_COMMAND = '/new';

/** Cache key prefix for the per-conversation session-generation pointer, shared across mains. */
const SESSION_GENERATION_KEY_PREFIX = 'agents:chat-session-generation';
const TURN_ADMISSION_KEY_PREFIX = 'agents:chat-turn-admission';
const SESSION_GENERATION_TTL_MS = 90 * Time.days.toMilliseconds;
/** Matches the rotation suffix appended to a rotated thread id, e.g. "#3". */
const SESSION_GENERATION_SUFFIX_RE = /#\d+$/;

function toMessageAuthor(author: Author): AgentMessageAuthor {
	const name = (author.userName || author.fullName || author.userId).replace(/[\[\]\r\n]/g, '');
	return { id: author.userId, name: name || author.userId };
}

interface SessionGenerationState {
	/** Current rotation counter for a base thread id; 0 means the original, unsuffixed thread. */
	generation: number;
	lastActivityAt: number;
}

interface AgentExecutor {
	executeForChatPublished(config: {
		agentId: string;
		projectId: string;
		message: string;
		modelMessage?: string;
		author?: AgentMessageAuthor;
		attachments?: StoredAttachmentRef[];
		memory: { threadId: InternalThread; resourceId: string };
		integrationType?: string;
		sandboxPrincipalHash: AgentSandboxPrincipalHash;
		claim: AgentTurnClaim;
	}): AsyncGenerator<StreamChunk>;

	/** Validate a resume and return the thread its suspended run belongs to. */
	resolveResumeThread(config: ChannelResumeConfig): Promise<string>;

	resumeForChat(config: ChannelResumeConfig, claim: AgentTurnClaim): AsyncGenerator<StreamChunk>;

	/**
	 * The thread's still-open suspension, if the run is parked on one right now.
	 * Optional so a caller that cannot look checkpoints up (tests) simply skips
	 * the session-rotation gate.
	 */
	findOpenSuspension?(config: {
		agentId: string;
		threadId: string;
	}): Promise<unknown | null>;
}

/** A channel message as its turn runs it, built at arrival or rebuilt from its queued row. */
interface ChannelTurn {
	isNewMention: boolean;
	/** Inbound text with the attachment notes appended. */
	text: string;
	attachments: StoredAttachmentRef[];
	/** Agent-prefixed conversation id the message context is written to. */
	conversationThreadId: string;
	/** Session the run executes in: the conversation, or the task it is bound to. */
	memoryThreadId: string;
	memoryResourceId: string;
	subject?: IntegrationMessageSubject;
}

/**
 * Bridges Chat SDK events to the agent execution pipeline.
 *
 * Registers four handlers on a Chat SDK `Bot` instance:
 * 1. `onNewMention` — new @mentions and DMs → subscribe + execute
 * 2. `onSubscribedMessage` — follow-up messages in subscribed threads
 * 3. `onAction` — button clicks for HITL resume flow
 * 4. `onSlashCommand` — /new session reset for adapters that never deliver a
 *    leading "/" as a plain message (e.g. Telegram)
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
 * `error`, `finish`) flush any pending text before being handled, preserving ordering.
 */
export class AgentChatBridge {
	/** Store for shortening callback data on platforms with size limits (Telegram) */
	private readonly callbackStore?: CallbackStore;

	private readonly turnQueueService = Container.get(AgentTurnQueueService);

	/** Keep same-main waiters in order before they contend for the shared admission lease. */
	private readonly inboundAdmissions = new Map<string, Promise<unknown>>();

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
			turnQueueService: this.turnQueueService,
			channelTurn: (thread) => this.channelTurn(thread),
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
				modelMessage,
				author,
				attachments,
				integrationType,
				sandboxPrincipalHash,
				claim,
			}) {
				yield* agentService.executeForChatPublished(
					{
						agentId: aid,
						projectId: n8nProjectId,
						message,
						modelMessage,
						author,
						attachments,
						memory: { threadId: memory.threadId.id, resourceId: memory.resourceId },
						integrationType,
						sandboxPrincipalHash,
					},
					claim,
				);
			},
			async resolveResumeThread(config) {
				return await agentService.resolveResumeThread(config);
			},
			async *resumeForChat(config, claim) {
				yield* agentService.resumeForChat(config, claim);
			},
			async findOpenSuspension({ agentId: aid, threadId }) {
				// Checkpoints carry no thread index, so the authoritative lookup parses
				// every active checkpoint of the agent. Gate it behind a counted query
				// on the thread's own runs: a thread that never parked one cannot have
				// an open checkpoint, and that is the common case for inbound traffic.
				if (!(await Container.get(AgentExecutionService).hasSuspendedRun(threadId))) {
					return null;
				}
				const checkpoint = await Container.get(N8NCheckpointStorage).findSuspendedForThread(
					aid,
					threadId,
				);
				if (!checkpoint) return null;
				const suspended = Object.values(checkpoint.pendingToolCalls ?? {}).find(
					(toolCall) => toolCall.suspended,
				);
				return suspended ? { suspendPayload: suspended.suspendPayload } : null;
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
						useDefaultSsrfPolicy: 'unsafe', // Discord attachment URLs are restricted to its fixed CDN host
					})
				: undefined,
		);
	}

	// ---------------------------------------------------------------------------
	// Handler registration
	// ---------------------------------------------------------------------------

	private registerHandlers(): void {
		this.chat.onNewMention(async (thread, message) => {
			let replyThread = thread;
			try {
				if (!this.canUserAccess(message.author)) return;
				replyThread = this.anchorInboundThread(thread, message);
				const shouldSubscribe =
					this.integrationImpl?.shouldSubscribeToNewMention?.({ thread, message }) ?? true;
				await this.executeAndStream(replyThread, message, {
					isNewMention: true,
					subscribe: shouldSubscribe,
				});
			} catch (error) {
				await this.postErrorToThread(replyThread, error);
			}
		});

		this.chat.onSubscribedMessage(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				const anchoredThread = this.anchorInboundThread(thread, message);
				await this.executeAndStream(anchoredThread, message, {
					isNewMention: false,
					subscribe: false,
				});
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

		// Some adapters (e.g. Telegram) parse a leading "/" as a native slash
		// command and never deliver it to onNewMention/onSubscribedMessage —
		// intercept it here so /new still resets the session on those platforms.
		// Unlike the plain-text path, this resolves the thread straight from the
		// event's channel id, bypassing anchorInboundThread's re-anchoring — a
		// no-op today since Telegram (the only adapter that fires this) has no
		// messageThreadId override, but worth revisiting for a future adapter
		// that has both.
		this.chat.onSlashCommand(RESET_SESSION_COMMAND, async (event) => {
			const thread = this.chat.thread(event.channel.id);
			try {
				if (!this.canUserAccess(event.user)) return;
				await this.resetSession(thread);
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});
	}

	private canUserAccess(author: Author): boolean {
		return this.integrationImpl?.isUserAllowed?.(author, this.integration) ?? true;
	}

	/**
	 * Re-anchor an inbound conversation at the message's own thread on platforms
	 * where a top-level post arrives through the channel-level pseudo-thread
	 * (e.g. a Slack channel message). Conversation-scoped DMs and group DMs stay
	 * on their inbound thread so Agent-view chat remains one session.
	 */
	private anchorInboundThread(thread: Thread, message: Message): Thread {
		const anchored = this.integrationImpl?.messageThreadId?.(
			{ id: message.id, threadId: thread.id, raw: message.raw },
			{ inbound: true },
		);
		return anchored ? this.chat.thread(anchored) : thread;
	}

	// ---------------------------------------------------------------------------
	// Thread ID resolution — single place to apply per-platform formatting
	// ---------------------------------------------------------------------------

	/**
	 * Resume from a server-side trigger rather than a user action. Rebuilds the
	 * platform thread from the stored agent thread id, so the continuation streams
	 * back into the conversation the suspension was posted to.
	 */
	async resumeInAgentThread(
		agentThreadId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
	): Promise<void> {
		const prefix = `${this.agentId}:`;
		const withoutAgentPrefix = agentThreadId.startsWith(prefix)
			? agentThreadId.slice(prefix.length)
			: agentThreadId;
		// A rotated session appends "#<generation>" to the agent thread id (see
		// resolveActiveSessionId); that bookkeeping is bridge-only and was never
		// part of the platform's own thread id, so strip it before reconstructing
		// the SDK thread — every formatThreadId.toSdk (or its identity fallback)
		// expects the real platform id only.
		const platformThreadId = withoutAgentPrefix.replace(SESSION_GENERATION_SUFFIX_RE, '');
		const sdkThreadId =
			this.integrationImpl?.formatThreadId?.toSdk(platformThreadId) ?? platformThreadId;

		await this.hitlResumeHandler.executeResume(
			this.chat.thread(sdkThreadId),
			runId,
			toolCallId,
			resumeData,
			{ notifyOnDuplicate: false },
		);
	}

	async deliverWakeResponse(threadId: string, chunks: StreamChunk[]): Promise<void> {
		await this.streamConsumer.consume(
			(async function* () {
				yield* chunks;
			})(),
			this.chat.thread(threadId),
			{ throwOnDeliveryError: true },
		);
	}

	private resolvePlatformThreadId(thread: Thread<unknown, unknown>) {
		return this.integrationImpl?.formatThreadId?.fromSdk(thread) ?? thread.id;
	}

	private toAgentThreadId(platformThreadId: string) {
		return toInternalThreadId(`${this.agentId}:${platformThreadId}`);
	}

	/** The agent-prefixed thread id `thread` resolves to, before any session rotation. */
	private baseThreadId(thread: Thread): string {
		return this.toAgentThreadId(this.resolvePlatformThreadId(thread)).id;
	}

	/**
	 * Resolves the thread to run this message in, applying the channel's
	 * configured idle-timeout session rotation (`/new` is handled separately —
	 * see {@link resetSession} — before this is ever called).
	 */
	private async resolveActiveThreadId(thread: Thread): Promise<InternalThread> {
		const baseId = this.baseThreadId(thread);
		const idleTimeoutMinutes = this.integration.settings?.sessionIdleTimeoutMinutes ?? null;
		const id = await this.withSessionLock(
			baseId,
			async (signal) => await this.computeGeneration(baseId, false, idleTimeoutMinutes, signal),
		);
		return toInternalThreadId(id);
	}

	/**
	 * Handles `/new` for adapters that deliver it as plain text rather than a
	 * slash command (i.e. everything but Telegram — see the `onSlashCommand`
	 * registration above). Only treated as the reset command alone: a `/new`
	 * sent together with an attachment falls through to a normal turn instead
	 * of silently dropping the attachment along with the reset. Returns
	 * whether it was handled — the caller must not run a turn when it was.
	 */
	private async handleResetCommand(
		thread: Thread,
		text: string,
		inboundAttachments: Attachment[],
	): Promise<boolean> {
		if (text.toLowerCase() !== RESET_SESSION_COMMAND || inboundAttachments.length > 0) return false;
		await this.resetSession(thread);
		return true;
	}

	/**
	 * Rotates to a brand-new session for `thread` and confirms it there, at
	 * once: earlier messages already carry the old session id in their rows,
	 * later arrivals resolve the new one. Unbinding a task-run session (see
	 * {@link resolveSession} in `executeAndStream`) and rotating the generation
	 * happen inside the same critical section, in that order, as one unit:
	 * - Same critical section: splitting them would let a concurrent message
	 *   land in between and read the just-rotated generation while the old
	 *   binding is still in place (or the reverse), running against the
	 *   task's old memory either way.
	 * - Unbind first: nothing here swallows its error, so a failed unbind
	 *   aborts before the generation is touched, and propagates to the caller's
	 *   existing catch instead of confirming success. The two stores are not
	 *   atomic, so the opposite failure — a rotation that fails after the
	 *   unbind landed — leaves the thread unbound but unrotated: a normal turn
	 *   on the base session (the state `clearSessionBindings` also produces),
	 *   never a redirect into the task's memory, and the error reply asks for a
	 *   retry, which is idempotent. The reverse order fails worse, still
	 *   redirecting into the task's old memory after reporting the error.
	 */
	private async resetSession(thread: Thread): Promise<void> {
		const baseId = this.baseThreadId(thread);
		await this.withSessionLock(baseId, async (signal) => {
			this.assertSessionLock(signal);
			await this.messageContextBridge.unbindSession(baseId);
			this.assertSessionLock(signal);
			await this.computeGeneration(baseId, true, null, signal);
		});
		await thread.post('🔄 Started a new session.');
	}

	/**
	 * Runs `fn` while holding the per-thread session lock for `baseId`. Every
	 * read and write of that thread's rotation/binding state must happen
	 * inside this — the lock is what makes an explicit `/new` and a
	 * concurrent idle-triggered rotation (or unbind) mutually exclusive
	 * instead of racing on stale reads.
	 */
	private async withSessionLock<T>(
		baseId: string,
		fn: (signal: AbortSignal) => Promise<T>,
	): Promise<T> {
		return await Container.get(LockService).withLease(
			LockNamespace.KNOWN_LOCKS,
			this.sessionGenerationCacheKey(baseId),
			fn,
		);
	}

	/**
	 * Resolves the currently active generation for `baseId`, rotating to a new
	 * one when `forceRotate` is set (an explicit `/new`) or the channel's
	 * configured idle timeout has elapsed since the last message on it. The
	 * generation pointer lives in the shared cache (not the
	 * `AgentExecutionThread` table) so a `/new` reset — which never runs an
	 * agent turn, and so never creates a thread row — still takes effect on the
	 * very next unrelated message. Must be called from inside
	 * {@link withSessionLock} for `baseId` — see there for why.
	 *
	 * An idle-elapsed thread that still has a run parked on it is never
	 * rotated: the suspension is keyed on the exact thread id, so rotating
	 * away would silently orphan it (never resumed) instead of letting the
	 * user's reply resolve it. `/new` overrides this — abandoning a pending
	 * suspension is the user's own explicit call there.
	 */
	private async computeGeneration(
		baseId: string,
		forceRotate: boolean,
		idleTimeoutMinutes: number | null,
		signal: AbortSignal,
	): Promise<string> {
		this.assertSessionLock(signal);
		const cache = Container.get(CacheService);
		const key = this.sessionGenerationCacheKey(baseId);
		const state = await cache.get<SessionGenerationState>(key);
		this.assertSessionLock(signal);
		if (!forceRotate && !state && !idleTimeoutMinutes) return baseId;

		const now = Date.now();
		const currentGeneration = state?.generation ?? 0;
		const idleExpired =
			!forceRotate &&
			idleTimeoutMinutes !== null &&
			state !== undefined &&
			now - state.lastActivityAt > idleTimeoutMinutes * 60_000;
		const currentId = currentGeneration === 0 ? baseId : `${baseId}#${currentGeneration}`;
		const hasOpenSuspension = idleExpired ? await this.hasOpenSuspension(currentId) : false;
		this.assertSessionLock(signal);
		const rotate = forceRotate || (idleExpired && !hasOpenSuspension);
		const generation = rotate ? currentGeneration + 1 : currentGeneration;

		// Only persist when it matters: a rotation just happened (so the next
		// call sees it), or the idle timeout is actively configured (so
		// lastActivityAt keeps sliding forward for the *next* expiry check).
		// Otherwise this thread has never been touched by either mechanism, or
		// the timeout was turned off after an earlier reset — nothing to track.
		if (rotate || idleTimeoutMinutes !== null) {
			this.assertSessionLock(signal);
			await cache.set(key, { generation, lastActivityAt: now }, SESSION_GENERATION_TTL_MS);
		}
		return generation === 0 ? baseId : `${baseId}#${generation}`;
	}

	private assertSessionLock(signal: AbortSignal): void {
		if (signal.aborted) throw new OperationalError('Agent session lock was lost');
	}

	private async hasOpenSuspension(threadId: string): Promise<boolean> {
		const open = await this.agentService.findOpenSuspension?.({ agentId: this.agentId, threadId });
		return open !== null && open !== undefined;
	}

	private sessionGenerationCacheKey(baseId: string): string {
		return `${SESSION_GENERATION_KEY_PREFIX}:${baseId}`;
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
		options: { isNewMention: boolean; subscribe: boolean },
	): Promise<void> {
		const admitted = await this.serializeInboundAdmission(
			this.baseThreadId(thread),
			async (signal) => await this.admitInboundMessage(thread, message, options, signal),
		);
		if (!admitted) return;
		await this.runTurn(thread, message, admitted.turn, admitted.claim);
	}

	private async admitInboundMessage(
		thread: Thread,
		message: Message,
		options: { isNewMention: boolean; subscribe: boolean },
		admissionSignal: AbortSignal,
	): Promise<{ turn: ChannelTurn; claim: AgentTurnClaim } | null> {
		const { isNewMention, subscribe } = options;
		admissionSignal.throwIfAborted();
		if (subscribe) await thread.subscribe();
		admissionSignal.throwIfAborted();
		const text = this.prepareInboundText(
			await this.getInboundText(message),
			this.getPlatformAgentContext(),
		).trim();
		admissionSignal.throwIfAborted();
		// `?? []` guards rehydrated/serialized messages that predate the field.
		const inboundAttachments = message.attachments ?? [];
		if (!text && inboundAttachments.length === 0) return null;
		if (await this.handleResetCommand(thread, text, inboundAttachments)) return null;

		const threadId = await this.resolveActiveThreadId(thread);
		admissionSignal.throwIfAborted();
		const resourceId = integrationMemoryResourceId(this.integration.type, message.author.userId);
		// If this thread was established by an outbound task send, continue that
		// task's session instead of starting a fresh one. Attachments are stored
		// on the execution thread so file-store hydration (scoped to
		// persistence.threadId) can load them. The Slack reply thread is unchanged.
		// The binding is always keyed by the base (pre-rotation) thread id — it's
		// written by an outbound send that has no notion of session rotation —
		// so it has to be looked up the same way, not by whatever generation is
		// currently active.
		const sessionOrigin = await this.messageContextBridge.resolveSession(this.baseThreadId(thread));
		admissionSignal.throwIfAborted();
		const memoryThreadId = sessionOrigin ? toInternalThreadId(sessionOrigin.threadId) : threadId;
		const memoryResourceId = sessionOrigin?.resourceId ?? resourceId;

		const { attachments, attachmentNotes } = await this.storeInboundAttachments(
			inboundAttachments,
			memoryThreadId.id,
			memoryResourceId,
		);
		let persisted = false;
		try {
			admissionSignal.throwIfAborted();
			const subject = await this.messageContextBridge.resolveSubject(message);
			admissionSignal.throwIfAborted();
			const turn: ChannelTurn = {
				isNewMention,
				text: [text, ...attachmentNotes].filter(Boolean).join('\n'),
				attachments,
				conversationThreadId: threadId.id,
				memoryThreadId: memoryThreadId.id,
				memoryResourceId,
				subject,
			};
			const submitted: AgentTurnSubmitResult = await this.turnQueueService.submit(
				{
					threadId: memoryThreadId.id,
					agentId: this.agentId,
					projectId: this.n8nProjectId,
					userMessage: turn.text,
					author: toMessageAuthor(message.author),
					attachments: attachments.length > 0 ? attachments : undefined,
					source: this.integration.type,
					resourceId: memoryResourceId,
					runContext: {
						kind: 'message',
						channel: {
							...this.channelTurn(thread),
							isNewMention,
							subject: turn.subject,
							conversationThreadId: threadId.id,
						},
					},
				},
				() => {
					persisted = true;
				},
			);
			if (submitted.status === 'queued') return null;
			return { turn, claim: submitted.claim };
		} catch (error) {
			if (!persisted && attachments.length > 0) {
				await this.attachmentService?.deleteByIds(attachments.map((ref) => ref.id)).catch(() => {});
			}
			throw error;
		}
	}

	private async serializeInboundAdmission<T>(
		threadId: string,
		work: (signal: AbortSignal) => Promise<T>,
	): Promise<T> {
		const previous = this.inboundAdmissions.get(threadId) ?? Promise.resolve();
		const run = previous
			.catch(() => undefined)
			.then(
				async () =>
					await Container.get(LockService).withLease(
						LockNamespace.KNOWN_LOCKS,
						`${TURN_ADMISSION_KEY_PREFIX}:${threadId}`,
						work,
					),
			);
		this.inboundAdmissions.set(threadId, run);
		try {
			return await run;
		} finally {
			if (this.inboundAdmissions.get(threadId) === run) this.inboundAdmissions.delete(threadId);
		}
	}

	/** Run a queued channel message headless, replying into its rebuilt thread. */
	async runQueuedMessage(row: AgentExecution, claim: AgentTurnClaim): Promise<void> {
		const channel = row.runContext?.kind === 'message' ? row.runContext.channel : undefined;
		if (!channel || row.resourceId === null) {
			throw new UnexpectedError('Queued agent turn is not a channel message');
		}
		const { thread, currentMessage } = await this.rebuildThread(channel);
		if (!currentMessage) {
			throw new UnexpectedError('Queued channel message has no inbound message');
		}
		await this.runTurn(
			thread,
			currentMessage,
			{
				isNewMention: channel.isNewMention,
				text: row.userMessage ?? '',
				attachments: row.attachments ?? [],
				conversationThreadId: channel.conversationThreadId,
				memoryThreadId: row.threadId,
				memoryResourceId: row.resourceId,
				subject: channel.subject,
			},
			claim,
		);
	}

	/** Run a queued channel resume headless in its rebuilt thread. */
	async runQueuedResume(row: AgentExecution, claim: AgentTurnClaim): Promise<void> {
		const context = row.runContext;
		if (context?.kind !== 'resume' || !context.channel) {
			throw new UnexpectedError('Queued agent turn is not a channel resume');
		}
		const { thread, currentMessage } = await this.rebuildThread(context.channel);
		const action = context.channel.action;
		if (action && !currentMessage) {
			throw new UnexpectedError('Queued channel action has no message context');
		}
		await this.hitlResumeHandler.runResume(
			thread,
			{
				agentId: this.agentId,
				projectId: this.n8nProjectId,
				runId: context.runId,
				toolCallId: context.toolCallId,
				resumeData: context.resumeData,
				integrationType: this.integration.type,
				...(action && currentMessage
					? {
							beforeResume: async (abortSignal: AbortSignal) =>
								await this.hitlResumeHandler.runActionBeforeResume(
									thread,
									action,
									currentMessage,
									context.resumeData,
									undefined,
									abortSignal,
								),
						}
					: {}),
			},
			claim,
		);
	}

	private channelTurn(thread: Thread<unknown, unknown>): QueuedChannelTurn {
		return {
			integrationType: this.integration.type,
			credentialId: this.integration.credentialId,
			thread: thread.toJSON(),
		};
	}

	private async rebuildThread(
		channel: QueuedChannelTurn,
	): Promise<{ thread: Thread; currentMessage?: Message }> {
		const { Message, ThreadImpl } = await loadChatSdk();
		const adapter = this.chat.getAdapter(channel.integrationType);
		if (!adapter) {
			throw new UnexpectedError(`Chat adapter "${channel.integrationType}" is not available`);
		}
		const currentMessage = channel.thread.currentMessage
			? Message.fromJSON(channel.thread.currentMessage)
			: undefined;
		return {
			thread: new ThreadImpl({
				adapter,
				stateAdapter: this.chat.getState(),
				logger: this.chat.getLogger(),
				id: channel.thread.id,
				channelId: channel.thread.channelId,
				isDM: channel.thread.isDM,
				channelVisibility: channel.thread.channelVisibility,
				...(currentMessage ? { currentMessage, initialMessage: currentMessage } : {}),
			}),
			currentMessage,
		};
	}

	/**
	 * Run the claimed turn and stream the reply into `thread`. Shared by the live
	 * path and the headless drain, which rebuilds `thread` and `message` from the
	 * row. A failure before the run started ends the row through the claim.
	 */
	private async runTurn(
		thread: Thread,
		message: Message,
		turn: ChannelTurn,
		claim: AgentTurnClaim,
	): Promise<void> {
		const platformAgentContext = this.getPlatformAgentContext();
		const statusRetry = new AbortController();
		const replyExpectation =
			this.integrationImpl?.getReplyExpectation?.({
				message,
				isNewMention: turn.isNewMention,
				platformAgentContext,
			}) ?? 'required';
		let statusHandle: ReturnType<typeof onceStatusHandle> | undefined;
		try {
			const bridgeExecutionContext = await this.resolveBridgeExecutionContext(
				thread,
				message,
				platformAgentContext,
				statusRetry,
				turn.isNewMention,
				replyExpectation,
			);
			statusHandle = onceStatusHandle(bridgeExecutionContext.statusHandle);
			const latestContextOptions = {
				messageId: message.id,
				interactingUserId: message.author.userId,
				...bridgeExecutionContext.platformAgentContext,
				subject: turn.subject,
				replyExpectation,
			};
			// The claimed turn writes message context. A queued message cannot
			// redirect the running turn's replies.
			await this.messageContextBridge.updateLatest(
				turn.conversationThreadId,
				message.author.userId,
				thread,
				latestContextOptions,
			);
			// Tools look up context on persistence.threadId (the execution
			// session). When a bound reply continues a task, that is the origin
			// thread, not the Slack thread — store this turn there too.
			if (turn.memoryThreadId !== turn.conversationThreadId) {
				await this.messageContextBridge.updateLatest(
					turn.memoryThreadId,
					turn.memoryResourceId,
					thread,
					latestContextOptions,
				);
			}
			// threadId is agent-prefixed for shared conversation history;
			// resourceId keeps the author identity so episodic recall follows them.
			// Always run the published snapshot — integrations are production traffic.
			// The model gets the author label and thread history; the transcript
			// records the plain text and carries the author as structured data.
			const author = toMessageAuthor(message.author);
			const labelledText = `[${author.name} (${author.id})]: ${turn.text}`;
			const modelMessage = bridgeExecutionContext.historyContext
				? `${bridgeExecutionContext.historyContext}\n\n${labelledText}`
				: labelledText;
			const stream = this.agentService.executeForChatPublished({
				agentId: this.agentId,
				projectId: this.n8nProjectId,
				message: turn.text,
				modelMessage,
				author,
				attachments: turn.attachments.length > 0 ? turn.attachments : undefined,
				memory: {
					threadId: toInternalThreadId(turn.memoryThreadId),
					resourceId: turn.memoryResourceId,
				},
				integrationType: this.integration.type,
				sandboxPrincipalHash: hashAgentSandboxPrincipal({
					type: 'integration-thread',
					connectionId: this.integration.credentialId,
					platform: this.integration.type,
					platformThreadId: this.resolvePlatformThreadId(thread),
				}),
				claim,
			});
			await this.streamConsumer.consume(stream, thread, {
				forceBuffered: bridgeExecutionContext.forceBuffered,
				statusHandle,
			});
		} catch (error) {
			await this.postErrorToThread(thread, error);
			await claim.fail(error);
			return;
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
				integration: this.integration,
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
		throwOnDeliveryError = false,
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
			if (throwOnDeliveryError) throw error;
			return false;
		}
	}

	private getPlatformAgentContext(): PlatformAgentContext {
		return this.integrationImpl?.getPlatformAgentContext?.(this.chat) ?? {};
	}

	/** Keep labelled-link URLs because the Chat SDK plain-text projection removes them. */
	private async getInboundText(message: Message): Promise<string> {
		if (!message.formatted) return message.text;
		const { isLinkNode, text, toPlainText, walkAst } = await loadChatSdk();
		// Keep raw platform markdown when the adapter does not use the SDK projection.
		if (toPlainText(message.formatted) !== message.text) return message.text;
		const formatted = walkAst(structuredClone(message.formatted), (node) => {
			if (!isLinkNode(node)) return node;
			const label = toPlainText({ type: 'root', children: [node] });
			// Keep GFM autolinks because their labels already contain the URL.
			if ([label, `http://${label}`, `mailto:${label}`].includes(node.url)) return node;
			return text(`[${label}](${node.url})`);
		});
		return toPlainText(formatted);
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
		throwOnDeliveryError = false,
	): Promise<void> {
		const message = error instanceof Error ? error.message : 'An unexpected error occurred';
		// Resolve a rate-limit message if the error is a rate-limit error, otherwise undefined.
		const rateLimitMessage = rateLimitMessageFromError(error);
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
			// A `UserError` is written for people and names the misconfiguration,
			// which lets an agent owner fix it without reading server logs.
			const text =
				rateLimitMessage !== undefined
					? `⚠️ ${rateLimitMessage}`
					: error instanceof AgentThreadQueueFullError
						? `⚠️ ${error.message}`
						: error instanceof UserError
							? `⚠️ This agent is misconfigured: ${error.message} An agent owner has to fix this in n8n.`
							: '⚠️ Something went wrong while processing your request. Please try again.';
			await thread.post(text);
		} catch (postError) {
			this.logger.error('[AgentChatBridge] Failed to post error message', {
				agentId: this.agentId,
				error: postError instanceof Error ? postError.message : String(postError),
			});
			if (throwOnDeliveryError) throw postError;
		}
	}
}
