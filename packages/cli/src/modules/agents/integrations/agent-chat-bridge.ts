import type { AgentMessage, StreamChunk } from '@n8n/agents';
import { Container } from '@n8n/di';
import type { ActionEvent, Author, Chat, Message, MessageSubject, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { AgentsService } from '../agents.service';
import type { RichSuspendPayload } from '../types';
import { integrationMemoryResourceId } from '../utils/agent-memory-scope';
import type { AgentChatIntegration } from './agent-chat-integration';
import { ChatIntegrationRegistry } from './agent-chat-integration';
import { CallbackStore } from './callback-store';
import { RICH_INTERACTION_RESUME_JSON_SCHEMA, type ComponentMapper } from './component-mapper';
import { IntegrationMessageContextService } from './integration-message-context.service';
import {
	buildIntegrationConnectionId,
	type IntegrationMessageContext,
	type IntegrationMessageSubject,
} from './integration-tools';
import { type InternalThread, type TextEndFn, type TextYieldFn, toInternalThreadId } from './types';
import type { AgentIntegrationConfig } from '@n8n/api-types';

interface PlatformAgentContext {
	agentUserId?: string;
}

interface SlackThreadContext {
	channelId: string;
	threadTs: string;
	hasRealThreadTs: boolean;
}

interface SlackAssistantStatusAdapter {
	setAssistantStatus(
		channelId: string,
		threadTs: string,
		status: string,
		loadingMessages?: string[],
	): Promise<void>;
}

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

const SLACK_THINKING_STATUS = 'Thinking...';
const SLACK_STATUS_RETRY_DELAY_MS = 750;

function isIntegrationActionSuspendPayload(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'integration_action'
	);
}

function toIntegrationMessageSubject(
	subject: MessageSubject | null | undefined,
): IntegrationMessageSubject | undefined {
	if (!subject || typeof subject.type !== 'string' || typeof subject.id !== 'string') {
		return undefined;
	}

	const assignee = toIntegrationSubjectPerson(subject.assignee);
	const author = toIntegrationSubjectPerson(subject.author);
	const labels = subject.labels?.filter((label) => typeof label === 'string');

	return {
		type: subject.type,
		id: subject.id,
		...(typeof subject.title === 'string' ? { title: subject.title } : {}),
		...(typeof subject.description === 'string' ? { description: subject.description } : {}),
		...(typeof subject.url === 'string' ? { url: subject.url } : {}),
		...(typeof subject.status === 'string' ? { status: subject.status } : {}),
		...(labels && labels.length > 0 ? { labels } : {}),
		...(assignee ? { assignee } : {}),
		...(author ? { author } : {}),
	};
}

