import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import { OperationalError, type Logger } from 'n8n-workflow';

import type { AgentExecutionStreamChunk } from '../types/agent-steering';
import type { BridgeStatusHandle } from './agent-chat-integration';
import { isIntegrationActionSuspendPayload } from './agent-chat-suspension-cards';
import { type TextEndFn, type TextYieldFn } from './types';
import { isRateLimitedToolOutput } from './channel-rate-limit';
import { isSilentActionOutput, readQueuedFileIds } from './integration-tool-execution';
import { messageBreak, splitMessage } from './message-split';

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
		actingUserId?: string,
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
	/** Text after the first streamed run is buffered and posted on its own. */
	singleStreamedRunPerTurn?: boolean;
	/** Text past this many characters continues in a new message. */
	maxMessageLength?: number;
	/** Post the files that a run queued for its final reply, with the reply text as caption. */
	postReplyFiles?: (
		thread: Thread<unknown, unknown>,
		params: { fileIds: string[]; caption: string; agentThreadId: string; onPosted?: () => void },
	) => Promise<void>;
}

/** The platform did not accept a reply, so the user did not get all of it. */
export class ReplyDeliveryError extends OperationalError {
	constructor(cause: unknown) {
		const reason = cause instanceof Error ? cause.message : String(cause);
		super(`Failed to post the reply: ${reason}`, { cause });
	}
}

/** A tool result from the part of a run before it was suspended. */
export interface EarlierToolResult {
	toolCallId: string;
	toolName: string;
	output: unknown;
}

interface ConsumeStreamOptions {
	forceBuffered?: boolean;
	/** Buffer output and report posting failures so the caller can retry. */
	throwOnDeliveryError?: boolean;
	statusHandle?: BridgeStatusHandle;
	/**
	 * The user whose message or click drove this turn, so a suspension card can
	 * be addressed to them. Absent for a turn no user drove.
	 */
	actingUserId?: string;
	/**
	 * Log errors instead of posting them. For a turn whose reply was optional:
	 * nobody asked the agent, so an error post would be noise.
	 */
	quietErrors?: boolean;
	/** Agent thread of the run. Files queued for the final reply are read in this thread. */
	agentThreadId?: string;
	/**
	 * Tool results of a resumed run from before its suspension. Files that they
	 * queued go with the final reply of this part of the run.
	 */
	earlierToolResults?: EarlierToolResult[];
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
	quietErrors: boolean;
	/** File IDs that respond queued for the final reply, by tool call. */
	replyFiles: Map<string, string[]>;
	/** The run stopped at a suspension. The resume sends the queued files. */
	suspended: boolean;
}

interface ResponseLifecycle {
	startStreamingResponse: () => Promise<void>;
	startDiscreteResponse: () => Promise<void>;
	resumeThinking: () => Promise<void>;
	finish: () => Promise<void>;
}

const createResponseState = (options: ConsumeStreamOptions): ResponseState => ({
	hasVisibleResponse: false,
	suppressText: false,
	fallbackSource: null,
	fallbackError: null,
	quietErrors: options.quietErrors === true,
	replyFiles: new Map(),
	suspended: false,
});

const BUDGET_STOP_TEXT = {
	'budget.session':
		'⚠️ This session reached its cost cap and stopped. Open the agent in n8n and increase the cap.',
	'budget.monthly':
		'⚠️ This agent reached its monthly budget and stopped. Open the agent in n8n and increase the cap.',
} as const;

function budgetStopText(code: string | undefined): string | undefined {
	if (code === 'budget.session' || code === 'budget.monthly') return BUDGET_STOP_TEXT[code];
	return undefined;
}

export class AgentChatStreamConsumer {
	constructor(private readonly options: AgentChatStreamConsumerOptions) {}

