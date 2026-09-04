import type { AgentMessage, StreamChunk } from '@n8n/agents';
import {
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
	type AgentIntegrationConfig,
} from '@n8n/api-types';
import { LockNamespace, LockService } from '@n8n/backend-common';
import { type HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { Container } from '@n8n/di';
import type { Attachment, Author, Chat, Message, Thread } from 'chat';
import { UserError, type Logger } from 'n8n-workflow';

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
import { N8NCheckpointStorage } from './n8n-checkpoint-storage';
import { downloadDiscordAttachment } from './platforms/discord-operations';

import { type InternalThread, toInternalThreadId } from './types';

const RESET_SESSION_COMMAND = '/new';

/** Cache key prefix for the per-conversation session-generation pointer, shared across mains. */
const SESSION_GENERATION_KEY_PREFIX = 'agents:chat-session-generation';
const SESSION_GENERATION_TTL_MS = 90 * Time.days.toMilliseconds;
/** Matches the rotation suffix appended to a rotated thread id, e.g. "#3". */
const SESSION_GENERATION_SUFFIX_RE = /#\d+$/;

interface SessionGenerationState {
	/** Current rotation counter for a base thread id; 0 means the original, unsuffixed thread. */
	generation: number;
	lastActivityAt: number;
}

/**
 * Reply sent when a message arrives while the run is parked. Leads with the
 * suspension card's own title (e.g. `Waiting on "Approval workflow"`) so the
 * user knows what is holding things up, and falls back to a generic line for
 * payloads that carry no title.
 */
function stillWaitingNotice(suspendPayload: unknown): string {
	const title =
		typeof suspendPayload === 'object' &&
		suspendPayload !== null &&
		'title' in suspendPayload &&
		typeof suspendPayload.title === 'string' &&
		suspendPayload.title.length > 0
			? suspendPayload.title
			: "I'm still waiting on the previous step";
	return `⏳ ${title} — use the buttons on that card and I'll continue from there.`;
}

interface AgentExecutor {
	executeForChatPublished(config: {
		agentId: string;
		projectId: string;
		message: string;
		attachments?: StoredAttachmentRef[];
		memory: { threadId: InternalThread; resourceId: string };
		integrationType?: string;
		sandboxPrincipalHash: AgentSandboxPrincipalHash;
	}): AsyncGenerator<StreamChunk>;

	resumeForChat(config: {
		agentId: string;
		projectId: string;
		runId: string;
		toolCallId: string;
		resumeData: unknown;
		integrationType?: string;
		expectedMemory: { threadId: string };
	}): AsyncGenerator<StreamChunk>;

	/**
	 * The thread's still-open suspension, if the run is parked on one right now.
	 * Optional so a caller that cannot look checkpoints up (tests) simply skips
	 * the inbound gate.
	 */
	findOpenSuspension?(config: {
		agentId: string;
		threadId: string;
	}): Promise<OpenSuspension | null>;
}

/** Enough of a parked run to tell the user what the agent is still waiting on. */
interface OpenSuspension {
	suspendPayload?: unknown;
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
				sandboxPrincipalHash,
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
					sandboxPrincipalHash,
				});
			},
			async *resumeForChat(config) {
				yield* agentService.resumeForChat(config);
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
			try {
				if (!this.canUserAccess(message.author)) return;
				const anchoredThread = this.anchorInboundThread(thread, message);
				const shouldSubscribe =
					this.integrationImpl?.shouldSubscribeToNewMention?.({ thread, message }) ?? true;
				if (shouldSubscribe) {
					await anchoredThread.subscribe();
				}
				await this.executeAndStream(anchoredThread, message, { isNewMention: true });
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.chat.onSubscribedMessage(async (thread, message) => {
			try {
				if (!this.canUserAccess(message.author)) return;
				const anchoredThread = this.anchorInboundThread(thread, message);
				await this.executeAndStream(anchoredThread, message, { isNewMention: false });
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
			false,
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
			async () => await this.computeGeneration(baseId, false, idleTimeoutMinutes),
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
	 * Rotates to a brand-new session for `thread` and confirms it there.
	 * Unbinding a task-run session (see {@link resolveSession} in
	 * `executeAndStream`) and rotating the generation happen inside the same
	 * critical section, in that order, as one unit:
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
		await this.withSessionLock(baseId, async () => {
			await this.messageContextBridge.unbindSession(baseId);
			await this.computeGeneration(baseId, true, null);
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
	private async withSessionLock<T>(baseId: string, fn: () => Promise<T>): Promise<T> {
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
	): Promise<string> {
		const cache = Container.get(CacheService);
		const key = this.sessionGenerationCacheKey(baseId);
		const state = await cache.get<SessionGenerationState>(key);
		if (!forceRotate && !state && !idleTimeoutMinutes) return baseId;

		const now = Date.now();
		const currentGeneration = state?.generation ?? 0;
		const idleExpired =
			!forceRotate &&
			idleTimeoutMinutes !== null &&
			state !== undefined &&
			now - state.lastActivityAt > idleTimeoutMinutes * 60_000;
		const currentId = currentGeneration === 0 ? baseId : `${baseId}#${currentGeneration}`;
		const rotate = forceRotate || (idleExpired && !(await this.hasOpenSuspension(currentId)));
		const generation = rotate ? currentGeneration + 1 : currentGeneration;

		// Only persist when it matters: a rotation just happened (so the next
		// call sees it), or the idle timeout is actively configured (so
		// lastActivityAt keeps sliding forward for the *next* expiry check).
		// Otherwise this thread has never been touched by either mechanism, or
		// the timeout was turned off after an earlier reset — nothing to track.
		if (rotate || idleTimeoutMinutes !== null) {
			await cache.set(key, { generation, lastActivityAt: now }, SESSION_GENERATION_TTL_MS);
		}
		return generation === 0 ? baseId : `${baseId}#${generation}`;
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
		options: { isNewMention: boolean },
	): Promise<void> {
		const { isNewMention } = options;
		const platformAgentContext = this.getPlatformAgentContext();
		const text = this.prepareInboundText(message.text, platformAgentContext).trim();
		// `?? []` guards rehydrated/serialized messages that predate the field.
		const inboundAttachments = message.attachments ?? [];
		if (!text && inboundAttachments.length === 0) return;
		if (await this.handleResetCommand(thread, text, inboundAttachments)) return;

		const threadId = await this.resolveActiveThreadId(thread);
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
		const memoryThreadId = sessionOrigin ? toInternalThreadId(sessionOrigin.threadId) : threadId;
		const memoryResourceId = sessionOrigin?.resourceId ?? resourceId;
		// The run parks against the session it executes in, which for a bound reply
		// is the task's thread rather than the platform one — so this has to come
		// after the binding is resolved, and before anything is stored for a turn
		// that is not going to run.
		if (await this.postStillWaitingReply(thread, memoryThreadId.id)) return;
		const { attachments, attachmentNotes } = await this.storeInboundAttachments(
			inboundAttachments,
			memoryThreadId.id,
			memoryResourceId,
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
			const latestContextOptions = {
				messageId: message.id,
				interactingUserId: message.author.userId,
				...bridgeExecutionContext.platformAgentContext,
				subject,
				replyExpectation,
			};
			await this.messageContextBridge.updateLatest(
				threadId.id,
				message.author.userId,
				thread,
				latestContextOptions,
			);
			// Tools look up context on persistence.threadId (the execution
			// session). When a bound reply continues a task, that is the origin
			// thread, not the Slack thread — store this turn there too.
			if (memoryThreadId.id !== threadId.id) {
				await this.messageContextBridge.updateLatest(
					memoryThreadId.id,
					memoryResourceId,
					thread,
					latestContextOptions,
				);
			}
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
					threadId: memoryThreadId,
					resourceId: memoryResourceId,
				},
				integrationType: this.integration.type,
				sandboxPrincipalHash: hashAgentSandboxPrincipal({
					type: 'integration-user',
					connectionId: this.integration.credentialId,
					platform: this.integration.type,
					platformUserId: message.author.userId,
				}),
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
	 * A run parked on a suspension owns the conversation until it is resolved.
	 * Starting a second run here would hand the model a history with the pending
	 * tool call stripped out, so it would call the same tool again — a duplicate
	 * side effect and a second parked run. Tell the user instead of executing,
	 * and let them resolve the open card.
	 *
	 * Returns true when the message was answered with the notice and must not
	 * start a run. A failure to post propagates: the gate has already decided not
	 * to run, and the handler's error reply is the only thing left that can tell
	 * the user their message went nowhere.
	 */
	private async postStillWaitingReply(thread: Thread, threadId: string): Promise<boolean> {
		const open = await this.agentService.findOpenSuspension?.({
			agentId: this.agentId,
			threadId,
		});
		if (!open) return false;

		try {
			await thread.post(stillWaitingNotice(open.suspendPayload));
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to post the still-waiting notice', {
				agentId: this.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
		return true;
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
			// A `UserError` is written for people and names the misconfiguration,
			// which lets an agent owner fix it without reading server logs.
			const text =
				error instanceof UserError
					? `⚠️ This agent is misconfigured: ${error.message} An agent owner has to fix this in n8n.`
					: '⚠️ Something went wrong while processing your request. Please try again.';
			await thread.post(text);
		} catch (postError) {
			this.logger.error('[AgentChatBridge] Failed to post error message', {
				agentId: this.agentId,
				error: postError instanceof Error ? postError.message : String(postError),
			});
		}
	}
}