function toIntegrationSubjectPerson(
	person: MessageSubject['assignee'] | MessageSubject['author'],
): IntegrationMessageSubject['assignee'] | undefined {
	if (!person || typeof person.id !== 'string' || typeof person.name !== 'string') {
		return undefined;
	}
	return {
		id: person.id,
		name: person.name,
	};
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
	/** Short-lived set of run IDs that have been resumed to prevent double resumption */
	private readonly activeResumedRuns = new Set<string>();

	/** Store for shortening callback data on platforms with size limits (Telegram) */
	private readonly callbackStore?: CallbackStore;

	/** When true, buffer deltas and post as a single message (see integration flag). */
	private readonly disableStreaming: boolean;

	/** Resolved integration for this platform (may be undefined for unknown types). */
	private readonly integrationImpl: AgentChatIntegration | undefined;

	/**
	 * In-flight `rich_interaction` tool inputs keyed by toolCallId. Populated on
	 * the `tool-call` chunk; consumed on the matching `tool-result` chunk when
	 * the result carries `displayOnly: true` (display-only render path) or
	 * cleared on `tool-call-suspended` (interactive HITL path, where the
	 * suspendPayload itself carries the components).
	 *
	 * Storing the input here is the cleanest way to render a display-only
	 * card from the bridge without leaking chat-SDK semantics into the agent
	 * framework: the framework just emits tool-call/tool-result; the bridge
	 * decides which results trigger a card post.
	 */
	private readonly richInteractionInputs = new Map<string, unknown>();

	constructor(
		private readonly chat: Chat,
		private readonly agentId: string,
		private readonly agentService: AgentExecutor,
		private readonly componentMapper: ComponentMapper,
		private readonly logger: Logger,
		private readonly n8nProjectId: string,
		private readonly integration: AgentIntegrationConfig,
		private readonly messageContextStore?: IntegrationMessageContextService,
	) {
		this.integrationImpl = Container.get(ChatIntegrationRegistry).get(integration.type);
		if (this.integrationImpl?.needsShortCallbackData) {
			this.callbackStore = new CallbackStore();
		}
		this.disableStreaming = this.integrationImpl?.disableStreaming ?? false;
		this.registerHandlers();
	}

	// ---------------------------------------------------------------------------
	// Static factory
	// ---------------------------------------------------------------------------

	static create(
		chat: Chat,
		agentId: string,
		agentService: AgentsService,
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
				await this.handleAction(event);
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
	private getShortenCallback():
		| ((actionId: string, value: string) => Promise<{ id: string; value: string }>)
		| undefined {
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
		const slackThreadContext = this.getSlackThreadContext(message);
		const useNativeSlackThreadFeatures =
			this.integration.type !== 'slack' || slackThreadContext?.hasRealThreadTs === true;
		const statusRetry = new AbortController();
		// startThinkingStatus (Slack assistant.threads.setStatus) and the lazy
		// `message.subject` fetch are both remote round-trips on independent
		// resources — run them concurrently.
		const [, subject] = await Promise.all([
			this.startThinkingStatus(thread, slackThreadContext, statusRetry.signal),
			this.resolveMessageSubject(message),
		]);
		await this.updateLatestMessageContext(threadId.id, message.author.userId, thread, {
			messageId: message.id,
			interactingUserId: message.author.userId,
			...platformAgentContext,
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
			await this.consumeStream(stream, thread, {
				forceBuffered: this.integration.type === 'slack' && !useNativeSlackThreadFeatures,
			});
		} finally {
			statusRetry.abort();
		}
	}

	// ---------------------------------------------------------------------------
	// Stream consumer
	// ---------------------------------------------------------------------------

	/**
	 * Consume the agent stream and post to the thread.
	 *
	 * Default: pipe text deltas as an AsyncIterable<string> to `thread.post()`
	 * so Chat SDK can render incrementally (post-and-edit). Integrations that
	 * set `disableStreaming` short-circuit to `consumeStreamBuffered`, which
	 * accumulates deltas into a string and posts them as a single message per
	 * flush event (used by Telegram to avoid Markdown streaming issues).
	 *
	 * In both strategies, non-text chunks (`tool-call-suspended`, `message`,
	 * `error`) flush any pending text first, then get handled in order.
	 */
	private async consumeStream(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread,
		options: { forceBuffered?: boolean } = {},
	): Promise<void> {
		if (this.disableStreaming || options.forceBuffered) {
			await this.consumeStreamBuffered(stream, thread);
			return;
		}

		// Controller for the text stream iterable that Chat SDK consumes.
		// These are reassigned inside `createTextIterable()` (called transitively
		// by `ensureStreamingPost()`). TypeScript cannot track mutations through
		// closures, so it incorrectly narrows these to `never` after the
		// assignment. We use a wrapper object to avoid the TS closure analysis issue.
		const textStream: { yield: TextYieldFn | null; end: TextEndFn | null } = {
			yield: null,
			end: null,
		};
		let streamingPost: Promise<unknown> | null = null;

		const createTextIterable = (): AsyncIterable<string> => {
			const queue: string[] = [];
			let done = false;
			let waiting: ((result: IteratorResult<string>) => void) | null = null;

			textStream.yield = (text: string) => {
				if (waiting) {
					const resolve = waiting;
					waiting = null;
					resolve({ value: text, done: false });
				} else {
					queue.push(text);
				}
			};

			textStream.end = () => {
				done = true;
				if (waiting) {
					const resolve = waiting;
					waiting = null;
					resolve({ value: '', done: true });
				}
			};

			return {
				[Symbol.asyncIterator]() {
					return {
						async next(): Promise<IteratorResult<string>> {
							if (queue.length > 0) {
								return { value: queue.shift()!, done: false };
							}
							if (done) {
								return { value: '', done: true };
							}
							return await new Promise((resolve) => {
								waiting = resolve;
							});
						},
					};
				},
			};
		};

		const startStreamingPost = () => {
			const iterable = createTextIterable();
			streamingPost = thread.post(iterable).catch((postError: unknown) => {
				this.logger.error('[AgentChatBridge] Streaming post failed', {
					error: postError instanceof Error ? postError.message : String(postError),
				});
			});
		};

		const endStreamingPost = async () => {
			if (textStream.end) {
				textStream.end();
				textStream.end = null;
				textStream.yield = null;
			}
			if (streamingPost) {
				await streamingPost;
				streamingPost = null;
			}
		};

		// Don't start streaming post eagerly — wait for first text delta
		const ensureStreamingPost = () => {
			if (!streamingPost) startStreamingPost();
		};

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta': {
						const { delta } = chunk;
						ensureStreamingPost();
						textStream.yield?.(delta);
						break;
					}
					case 'reasoning-delta': {
						const { delta } = chunk;
						ensureStreamingPost();
						textStream.yield?.(`_${delta}_`);
						break;
					}
					case 'tool-call':
						this.stashRichInteractionInput(chunk);
						break;
					case 'tool-call-suspended':
						this.richInteractionInputs.delete(chunk.toolCallId);
						await endStreamingPost();
						await this.handleSuspension(chunk, thread);
						// Don't start new streaming post — wait for next text delta
						break;
					case 'tool-result':
						if (this.isRichInteractionDisplayOnly(chunk)) {
							await endStreamingPost();
							await this.handleDisplayOnly(chunk, thread);
						} else {
							this.richInteractionInputs.delete(chunk.toolCallId);
						}
						break;
					case 'message':
						await endStreamingPost();
						await this.handleMessage(chunk, thread);
						break;
					case 'error':
						await endStreamingPost();
						await this.postErrorToThread(thread, chunk.error);
						break;
					default:
						// Ignore other chunk types (finish, tool-input-*,
						// start-step, finish-step, etc.)
						break;
				}
			}
		} finally {
			// Always end the streaming post and drop stashed tool-call inputs so
			// a stream that errors mid-flight between `tool-call` and the
			// matching `tool-result` does not leak entries.
			await endStreamingPost();
			this.richInteractionInputs.clear();
		}
	}

	/**
	 * Buffered consumer — accumulates text/reasoning deltas and posts them as a
	 * single message per flush. Used when the integration disables streaming
	 * (e.g. Telegram).
	 */
	private async consumeStreamBuffered(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread,
	): Promise<void> {
		let buffer = '';

		const flushBuffer = async () => {
			const text = buffer;
			buffer = '';
			if (!text.trim()) return;
			try {
				// Chat SDK's streaming path wraps accumulated deltas as `{ markdown }`
				// so the platform adapter applies its markdown parse-mode (Telegram:
				// sendMessage with parse_mode=Markdown). A raw string bypasses that
				// and renders as plain text, so we post the buffered message the same
				// shape the streaming path uses under the hood.
				await thread.post({ markdown: text });
			} catch (postError: unknown) {
				await this.postErrorToThread(thread, postError);
				this.logger.error('[AgentChatBridge] Buffered post failed', {
					error: postError instanceof Error ? postError.message : String(postError),
				});
			}
		};

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta':
						buffer += chunk.delta;
						break;
					case 'reasoning-delta':
						buffer += `_${chunk.delta}_`;
						break;
					case 'tool-call':
						this.stashRichInteractionInput(chunk);
						break;
					case 'tool-call-suspended':
						this.richInteractionInputs.delete(chunk.toolCallId);
						await flushBuffer();
						await this.handleSuspension(chunk, thread);
						break;
					case 'tool-result':
						if (this.isRichInteractionDisplayOnly(chunk)) {
							await flushBuffer();
							await this.handleDisplayOnly(chunk, thread);
						} else {
							this.richInteractionInputs.delete(chunk.toolCallId);
						}
						break;
					case 'message':
						await flushBuffer();
						await this.handleMessage(chunk, thread);
						break;
					case 'error':
						await flushBuffer();
						await this.postErrorToThread(thread, chunk.error);
						break;
					default:
						break;
				}
			}
		} finally {
			await flushBuffer();
			this.richInteractionInputs.clear();
		}
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

		// Rich interaction tool — use the structured payload directly.
		// The payload IS the tool input (title, message, components array).
		if (chunk.toolName === 'rich_interaction') {
			await this.handleRichInteraction(chunk, thread);
			return;
		}

		const payload = suspendPayload as RichSuspendPayload | Record<string, unknown> | undefined;
		if (isIntegrationActionSuspendPayload(payload)) {
			return;
		}
		const hasComponents =
			payload &&
			'components' in payload &&
			Array.isArray(payload.components) &&
			payload.components.length > 0;

		let cardPayload: {
			title?: string;
			components: Array<{ type: string; [key: string]: unknown }>;
		};

		if (hasComponents) {
			cardPayload = payload as RichSuspendPayload;
		} else {
			// Plain suspend payload — auto-generate approve/deny buttons
			const message =
				payload && typeof payload === 'object' && 'message' in payload
					? String(payload.message)
					: 'Action required — approve or deny?';

			cardPayload = {
				title: message,
				components: [
					{ type: 'button', label: 'Approve', value: 'true', style: 'primary' },
					{ type: 'button', label: 'Deny', value: 'false', style: 'danger' },
				],
			};
		}

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
	// Rich interaction handling
	// ---------------------------------------------------------------------------

	private async handleRichInteraction(
		chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
		thread: Thread,
	): Promise<void> {
		const { runId, toolCallId, suspendPayload } = chunk;

		const payload = suspendPayload as {
			title?: string;
			message?: string;
			components?: Array<{ type: string; [key: string]: unknown }>;
		};

		if (!payload?.components?.length) {
			this.logger.warn('[AgentChatBridge] rich_interaction has no components');
			return;
		}

		try {
			const card = await this.componentMapper.toCard(
				payload as {
					title?: string;
					message?: string;
					components: Array<{ type: string; [key: string]: unknown }>;
				},
				runId,
				toolCallId,
				RICH_INTERACTION_RESUME_JSON_SCHEMA,
				this.getShortenCallback(),
				this.integration.type,
			);
			await thread.post(card);
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post rich interaction card', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// ---------------------------------------------------------------------------
	// Display-only card handling (no suspension)
	//
	// `rich_interaction` returns `{ displayOnly: true }` from its handler when
	// the card has no actionable components. The bridge stashes the tool-call
	// input on the way down (carrying the components) and posts the card when
	// the matching tool-result arrives carrying the marker. The framework
	// itself stays free of any chat-rendering semantics.
	// ---------------------------------------------------------------------------

	private stashRichInteractionInput(chunk: Extract<StreamChunk, { type: 'tool-call' }>): void {
		if (chunk.toolName !== 'rich_interaction') return;
		this.richInteractionInputs.set(chunk.toolCallId, chunk.input);
	}

	private isRichInteractionDisplayOnly(
		chunk: Extract<StreamChunk, { type: 'tool-result' }>,
	): boolean {
		if (chunk.toolName !== 'rich_interaction') return false;
		const out = chunk.output;
		return (
			typeof out === 'object' &&
			out !== null &&
			'displayOnly' in out &&
			(out as { displayOnly: unknown }).displayOnly === true
		);
	}

	/**
	 * Render the stashed `rich_interaction` input as a display-only card. No
	 * resume callback can fire (no buttons/selects), so we pass a placeholder
	 * runId — the unique IDs the component mapper builds for interactive
	 * elements never get used.
	 */
	private async handleDisplayOnly(
		chunk: Extract<StreamChunk, { type: 'tool-result' }>,
		thread: Thread,
	): Promise<void> {
		const { toolCallId } = chunk;
		const input = this.richInteractionInputs.get(toolCallId);
		this.richInteractionInputs.delete(toolCallId);

		const cardPayload = input as {
			title?: string;
			message?: string;
			components?: Array<{ type: string; [key: string]: unknown }>;
		};

		if (!cardPayload?.components?.length) {
			this.logger.warn('[AgentChatBridge] display-only rich_interaction has no components', {
				toolCallId,
			});
			return;
		}

		try {
			const card = await this.componentMapper.toCard(
				cardPayload as {
					title?: string;
					message?: string;
					components: Array<{ type: string; [key: string]: unknown }>;
				},
				'',
				toolCallId,
				RICH_INTERACTION_RESUME_JSON_SCHEMA,
				this.getShortenCallback(),
				this.integration.type,
			);
			await thread.post({ card });
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post display card', {
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

	// ---------------------------------------------------------------------------
	// Button interaction handling (HITL resume)
	// ---------------------------------------------------------------------------

	/** Parsed result from an action ID. */
	private parseActionId(
		actionId: string,
		value: string | undefined,
	): { runId: string; toolCallId: string; resumeData: unknown } | null {
		if (actionId.startsWith('ri-sel:')) {
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.logger.warn('[AgentChatBridge] Malformed ri-sel action ID', { actionId });
				return null;
			}
			return {
				runId: parts[2],
				toolCallId: parts.slice(3).join(':'),
				resumeData: { type: 'select', id: parts[1], value },
			};
		}

		if (actionId.startsWith('resume:')) {
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.logger.warn('[AgentChatBridge] Malformed action ID', { actionId });
				return null;
			}
			let resumeData: unknown;
			try {
				resumeData = JSON.parse(value ?? '');
			} catch {
				resumeData = { value };
			}
			return { runId: parts[1], toolCallId: parts.slice(2, -1).join(':'), resumeData };
		}

		return null;
	}

	/**
	 * Resolve short callback keys when the platform uses them (e.g. Telegram).
	 * Returns the resolved `{ actionId, value }` or `null` if expired/missing.
	 */
	private async resolveCallbackData(
		actionId: string,
		value: string | undefined,
		thread: Thread<unknown, unknown>,
	): Promise<{ actionId: string; value: string | undefined } | null> {
		if (!this.callbackStore) return { actionId, value };

		const resolved = await this.callbackStore.resolve(actionId);
		if (!resolved) {
			this.logger.warn('[AgentChatBridge] Callback key not found or expired', { actionId });
			await thread.post(
				'This action is no longer available. The link may have expired or already been used.',
			);
			return null;
		}
		return { actionId: resolved.actionId, value: resolved.value };
	}

	/**
	 * Delete the card message and apply platform-specific workarounds before
	 * resuming the agent.
	 */
	private async cleanUpBeforeResume(event: ActionEvent): Promise<void> {
		try {
			await event.adapter.deleteMessage(event.threadId, event.messageId);
		} catch (deleteError) {
			this.logger.warn('[AgentChatBridge] Failed to delete card message', {
				error: deleteError instanceof Error ? deleteError.message : String(deleteError),
			});
		}
	}

	/**
	 * Guard against double resumption, then resume the agent and stream the
	 * response back into the thread.
	 */
	private async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
	): Promise<void> {
		if (this.activeResumedRuns.has(runId)) {
			this.logger.warn('[AgentChatBridge] Run is already active', { runId, toolCallId });
			await thread.post('This action has already been handled');
			return;
		}

		this.activeResumedRuns.add(runId);
		try {
			await this.startThinkingStatus(thread);
			const stream = this.agentService.resumeForChat({
				agentId: this.agentId,
				projectId: this.n8nProjectId,
				runId,
				toolCallId,
				resumeData,
				integrationType: this.integration.type,
			});
			await this.consumeStream(stream, thread as Thread);
		} finally {
			this.activeResumedRuns.delete(runId);
		}
	}

	private async startThinkingStatus(
		thread: Thread<unknown, unknown>,
		slackThreadContext?: SlackThreadContext,
		statusRetrySignal?: AbortSignal,
	): Promise<void> {
		if (this.integration.type !== 'slack') return;

		if (slackThreadContext && !slackThreadContext.hasRealThreadTs) {
			this.setSlackAssistantStatus(slackThreadContext, statusRetrySignal);
			return;
		}

		try {
			await thread.startTyping(SLACK_THINKING_STATUS);
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', {
				agentId: this.agentId,
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private setSlackAssistantStatus(
		context: SlackThreadContext,
		statusRetrySignal?: AbortSignal,
	): void {
		const adapter = this.getSlackAssistantStatusAdapter();
		if (!adapter) return;

		void this.setSlackAssistantStatusWithRetry(adapter, context, statusRetrySignal);
	}

	private async setSlackAssistantStatusWithRetry(
		adapter: SlackAssistantStatusAdapter,
		context: SlackThreadContext,
		statusRetrySignal?: AbortSignal,
	): Promise<void> {
		try {
			await adapter.setAssistantStatus(context.channelId, context.threadTs, SLACK_THINKING_STATUS, [
				SLACK_THINKING_STATUS,
			]);
			return;
		} catch (error) {
			if (getSlackErrorCode(error) !== 'invalid_thread_ts') {
				this.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', {
					agentId: this.agentId,
					channelId: context.channelId,
					threadTs: context.threadTs,
					error: error instanceof Error ? error.message : String(error),
				});
				return;
			}
		}

		if (!(await sleep(SLACK_STATUS_RETRY_DELAY_MS, statusRetrySignal))) return;

		try {
			await adapter.setAssistantStatus(context.channelId, context.threadTs, SLACK_THINKING_STATUS, [
				SLACK_THINKING_STATUS,
			]);
		} catch (error) {
			const errorCode = getSlackErrorCode(error);
			const logPayload = {
				agentId: this.agentId,
				channelId: context.channelId,
				threadTs: context.threadTs,
				error: error instanceof Error ? error.message : String(error),
				...(errorCode ? { errorCode } : {}),
			};
			if (errorCode === 'invalid_thread_ts') {
				this.logger.debug(
					'[AgentChatBridge] Slack assistant status unavailable for thread',
					logPayload,
				);
				return;
			}
			this.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', logPayload);
		}
	}

	private getSlackThreadContext(message: Message<unknown>): SlackThreadContext | undefined {
		if (this.integration.type !== 'slack') return undefined;

		const raw = message.raw;
		if (!isRecord(raw)) return undefined;

		const channelId = stringValue(raw.channel);
		const realThreadTs = stringValue(raw.thread_ts);
		const threadTs = realThreadTs ?? stringValue(raw.ts);
		if (!channelId || !threadTs) return undefined;

		return {
			channelId,
			threadTs,
			hasRealThreadTs: realThreadTs !== undefined,
		};
	}

	private getSlackAssistantStatusAdapter(): SlackAssistantStatusAdapter | undefined {
		const adapter = this.chat.getAdapter('slack');
		return isSlackAssistantStatusAdapter(adapter) ? adapter : undefined;
	}

	private async updateLatestMessageContext(
		threadId: string,
		resourceId: string,
		thread: Thread<unknown, unknown>,
		options: {
			messageId?: string;
			interactingUserId?: string;
			agentUserId?: string;
			subject?: IntegrationMessageSubject;
		} = {},
	): Promise<IntegrationMessageContext | undefined> {
		if (!this.messageContextStore) return undefined;

		const integrationConnectionId = buildIntegrationConnectionId(this.integration);
		const previousContext = await this.getPreviousContext(threadId, integrationConnectionId);
		const agentUserId = options.agentUserId ?? previousContext?.agentUserId;
		const context: IntegrationMessageContext = {
			integrationConnectionId,
			platform: this.integration.type,
			target: {
				type: 'thread',
				threadId: thread.id,
				channelId: thread.channelId,
			},
			...(options.messageId ? { messageId: options.messageId } : {}),
			...(options.interactingUserId ? { interactingUserId: options.interactingUserId } : {}),
			...(agentUserId ? { agentUserId } : {}),
			...(options.subject ? { subject: options.subject } : {}),
			...(!options.subject && previousContext?.subject ? { subject: previousContext.subject } : {}),
			updatedAt: new Date().toISOString(),
		};

		try {
			await this.messageContextStore.setLatest(threadId, resourceId, context);
			return context;
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to update latest message context', {
				agentId: this.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private getPlatformAgentContext(): PlatformAgentContext {
		if (this.integration.type !== 'slack') return {};
		const adapter = this.chat.getAdapter(this.integration.type);
		if (!isRecord(adapter)) return {};
		const agentUserId = stringValue(adapter.botUserId);
		return agentUserId ? { agentUserId } : {};
	}

	private prepareInboundText(text: string | undefined, context: PlatformAgentContext): string {
		const trimmed = text?.trim() ?? '';
		if (this.integration.type !== 'slack' || !context.agentUserId) return trimmed;
		return stripSlackSelfMention(trimmed, context.agentUserId);
	}

	private async getPreviousContext(
		threadId: string,
		integrationConnectionId: string,
	): Promise<IntegrationMessageContext | undefined> {
		if (!this.messageContextStore) return undefined;
		try {
			const previousContext = await this.messageContextStore.getLatest(threadId);
			if (previousContext?.integrationConnectionId !== integrationConnectionId) {
				return undefined;
			}
			return previousContext;
		} catch (error) {
			this.logger.warn('[AgentChatBridge] Failed to read previous message context', {
				agentId: this.agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private async resolveMessageSubject(
		message: Message<unknown>,
	): Promise<IntegrationMessageSubject | undefined> {
		try {
			return toIntegrationMessageSubject(await message.subject);
		} catch (error) {
			this.logger.debug(
				`[AgentChatBridge] Failed to fetch message subject: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			return undefined;
		}
	}

	/**
	 * Handle a button/select action. Action IDs use one of two prefixes:
	 * - `ri-sel:{selectId}:{runId}:{toolCallId}` — rich interaction select
	 * - `resume:{runId}:{toolCallId}:{index}` — generic per-tool resume button
	 */
	private async handleAction(event: ActionEvent): Promise<void> {
		const { thread } = event;

		if (!thread) {
			this.logger.warn('[AgentChatBridge] Thread is not set for event', {
				threadId: event.threadId,
				actionId: event.actionId,
			});
			return;
		}

		const callbackData = await this.resolveCallbackData(event.actionId, event.value, thread);
		if (!callbackData) return;

		const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
		if (!parsed) return;
		// Persist the interacting user / messageId into the thread's message
		// context so tools running on resume can read it via the message
		// context store — no need to bolt a duplicate copy onto resumeData.
		const platformThreadId = this.resolvePlatformThreadId(thread);
		const threadId = this.toAgentThreadId(platformThreadId);
		await this.updateLatestMessageContext(threadId.id, event.user.userId, thread, {
			messageId: event.messageId,
			interactingUserId: event.user.userId,
			...this.getPlatformAgentContext(),
		});

		await this.cleanUpBeforeResume(event);
		await this.executeResume(thread, parsed.runId, parsed.toolCallId, parsed.resumeData);
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

function stripSlackSelfMention(text: string, userId: string): string {
	const escapedUserId = escapeRegExp(userId);
	return text
		.replace(new RegExp(`(^|\\s)<@!?${escapedUserId}(?:\\|[^>]+)?>`, 'gi'), '$1')
		.replace(new RegExp(`(^|\\s)@${escapedUserId}\\b`, 'gi'), '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSlackAssistantStatusAdapter(value: unknown): value is SlackAssistantStatusAdapter {
	return isRecord(value) && typeof value.setAssistantStatus === 'function';
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSlackErrorCode(error: unknown): string | undefined {
	if (!isRecord(error)) return undefined;
	const data = error.data;
	if (!isRecord(data)) return undefined;
	return stringValue(data.error);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return false;
	return await new Promise((resolve) => {
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', abort);
			resolve(true);
		}, ms);
		const abort = () => {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', abort);
			resolve(false);
		};
		signal?.addEventListener('abort', abort, { once: true });
	});
}
