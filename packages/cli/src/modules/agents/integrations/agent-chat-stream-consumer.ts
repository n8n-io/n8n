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
			streamingPost = thread.post(iterable).catch(async (postError: unknown) => {
				await this.options.postErrorToThread(thread, postError);
				this.options.logger.error('[AgentChatBridge] Streaming post failed', {
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
						if (this.isSilentOutcome(chunk)) responseState.suppressText = true;
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
			try {
				await responseLifecycle.startDiscreteResponse();
				// Chat SDK's streaming path wraps accumulated deltas as `{ markdown }`
				// so the platform adapter applies its markdown parse-mode (Telegram:
				// sendMessage with parse_mode=Markdown). A raw string bypasses that
				// and renders as plain text, so we post the buffered message the same
				// shape the streaming path uses under the hood.
				await thread.post({ markdown: text });
			} catch (postError: unknown) {
				this.options.logger.error('[AgentChatBridge] Buffered post failed', {
					error: postError instanceof Error ? postError.message : String(postError),
				});
				if (options.throwOnDeliveryError) throw postError;
				await this.options.postErrorToThread(thread, postError);
			}
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
