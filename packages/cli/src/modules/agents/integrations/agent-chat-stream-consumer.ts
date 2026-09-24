import type { StreamChunk } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';
import { OperationalError, type Logger } from 'n8n-workflow';

import type { BridgeStatusHandle } from './agent-chat-integration';
import { isIntegrationActionSuspendPayload } from './agent-chat-suspension-cards';
import { type TextEndFn, type TextYieldFn } from './types';
import { isRateLimitedToolOutput } from './channel-rate-limit';

type SuspendedChunk = Extract<StreamChunk, { type: 'tool-call-suspended' }>;
type MessageChunk = Extract<StreamChunk, { type: 'message' }>;
type ToolResultChunk = Extract<StreamChunk, { type: 'tool-result' }>;

export type SuspensionHandlingResult = 'posted' | 'skipped' | 'failed';

/**
 * A post that rejected counts as settled: its handler has already told the user,
 * and the platform may have rendered part of the reply, so the text must not be
 * posted again either way. Only a post that never settles is 'stalled'.
 */
type StreamingPostOutcome = 'settled' | 'stalled';

interface AgentChatStreamConsumerOptions {
	disableStreaming: boolean;
	logger: Logger;
	postErrorToThread: (
		thread: Thread<unknown, unknown> | null,
		error: unknown,
		throwOnDeliveryError?: boolean,
	) => Promise<void>;
	handleSuspension: (
		chunk: SuspendedChunk,
		thread: Thread<unknown, unknown>,
	) => Promise<SuspensionHandlingResult>;
	handleMessage: (
		chunk: MessageChunk,
		thread: Thread<unknown, unknown>,
		throwOnDeliveryError?: boolean,
	) => Promise<boolean>;
	/**
	 * Identifies this bridge's integration action tool. Only its results are
	 * trusted for the `silent: true` outcome (`do_not_respond`) — arbitrary
	 * tools returning a `silent` field must not mute the reply.
	 */
	isIntegrationActionTool?: (toolName: string) => boolean;
	/**
	 * Give up on a streaming post that has not settled this long after the text
	 * stream ended, and post the accumulated text as an ordinary message
	 * instead. Unset means wait indefinitely.
	 */
	streamingPostTimeoutMs?: number;
	/**
	 * True when the platform renders only one streamed run per inbound turn.
	 * Text after the first run is buffered and posted as its own message.
	 */
	singleStreamedRunPerTurn?: boolean;
	/** Called when a streaming post had to be abandoned and posted buffered. */
	onStreamingPostStalled?: () => void;
}

interface ConsumeStreamOptions {
	forceBuffered?: boolean;
	/** Buffer output and report posting failures so the caller can retry. */
	throwOnDeliveryError?: boolean;
	statusHandle?: BridgeStatusHandle;
}

interface ResponseState {
	hasVisibleResponse: boolean;
	/**
	 * Set when the integration action tool reported a silent outcome
	 * (`do_not_respond`): the agent chose not to reply, so any text it still
	 * emits afterwards must not be posted.
	 */
	suppressText: boolean;
	/**
	 * Why a fallback error may need to be posted when the run ends. A
	 * 'tool-error' fallback is cleared by a later successful tool call (the
	 * retry recovered) and suppressed by visible output (the agent's own text
	 * explains the failure). A 'suspension' fallback is neither — the user
	 * still has an approval request they never received.
	 * A 'rate-limit' fallback is set when the integration action tool fails with a
	 * HTTP 429. The user must be informed that the integration is rate-limited.
	 */
	fallbackSource: 'tool-error' | 'suspension' | 'rate-limit' | null;
	fallbackError: unknown;
}

interface ResponseLifecycle {
	startStreamingResponse: () => Promise<void>;
	startDiscreteResponse: () => Promise<void>;
	finish: () => Promise<void>;
}

const createResponseState = (): ResponseState => ({
	hasVisibleResponse: false,
	suppressText: false,
	fallbackSource: null,
	fallbackError: null,
});

export class AgentChatStreamConsumer {
	constructor(private readonly options: AgentChatStreamConsumerOptions) {}