	async consume(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		thread: Thread<unknown, unknown>,
		options: ConsumeStreamOptions = {},
	): Promise<void> {
		stream = this.separateTextSteps(stream);
		if (this.options.disableStreaming || options.forceBuffered || options.throwOnDeliveryError) {
			await this.consumeBuffered(stream, thread, options);
			return;
		}

		// Controller for the text stream iterable that Chat SDK consumes.
		// These are reassigned inside `createTextIterable()` (called transitively
		// by `ensureStreamingPost()`). TypeScript cannot track mutations through
		// closures, so it incorrectly narrows these to `never` after the
		// assignment. We use a wrapper object to avoid the TS closure analysis issue.
		const textStream: {
			yield: TextYieldFn | null;
			end: TextEndFn | null;
			flush: (() => Promise<void>) | null;
		} = {
			yield: null,
			end: null,
			flush: null,
		};
		let streamingPost: Promise<unknown> | null = null;
		let statusRestoredForPost = false;
		/** Text the platform is not yet known to have rendered. */
		let pendingText = '';
		let streamingStopped = false;
		/** Set when the post failed, so the retained text is posted instead. */
		let streamingPostRejected = false;
		let streamingPostError: unknown;

		const createTextIterable = (): AsyncIterable<string> => {
			const queue: Array<string | (() => void)> = [];
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
			// The SDK requests the next item after it has processed the prior text.
			textStream.flush = async () => {
				if (waiting || done) return;
				await new Promise<void>((resolve) => queue.push(resolve));
			};

			return {
				[Symbol.asyncIterator]() {
					return {
						async next(): Promise<IteratorResult<string>> {
							while (queue.length > 0) {
								const item = queue.shift()!;
								if (typeof item === 'string') return { value: item, done: false };
								item();
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
			statusRestoredForPost = false;
			streamingPostRejected = false;
			streamingPostError = undefined;
			streamingPost = thread.post(iterable).catch((postError: unknown) => {
				streamingPostRejected = true;
				streamingPostError = postError;
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
				textStream.flush = null;
			}
			if (streamingPost) {
				const post = streamingPost;
				streamingPost = null;
				if (this.options.singleStreamedRunPerTurn) streamingStopped = true;
				await post;
				// A post that rejected left the reply unsent or cut off. Post the
				// retained text below instead of dropping it, and fall back to
				// telling the user only when there is no text to deliver.
				if (!streamingPostRejected) {
					pendingText = '';
				} else if (!pendingText.trim()) {
					await this.postError(thread, new ReplyDeliveryError(streamingPostError), responseState);
				}
			}
			const text = pendingText;
			pendingText = '';
			if (text.trim()) await this.postBufferedText(thread, text, responseState);
		};
		const flushStreamingPost = async () => {
			if (!options.statusHandle?.resumeAfterResponse || !textStream.flush || !streamingPost) return;
			// A failed post stops reading the iterable. Do not wait on it to drain.
			await Promise.race([textStream.flush(), streamingPost]);
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
		const responseState = createResponseState(options);
		this.seedReplyFiles(options, responseState);
		let budgetStop: string | undefined;
		let stopped = false;

		const streamDelta = async (delta: string) => {
			// Opening on whitespace alone posts a placeholder that the
			// platform then has nothing to replace it with.
			if (!delta.trim() && !responseState.hasVisibleResponse) return;
			await responseLifecycle.startStreamingResponse();
			pendingText += delta;
			textStream.yield?.(delta);
			if (delta.trim()) responseState.hasVisibleResponse = true;
			if (!statusRestoredForPost && options.statusHandle?.resumeAfterResponse) {
				await flushStreamingPost();
				await responseLifecycle.resumeThinking();
				statusRestoredForPost = true;
			}
		};
		/** Continues in a new message before the current one passes the platform limit. */
		const streamText = async (text: string) => {
			const max = this.options.maxMessageLength;
			if (max === undefined) return await streamDelta(text);
			let rest = text;
			let breakAt = messageBreak(pendingText.length, rest, max);
			while (breakAt !== undefined) {
				await streamDelta(rest.slice(0, breakAt));
				await endStreamingPost();
				rest = rest.slice(breakAt);
				// Whitespace alone would open an empty message.
				if (!rest.trim()) return;
				breakAt = messageBreak(pendingText.length, rest, max);
			}
			await streamDelta(rest);
		};

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta':
						if (!responseState.suppressText) await streamText(chunk.delta);
						break;
					case 'text-end':
						await flushStreamingPost();
						break;
					case 'tool-call':
						await flushStreamingPost();
						await responseLifecycle.resumeThinking();
						break;
					case 'tool-call-suspended': {
						responseState.suspended = true;
						await responseLifecycle.startDiscreteResponse();
						const result = await this.options.handleSuspension(chunk, thread, options.actingUserId);
						responseState.hasVisibleResponse ||= result === 'posted';
						if (result === 'failed') {
							responseState.fallbackSource = 'suspension';
							responseState.fallbackError = new Error('Failed to post tool approval request');
						}
						// Don't start new streaming post — wait for next text delta
						break;
					}
					case 'message': {
						await responseLifecycle.startDiscreteResponse();
						const posted = await this.options.handleMessage(chunk, thread);
						responseState.hasVisibleResponse ||= posted;
						break;
					}
					case 'error':
						await responseLifecycle.startDiscreteResponse();
						await this.postError(thread, chunk.error, responseState);
						responseState.hasVisibleResponse = true;
						break;
					case 'tool-result':
						this.noteToolResult(chunk, responseState);
						if (this.isSilentOutcome(chunk)) {
							responseState.suppressText = true;
							// Whatever already reached the platform cannot be recalled, but
							// text still pending can be dropped.
							pendingText = '';
						}
						break;
					case 'finish':
						budgetStop ??= budgetStopText(chunk.guardrail?.code);
						stopped ||= chunk.finishReason === 'cancelled';
						break;
					default:
						// Ignore non-user-visible chunks (reasoning, tool-input-*,
						// start-step, finish-step, etc.)
						break;
				}
			}
			if (stopped) {
				await responseLifecycle.startDiscreteResponse();
				await this.postBufferedText(thread, 'Session stopped', responseState);
			} else if (budgetStop !== undefined) {
				await this.postBudgetStop(thread, budgetStop, responseState, responseLifecycle);
			} else {
				await this.postFallbackIfNeeded(responseState, responseLifecycle, thread);
			}
		} finally {
			await responseLifecycle.finish();
		}
		// A streamed reply cannot carry files, so they follow it in their own message.
		await this.postReplyFiles(thread, responseState, '', options);
	}

	// Preserve paragraph breaks when the bridge extracts text from the full stream.
	private async *separateTextSteps(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
	): AsyncGenerator<AgentExecutionStreamChunk> {
		let hasText = false;
		let needsSeparator = false;
		for await (const chunk of stream) {
			if (chunk.type === 'text-delta' && chunk.delta) {
				yield hasText && needsSeparator ? { ...chunk, delta: `\n\n${chunk.delta}` } : chunk;
				hasText ||= chunk.delta.trim().length > 0;
				needsSeparator = false;
				continue;
			}
			if (chunk.type === 'finish-step') {
				needsSeparator = true;
			} else if (
				chunk.type === 'message' ||
				chunk.type === 'tool-call-suspended' ||
				chunk.type === 'error'
			) {
				hasText = false;
				needsSeparator = false;
			}
			yield chunk;
		}
	}

	/**
	 * `{ markdown }` matches what Chat SDK's streaming path sends, so the adapter
	 * applies its markdown parse mode. A raw string renders as plain text.
	 */
	private async postBufferedText(
		thread: Thread<unknown, unknown>,
		text: string,
		state: ResponseState,
		throwOnDeliveryError = false,
	): Promise<void> {
		try {
			const max = this.options.maxMessageLength;
			const parts = max === undefined ? [text] : splitMessage(text, max);
			for (const part of parts) {
				await thread.post({ markdown: part });
			}
		} catch (postError: unknown) {
			this.options.logger.error('[AgentChatBridge] Buffered post failed', {
				error: postError instanceof Error ? postError.message : String(postError),
			});
			if (throwOnDeliveryError) throw postError;
			await this.postError(thread, new ReplyDeliveryError(postError), state);
		}
	}

	private async postBudgetStop(
		thread: Thread<unknown, unknown>,
		text: string,
		state: ResponseState,
		lifecycle: ResponseLifecycle,
		throwOnDeliveryError = false,
	): Promise<void> {
		await lifecycle.startDiscreteResponse();
		await this.postBufferedText(thread, text, state, throwOnDeliveryError);
		state.hasVisibleResponse = true;
	}

	private async postError(
		thread: Thread<unknown, unknown>,
		error: unknown,
		state: ResponseState,
		throwOnDeliveryError?: boolean,
	): Promise<void> {
		if (state.quietErrors) {
			this.options.logger.warn('[AgentChatBridge] Error in a turn whose reply was optional', {
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return;
		}
		await this.options.postErrorToThread(thread, error, throwOnDeliveryError);
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
		this.noteReplyFiles(chunk, state);
	}

	private noteReplyFiles(result: EarlierToolResult, state: ResponseState): void {
		if (!(this.options.isIntegrationActionTool?.(result.toolName) ?? false)) return;
		const fileIds = readQueuedFileIds(result.output);
		if (fileIds.length > 0) state.replyFiles.set(result.toolCallId, fileIds);
	}

	private seedReplyFiles(options: ConsumeStreamOptions, state: ResponseState): void {
		for (const result of options.earlierToolResults ?? []) this.noteReplyFiles(result, state);
	}

	/**
	 * Post the files that the run queued for its final reply. A suspended run
	 * keeps them: its resume rebuilds the queue and sends them one time.
	 */
	private async postReplyFiles(
		thread: Thread<unknown, unknown>,
		state: ResponseState,
		caption: string,
		options: ConsumeStreamOptions,
	): Promise<void> {
		if (state.suspended || state.replyFiles.size === 0) return;
		const fileIds = [...new Set([...state.replyFiles.values()].flat())];
		state.replyFiles.clear();
		let textPosted = false;
		try {
			if (!this.options.postReplyFiles || !options.agentThreadId) {
				throw new OperationalError('Files cannot be sent without the agent thread of the run');
			}
			await this.options.postReplyFiles(thread, {
				fileIds,
				caption,
				agentThreadId: options.agentThreadId,
				onPosted: () => {
					textPosted = true;
				},
			});
			state.hasVisibleResponse = true;
		} catch (error) {
			this.options.logger.error('[AgentChatBridge] Failed to post reply files', {
				error: error instanceof Error ? error.message : String(error),
			});
			// Do not lose the reply text with the files. A wake delivery throws
			// only when the text or the error notice cannot be posted, so a
			// retry does not post the text again. The first post carries the
			// text, so it is posted again only when nothing was posted.
			const throwOnDeliveryError = options.throwOnDeliveryError;
			if (caption.trim() && !textPosted) {
				await this.postBufferedText(thread, caption, state, throwOnDeliveryError);
			}
			await this.postError(thread, error, state, throwOnDeliveryError);
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
		return isSilentActionOutput(chunk.output);
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
			if (!options.statusHandle?.keepDuringResponse) {
				await options.statusHandle?.clearBeforeResponse();
			}
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
			resumeThinking: async () => {
				if (!responseStarted || !options.statusHandle?.resumeAfterResponse) return;
				await options.statusHandle.resumeAfterResponse();
				responseStarted = false;
			},
			finish: async () => {
				try {
					await options.endStreamingPost?.();
				} finally {
					if (options.statusHandle?.keepDuringResponse || !responseStarted) {
						await options.statusHandle?.clearBeforeResponse();
					}
				}
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
		await this.postError(thread, state.fallbackError, state, throwOnDeliveryError);
		state.hasVisibleResponse = true;
	}

	private async consumeBuffered(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		thread: Thread<unknown, unknown>,
		options: ConsumeStreamOptions = {},
	): Promise<void> {
		let buffer = '';
		const responseState = createResponseState(options);
		this.seedReplyFiles(options, responseState);
		const responseLifecycle = this.createResponseLifecycle({
			statusHandle: options.statusHandle,
		});

		const flushBuffer = async () => {
			const text = buffer;
			buffer = '';
			if (!text.trim()) return;
			await responseLifecycle.startDiscreteResponse();
			await this.postBufferedText(thread, text, responseState, options.throwOnDeliveryError);
			responseState.hasVisibleResponse = true;
		};
		let budgetStop: string | undefined;
		let stopped = false;

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta':
						if (!responseState.suppressText) buffer += chunk.delta;
						break;
					case 'tool-call-suspended': {
						responseState.suspended = true;
						if (isIntegrationActionSuspendPayload(chunk.suspendPayload)) {
							// The integration action already posted its interactive card.
							buffer = '';
						} else {
							await flushBuffer();
						}
						await responseLifecycle.startDiscreteResponse();
						const result = await this.options.handleSuspension(chunk, thread, options.actingUserId);
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
						await this.postError(thread, chunk.error, responseState, options.throwOnDeliveryError);
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
					case 'finish':
						budgetStop ??= budgetStopText(chunk.guardrail?.code);
						stopped ||= chunk.finishReason === 'cancelled';
						break;
					default:
						break;
				}
			}
			// The final reply text is the caption of the queued files.
			if (responseState.replyFiles.size > 0 && !responseState.suspended) {
				const caption = buffer;
				buffer = '';
				await responseLifecycle.startDiscreteResponse();
				await this.postReplyFiles(thread, responseState, caption, options);
			}
			await flushBuffer();
			if (stopped) {
				await responseLifecycle.startDiscreteResponse();
				await this.postBufferedText(
					thread,
					'Session stopped',
					responseState,
					options.throwOnDeliveryError,
				);
			} else if (budgetStop !== undefined) {
				await this.postBudgetStop(
					thread,
					budgetStop,
					responseState,
					responseLifecycle,
					options.throwOnDeliveryError,
				);
			} else {
				await this.postFallbackIfNeeded(
					responseState,
					responseLifecycle,
					thread,
					options.throwOnDeliveryError,
				);
			}
		} finally {
			await flushBuffer();
			await responseLifecycle.finish();
		}
	}
}
