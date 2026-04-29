import type { AgentMessage, CredentialProvider, StreamChunk } from '@n8n/agents';
import { Container } from '@n8n/di';
import type { Logger } from 'n8n-workflow';

import type { AgentsService } from '../agents.service';
import type { RichSuspendPayload } from '../types';
import { ChatIntegrationRegistry } from './agent-chat-integration';
import { CallbackStore } from './callback-store';
import type { ComponentMapper } from './component-mapper';

/**
 * Subset of `AgentsService` consumed by the bridge.
 * Defined as an interface to avoid circular imports and simplify testing.
 */
interface AgentExecutor {
	executeForChat(
		agentId: string,
		message: string | AgentMessage[],
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		integrationType?: string,
	): AsyncGenerator<StreamChunk>;

	executeForChatPublished(
		agentId: string,
		message: string | AgentMessage[],
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
		integrationType?: string,
	): AsyncGenerator<StreamChunk>;

	resumeForChat(
		agentId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		threadId?: string,
		userId?: string,
		projectId?: string,
	): AsyncGenerator<StreamChunk>;
}

// ---------------------------------------------------------------------------
// Chat SDK local interfaces
//
// The `chat` package is ESM-only so we cannot use top-level imports.
// These interfaces mirror the subset of the Chat SDK API we consume.
// ---------------------------------------------------------------------------

interface ChatBot {
	onNewMention: (handler: (thread: ChatThread, message: ChatMessage) => Promise<void>) => void;
	onSubscribedMessage: (
		handler: (thread: ChatThread, message: ChatMessage) => Promise<void>,
	) => void;
	onAction: (handler: (event: ChatActionEvent) => Promise<void>) => void;
}

interface ChatThread {
	id: string;
	subscribe: () => Promise<void>;
	post: (content: unknown) => Promise<unknown>;
}

interface ChatAttachment {
	type?: string;
	url?: string;
	name?: string;
	mimeType?: string;
	size?: number;
	width?: number;
	height?: number;
	fetchData?: () => Promise<Buffer>;
}

interface ChatMessage {
	text: string;
	author: { userId: string };
	attachments?: ChatAttachment[];
}

interface ChatActionEvent {
	actionId: string;
	value: string;
	thread: ChatThread;
	threadId: string;
	messageId: string;
	adapter: { deleteMessage(threadId: string, messageId: string): Promise<void> };
	userId: string;
}