	async consume(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread<unknown, unknown>,
		options: ConsumeStreamOptions = {},
	): Promise<void> {
		if (this.options.disableStreaming || options.forceBuffered || options.throwOnDeliveryError) {
			await this.consumeBuffered(stream, thread, options);
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
		/** Text the platform is not yet known to have rendered. */
		let pendingText = '';
		/** Set once this turn must finish without streaming. */
		let streamingStopped = false;
		/**
		 * Only a platform that can stop streaming mid-turn ever re-reads the text,
		 * so nothing else pays for a second copy of every delta.
		 */
		const retainText =
			this.options.streamingPostTimeoutMs !== undefined ||
			this.options.singleStreamedRunPerTurn === true;
		/**
		 * Set when a post outlived its deadline and the turn recovered without it.
		 * Its rejection handler is already attached and cannot be detached, so it
		 * has to know to stay quiet: an error posted then would land after the
		 * reply the user already has, and after the turn is over.
		 */
		let streamingPostAbandoned = false;

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
			streamingPostAbandoned = false;
			streamingPost = thread.post(iterable).catch(async (postError: unknown) => {
				const message = postError instanceof Error ? postError.message : String(postError);
				if (streamingPostAbandoned) {
					this.options.logger.debug('[AgentChatBridge] Abandoned streaming post failed', {
						error: message,
					});
					return;
				}
				await this.options.postErrorToThread(thread, postError);
				this.options.logger.error('[AgentChatBridge] Streaming post failed', { error: message });
			});
		};

		const endStreamingPost = async () => {
			if (textStream.end) {
				textStream.end();
				textStream.end = null;
				textStream.yield = null;
			}
			if (streamingPost) {
				const post = streamingPost;
				streamingPost = null;
				// A platform that renders one streamed run per turn cannot open a
				// second one: Teams reuses a single open stream per inbound activity,
				// so a second run refills the first bubble, which sits above anything
				// posted in between.
				if (this.options.singleStreamedRunPerTurn) streamingStopped = true;
				const outcome = await this.awaitStreamingPost(post, thread);
				if (outcome === 'stalled') {
					streamingPostAbandoned = true;
					// Re-opening a stream the platform never acknowledged would stall
					// again, so the rest of the turn is buffered whatever the platform
					// asked for.
					streamingStopped = true;
					this.options.onStreamingPostStalled?.();
				} else {
					pendingText = '';
				}
			}
			const text = pendingText;
			pendingText = '';
			if (text.trim()) await this.postBufferedText(thread, text);
		};

		// Don't start streaming post eagerly — wait for first text delta
		const ensureStreamingPost = () => {
			if (streamingStopped) return;
			if (!streamingPost) startStreamingPost();
		};
		const responseLifecycle = this.createResponseLifecycle({
			statusHandle: options.statusHandle,
			ensureStreamingPost,
			endStreamingPost,
		});
		const responseState = createResponseState();

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta': {
						if (responseState.suppressText) break;
						const { delta } = chunk;
						await responseLifecycle.startStreamingResponse();
						if (retainText) pendingText += delta;
						textStream.yield?.(delta);
						if (delta.trim()) responseState.hasVisibleResponse = true;
						break;
					}
					case 'tool-call-suspended': {
						await responseLifecycle.startDiscreteResponse();
						const result = await this.options.handleSuspension(chunk, thread);
						responseState.hasVisibleResponse ||= result === 'posted';
						if (result === 'failed') {
							responseState.fallbackSource = 'suspension';
							responseState.fallbackError = new Error('Failed to post tool approval request');
						}
						// Don't start new streaming post — wait for next text delta
						break;
					}
					case 'message':
						await responseLifecycle.startDiscreteResponse();
						responseState.hasVisibleResponse ||= await this.options.handleMessage(chunk, thread);
						break;
					case 'error':
						await responseLifecycle.startDiscreteResponse();
						await this.options.postErrorToThread(thread, chunk.error);
						responseState.hasVisibleResponse = true;
						break;
					case 'tool-result':
						this.noteToolResult(chunk, responseState);
						if (this.isSilentOutcome(chunk)) {
							responseState.suppressText = true;
							// Streamed text is already on the platform, but text still
							// pending is not, so the silence can be honored for it.
							pendingText = '';
						}
						break;
					default:
						// Ignore non-user-visible chunks (reasoning, finish,
						// tool-input-*, start-step, finish-step, etc.)
						break;
				}
			}
			await this.postFallbackIfNeeded(responseState, responseLifecycle, thread);
		} finally {
			await responseLifecycle.finish();
		}
	}

	/**
	 * Wait for a streaming post to settle, and report whether it never did.
	 *
	 * A platform adapter can wait on its own acknowledgement with no deadline and
	 * swallow the rejection that would end that wait, which leaves the turn hung
	 * and the user with no reply at all. The deadline is anchored to the end of
	 * the text stream rather than its start because the post promise is the only
	 * signal this layer gets, and it does not settle until the stream ends even
	 * on a healthy run.
	 */
	private async awaitStreamingPost(
		post: Promise<unknown>,
		thread: Thread<unknown, unknown>,
	): Promise<StreamingPostOutcome> {
		const timeoutMs = this.options.streamingPostTimeoutMs;
		if (timeoutMs === undefined || timeoutMs <= 0) {
			await post;
			return 'settled';
		}

		let timer: NodeJS.Timeout | undefined;
		try {
			const settled = await Promise.race([
				post.then(() => true),
				new Promise<boolean>((resolve) => {
					timer = setTimeout(() => resolve(false), timeoutMs);
					timer.unref();
				}),
			]);
			if (settled) return 'settled';
		} finally {
			clearTimeout(timer);
		}

		this.options.logger.warn(
			'[AgentChatBridge] Streaming post did not settle, posting buffered instead',
			{ threadId: thread.id, timeoutMs },
		);
		return 'stalled';
	}

	/**
	 * Chat SDK's streaming path wraps accumulated deltas as `{ markdown }` so the
	 * adapter applies its markdown parse mode. A raw string bypasses that and
	 * renders as plain text, so buffered text is posted in the same shape.
	 */
	private async postBufferedText(
		thread: Thread<unknown, unknown>,
		text: string,
		throwOnDeliveryError = false,
	): Promise<void> {
		try {
			await thread.post({ markdown: text });
		} catch (postError: unknown) {
			this.options.logger.error('[AgentChatBridge] Buffered post failed', {
				error: postError instanceof Error ? postError.message : String(postError),
			});
			if (throwOnDeliveryError) throw postError;
			await this.options.postErrorToThread(thread, postError);
		}
	}

	private noteToolResult(chunk: ToolResultChunk, state: ResponseState): void {
		if (isRateLimitedToolOutput(chunk.output)) {
			state.fallbackSource = 'rate-limit';
			state.fallbackError = chunk.output;
			return;
		}
		if (chunk.isError) {
			state.fallbackSource = 'tool-error';
			state.fallbackError = chunk.output;
			return;
		}
		if (state.fallbackSource === 'tool-error') {
			state.fallbackSource = null;
		}
	}

	/**
	 * True when this bridge's integration action tool reported that no reply
	 * will be sent (`do_not_respond`). Checked per tool so an arbitrary tool
	 * returning a `silent` field cannot mute the reply.
	 */
	private isSilentOutcome(chunk: ToolResultChunk): boolean {
		if (chunk.isError || !(this.options.isIntegrationActionTool?.(chunk.toolName) ?? false)) {
			return false;
		}
		if (!isRecord(chunk.output)) return false;
		if (chunk.output.silent === true) return true;
		// Batched action calls nest per-operation results under `results`.
		return (
			Array.isArray(chunk.output.results) &&
			chunk.output.results.some(
				(entry) =>
					isRecord(entry) &&
					entry.action === 'do_not_respond' &&
					isRecord(entry.result) &&
					entry.result.ok === true &&
					entry.result.silent === true,
			)
		);
	}

	private createResponseLifecycle(options: {
		statusHandle?: BridgeStatusHandle;
		ensureStreamingPost?: () => void;
		endStreamingPost?: () => Promise<void>;
	}): ResponseLifecycle {
		let responseStarted = false;

		const clearStatusBeforeFirstResponse = async () => {
			if (responseStarted) return;
			responseStarted = true;
			await options.statusHandle?.clearBeforeResponse();
		};

		return {
			startStreamingResponse: async () => {
				await clearStatusBeforeFirstResponse();
				options.ensureStreamingPost?.();
			},
			startDiscreteResponse: async () => {
				await options.endStreamingPost?.();
				await clearStatusBeforeFirstResponse();
			},
			finish: async () => {
				await options.endStreamingPost?.();
				await clearStatusBeforeFirstResponse();
			},
		};
	}

	private async postFallbackIfNeeded(
		state: ResponseState,
		lifecycle: ResponseLifecycle,
		thread: Thread<unknown, unknown>,
		throwOnDeliveryError = false,
	): Promise<void> {
		if (!state.fallbackSource) return;
		// Earlier output only excuses a tool error (the agent's own text explains
		// it). A dropped approval card is never explained by prior text — the run
		// stays suspended, so the user must be told to retry.
		if (state.fallbackSource === 'tool-error' && state.hasVisibleResponse) return;
		// 'rate-limit' and 'suspension' always post.
		await lifecycle.startDiscreteResponse();
		await this.options.postErrorToThread(thread, state.fallbackError, throwOnDeliveryError);
		state.hasVisibleResponse = true;
	}

	private async consumeBuffered(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread<unknown, unknown>,
		options: ConsumeStreamOptions = {},
	): Promise<void> {
		let buffer = '';
		const responseState = createResponseState();
		const responseLifecycle = this.createResponseLifecycle({
			statusHandle: options.statusHandle,
		});

		const flushBuffer = async () => {
			const text = buffer;
			buffer = '';
			if (!text.trim()) return;
			await responseLifecycle.startDiscreteResponse();
			await this.postBufferedText(thread, text, options.throwOnDeliveryError);
			responseState.hasVisibleResponse = true;
		};

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta':
						if (!responseState.suppressText) buffer += chunk.delta;
						break;
					case 'tool-call-suspended': {
						if (isIntegrationActionSuspendPayload(chunk.suspendPayload)) {
							// The integration action already posted its interactive card.
							buffer = '';
						} else {
							await flushBuffer();
						}
						await responseLifecycle.startDiscreteResponse();
						const result = await this.options.handleSuspension(chunk, thread);
						responseState.hasVisibleResponse ||= result === 'posted';
						if (result === 'failed') {
							if (options.throwOnDeliveryError) {
								throw new OperationalError('Failed to post tool approval request');
							}
							responseState.fallbackSource = 'suspension';
							responseState.fallbackError = new Error('Failed to post tool approval request');
						}
						break;
					}
					case 'message': {
						await flushBuffer();
						await responseLifecycle.startDiscreteResponse();
						const posted = await this.options.handleMessage(
							chunk,
							thread,
							options.throwOnDeliveryError,
						);
						responseState.hasVisibleResponse ||= posted;
						break;
					}
					case 'error':
						await flushBuffer();
						await responseLifecycle.startDiscreteResponse();
						await this.options.postErrorToThread(thread, chunk.error, options.throwOnDeliveryError);
						responseState.hasVisibleResponse = true;
						break;
					case 'tool-result':
						this.noteToolResult(chunk, responseState);
						if (this.isSilentOutcome(chunk)) {
							responseState.suppressText = true;
							// Nothing has been posted yet in buffered mode, so the
							// silence can be honored for already-buffered text too.
							buffer = '';
						}
						break;
					default:
						break;
				}
			}
			await flushBuffer();
			await this.postFallbackIfNeeded(
				responseState,
				responseLifecycle,
				thread,
				options.throwOnDeliveryError,
			);
		} finally {
			await flushBuffer();
			await responseLifecycle.finish();
		}
	}
}