/** Callback that pushes a text fragment into the streaming iterable. */
type TextYieldFn = (text: string) => void;
/** Callback that signals the end of the streaming iterable. */
type TextEndFn = () => void;

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

	constructor(
		private readonly bot: ChatBot,
		private readonly agentId: string,
		private readonly agentService: AgentExecutor,
		private readonly credentialProvider: CredentialProvider,
		private readonly componentMapper: ComponentMapper,
		private readonly logger: Logger,
		private readonly n8nUserId: string,
		private readonly n8nProjectId: string,
		private readonly integrationType: string,
	) {
		const integration = Container.get(ChatIntegrationRegistry).get(integrationType);
		if (integration?.needsShortCallbackData) {
			this.callbackStore = new CallbackStore();
		}
		this.disableStreaming = integration?.disableStreaming ?? false;
		this.registerHandlers();
	}

	// ---------------------------------------------------------------------------
	// Static factory — validates that the bot has expected handler methods
	// ---------------------------------------------------------------------------

	static create(
		bot: unknown,
		agentId: string,
		agentService: AgentsService,
		credentialProvider: CredentialProvider,
		componentMapper: ComponentMapper,
		logger: Logger,
		n8nUserId: string,
		n8nProjectId: string,
		integrationType: string,
	): AgentChatBridge {
		return new AgentChatBridge(
			bot as ChatBot,
			agentId,
			agentService,
			credentialProvider,
			componentMapper,
			logger,
			n8nUserId,
			n8nProjectId,
			integrationType,
		);
	}

	// ---------------------------------------------------------------------------
	// Handler registration
	// ---------------------------------------------------------------------------

	private registerHandlers(): void {
		this.bot.onNewMention(async (thread, message) => {
			try {
				await thread.subscribe();
				await this.executeAndStream(thread, message);
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.bot.onSubscribedMessage(async (thread, message) => {
			try {
				await this.executeAndStream(thread, message);
			} catch (error) {
				await this.postErrorToThread(thread, error);
			}
		});

		this.bot.onAction(async (event) => {
			try {
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

	private async executeAndStream(thread: ChatThread, message: ChatMessage): Promise<void> {
		const text = message.text?.trim();
		const attachments = message.attachments ?? [];
		if (!text && attachments.length === 0) return;

		// If the user attached files, build a multimodal AgentMessage so vision
		// models see them as inline file parts. Plain text is forwarded as a
		// string for backwards compatibility with the existing path.
		const input =
			attachments.length > 0
				? await this.buildUserMessageWithAttachments(text ?? '', attachments)
				: (text ?? '');

		// Use the n8n user ID (who connected the integration) for agent compilation
		// and RBAC, and the platform user ID for memory/thread context.
		// Always run the published snapshot — integrations are production traffic.
		const stream = this.agentService.executeForChatPublished(
			this.agentId,
			input,
			thread.id,
			this.n8nUserId,
			this.n8nProjectId,
			this.credentialProvider,
			this.integrationType,
		);

		await this.consumeStream(stream, thread);
	}

	/**
	 * Convert Chat SDK attachments into an `AgentMessage` with text + file
	 * content parts. Attachments without `fetchData` (and no public URL) are
	 * skipped — the agent can't see them, but the user's text still flows
	 * through.
	 */
	private async buildUserMessageWithAttachments(
		text: string,
		attachments: ChatAttachment[],
	): Promise<AgentMessage[]> {
		const content: Array<
			{ type: 'text'; text: string } | { type: 'file'; data: Buffer | string; mediaType?: string }
		> = [];

		if (text.trim()) content.push({ type: 'text', text });

		for (const att of attachments) {
			let data: Buffer | string | undefined;
			if (att.fetchData) {
				try {
					data = await att.fetchData();
				} catch (error) {
					this.logger.warn('[AgentChatBridge] Failed to fetch attachment data', {
						name: att.name,
						error: error instanceof Error ? error.message : String(error),
					});
					continue;
				}
			} else if (att.url) {
				// Pass the URL through as a string — the AI SDK accepts URLs as
				// file part data and will fetch them at request time.
				data = att.url;
			}
			if (data === undefined) continue;
			content.push({ type: 'file', data, mediaType: att.mimeType });
		}

		return [{ role: 'user', content }];
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
		thread: ChatThread,
	): Promise<void> {
		if (this.disableStreaming) {
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
				case 'tool-call-suspended':
					await endStreamingPost();
					await this.handleSuspension(chunk, thread);
					// Don't start new streaming post — wait for next text delta
					break;
				case 'tool-card-display':
					await endStreamingPost();
					await this.handleCardDisplay(chunk, thread);
					break;
				case 'tool-file-display':
					await endStreamingPost();
					await this.handleFileDisplay(chunk, thread);
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
					// Ignore other chunk types (finish, tool-input-*, tool-call,
					// tool-result, start-step, finish-step, etc.)
					break;
			}
		}

		await endStreamingPost();
	}

	/**
	 * Buffered consumer — accumulates text/reasoning deltas and posts them as a
	 * single message per flush. Used when the integration disables streaming
	 * (e.g. Telegram).
	 */
	private async consumeStreamBuffered(
		stream: AsyncGenerator<StreamChunk>,
		thread: ChatThread,
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
				this.logger.error('[AgentChatBridge] Buffered post failed', {
					error: postError instanceof Error ? postError.message : String(postError),
				});
			}
		};

		for await (const chunk of stream) {
			switch (chunk.type) {
				case 'text-delta':
					buffer += chunk.delta;
					break;
				case 'reasoning-delta':
					buffer += `_${chunk.delta}_`;
					break;
				case 'tool-call-suspended':
					await flushBuffer();
					await this.handleSuspension(chunk, thread);
					break;
				case 'tool-card-display':
					await flushBuffer();
					await this.handleCardDisplay(chunk, thread);
					break;
				case 'tool-file-display':
					await flushBuffer();
					await this.handleFileDisplay(chunk, thread);
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

		await flushBuffer();
	}

	// ---------------------------------------------------------------------------
	// Suspension handling (HITL tool cards)
	// ---------------------------------------------------------------------------

	private async handleSuspension(
		chunk: Extract<StreamChunk, { type: 'tool-call-suspended' }>,
		thread: ChatThread,
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
				this.integrationType,
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
		thread: ChatThread,
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

		// Use a resume schema that tells ComponentMapper to encode buttons as
		// { type: 'button', value: '...' } for the discriminated union
		const riResumeSchema = {
			type: 'object',
			properties: {
				type: { type: 'string' },
				value: { type: 'string' },
			},
		};

		try {
			const card = await this.componentMapper.toCard(
				payload as {
					title?: string;
					message?: string;
					components: Array<{ type: string; [key: string]: unknown }>;
				},
				runId,
				toolCallId,
				riResumeSchema,
				this.getShortenCallback(),
				this.integrationType,
			);
			await thread.post({ card });
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post rich interaction card', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// ---------------------------------------------------------------------------
	// Display-only card handling (no suspension)
	// ---------------------------------------------------------------------------

	/**
	 * Render a card emitted via `ctx.display()` — same payload shape as the
	 * suspending `rich_interaction` path, but the agent run continues. We pass a
	 * minimal resume schema because the card has no interactive surface, so no
	 * resume callback will be invoked.
	 */
	private async handleCardDisplay(
		chunk: Extract<StreamChunk, { type: 'tool-card-display' }>,
		thread: ChatThread,
	): Promise<void> {
		const { runId, toolCallId, payload } = chunk;

		const cardPayload = payload as {
			title?: string;
			message?: string;
			components?: Array<{ type: string; [key: string]: unknown }>;
		};

		if (!cardPayload?.components?.length) {
			this.logger.warn('[AgentChatBridge] tool-card-display has no components');
			return;
		}

		const displayResumeSchema = {
			type: 'object',
			properties: { type: { type: 'string' }, value: { type: 'string' } },
		};

		try {
			const card = await this.componentMapper.toCard(
				cardPayload as {
					title?: string;
					message?: string;
					components: Array<{ type: string; [key: string]: unknown }>;
				},
				runId,
				toolCallId,
				displayResumeSchema,
				this.getShortenCallback(),
				this.integrationType,
			);
			await thread.post({ card });
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post display card', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// ---------------------------------------------------------------------------
	// File-attachment handling (no suspension)
	// ---------------------------------------------------------------------------

	/**
	 * Render a file batch emitted via `ctx.sendFiles()`. Translates the
	 * runtime's `ToolFileAttachment` shape (data may be string/ArrayBuffer)
	 * into Chat SDK's `{ data: Buffer, filename, mimeType }` shape and posts
	 * via `thread.post({ markdown, files })`.
	 */
	private async handleFileDisplay(
		chunk: Extract<StreamChunk, { type: 'tool-file-display' }>,
		thread: ChatThread,
	): Promise<void> {
		if (!chunk.files?.length) {
			this.logger.warn('[AgentChatBridge] tool-file-display has no files');
			return;
		}

		const files = chunk.files.map((file) => ({
			data: this.toBuffer(file.data),
			filename: file.filename,
			mimeType: file.mimeType,
		}));

		try {
			await thread.post({ markdown: chunk.message ?? '', files });
		} catch (error) {
			this.logger.error('[AgentChatBridge] Failed to post files', {
				count: files.length,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private toBuffer(data: Uint8Array | ArrayBuffer | Buffer | string): Buffer {
		if (Buffer.isBuffer(data)) return data;
		if (typeof data === 'string') {
			// Base64-encoded — Chat SDK expects raw bytes.
			return Buffer.from(data, 'base64');
		}
		if (data instanceof ArrayBuffer) return Buffer.from(data);
		return Buffer.from(data);
	}

	// ---------------------------------------------------------------------------
	// Custom message handling (tool toMessage output)
	// ---------------------------------------------------------------------------

	private async handleMessage(
		chunk: Extract<StreamChunk, { type: 'message' }>,
		thread: ChatThread,
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

	/**
	 * Handle a button/select action. Action IDs use one of three prefixes:
	 * - `ri-btn:{runId}:{toolCallId}:{index}` — rich interaction button
	 * - `ri-sel:{selectId}:{runId}:{toolCallId}` — rich interaction select
	 * - `resume:{runId}:{toolCallId}:{index}` — generic per-tool resume button
	 */
	private async handleAction(event: ChatActionEvent): Promise<void> {
		let { actionId, value } = event;
		const { thread } = event;

		// Resolve short callback keys back to full action data. If the key is
		// missing the action was already handled or the entry expired — let the
		// user know rather than silently swallowing the click.
		if (this.callbackStore) {
			const resolved = await this.callbackStore.resolve(actionId);
			if (!resolved) {
				this.logger.warn('[AgentChatBridge] Callback key not found or expired', {
					actionId,
				});
				await thread.post(
					'This action is no longer available. The link may have expired or already been used.',
				);
				return;
			}
			actionId = resolved.actionId;
			value = resolved.value;
		}

		let runId: string;
		let toolCallId: string;
		let resumeData: unknown;

		if (actionId.startsWith('ri-btn:')) {
			// Rich interaction button: ri-btn:{runId}:{toolCallId}:{index}
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.logger.warn('[AgentChatBridge] Malformed ri-btn action ID', { actionId });
				return;
			}
			runId = parts[1];
			toolCallId = parts.slice(2, -1).join(':');
			try {
				resumeData = JSON.parse(value);
			} catch {
				resumeData = { type: 'button', value };
			}
		} else if (actionId.startsWith('ri-sel:')) {
			// Rich interaction select: ri-sel:{selectId}:{runId}:{toolCallId}
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.logger.warn('[AgentChatBridge] Malformed ri-sel action ID', { actionId });
				return;
			}
			const selectId = parts[1];
			runId = parts[2];
			toolCallId = parts.slice(3).join(':');
			resumeData = { type: 'select', id: selectId, value };
		} else if (actionId.startsWith('resume:')) {
			// Existing per-tool resume: resume:{runId}:{toolCallId}:{index}
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.logger.warn('[AgentChatBridge] Malformed action ID', { actionId });
				return;
			}
			runId = parts[1];
			toolCallId = parts.slice(2, -1).join(':');
			try {
				resumeData = JSON.parse(value);
			} catch {
				resumeData = { value };
			}
		} else {
			return;
		}

		// --- Everything below is the same for all prefixes ---

		const isRunActive = this.activeResumedRuns.has(runId);

		if (isRunActive) {
			this.logger.warn('[AgentChatBridge] Run is already active', { runId, toolCallId });
			await thread.post('This action has already been handled');
			return;
		}
		this.activeResumedRuns.add(runId);
		try {
			// Delete the card message
			try {
				await event.adapter.deleteMessage(event.threadId, event.messageId);
			} catch (deleteError) {
				this.logger.warn('[AgentChatBridge] Failed to delete card message', {
					error: deleteError instanceof Error ? deleteError.message : String(deleteError),
				});
			}

			// TODO(chat-sdk-bug): Remove when Chat SDK normalises Slack interaction
			// payloads. Slack sends `team: { id: "T..." }` (object) but Chat SDK's
			// streaming path expects `team_id: "T..."` (string) on the raw message.
			// We patch the thread's internal `_currentMessage.raw` to bridge this.
			interface ThreadWithRaw {
				_currentMessage?: { raw?: Record<string, unknown> };
			}
			const threadInternal = thread as unknown as ThreadWithRaw;
			if (threadInternal._currentMessage?.raw) {
				const raw = threadInternal._currentMessage.raw;
				if (raw.team && typeof raw.team === 'object' && !raw.team_id) {
					raw.team_id = (raw.team as Record<string, string>).id;
				}
			}

			// Resume the agent and stream the response
			const stream = this.agentService.resumeForChat(
				this.agentId,
				runId,
				toolCallId,
				resumeData,
				thread.id,
				this.n8nUserId,
				this.n8nProjectId,
			);
			await this.consumeStream(stream, thread);
		} finally {
			this.activeResumedRuns.delete(runId);
		}
	}

	// ---------------------------------------------------------------------------
	// Error posting
	// ---------------------------------------------------------------------------

	private async postErrorToThread(thread: ChatThread, error: unknown): Promise<void> {
		const message = error instanceof Error ? error.message : 'An unexpected error occurred';

		this.logger.error('[AgentChatBridge] Error in handler', {
			agentId: this.agentId,
			threadId: thread.id,
			error: message,
		});

		try {
			await thread.post('⚠️ Something went wrong while processing your request. Please try again.');
		} catch (postError) {
			this.logger.error('[AgentChatBridge] Failed to post error message', {
				agentId: this.agentId,
				error: postError instanceof Error ? postError.message : String(postError),
			});
		}
	}
}
