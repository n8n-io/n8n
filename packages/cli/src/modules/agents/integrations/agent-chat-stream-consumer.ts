import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import { OperationalError, type Logger } from 'n8n-workflow';

import type { AgentExecutionStreamChunk } from '../types/agent-steering';
import type { BridgeStatusHandle } from './agent-chat-integration';
import { isIntegrationActionSuspendPayload } from './agent-chat-suspension-cards';
import { type TextEndFn, type TextYieldFn } from './types';
import { isRateLimitedToolOutput } from './channel-rate-limit';
import { isSilentActionOutput } from './integration-tool-execution';

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
}

interface ResponseLifecycle {
	startStreamingResponse: () => Promise<void>;
	startDiscreteResponse: () => Promise<void>;
	finish: () => Promise<void>;
}

const createResponseState = (options: ConsumeStreamOptions): ResponseState => ({
	hasVisibleResponse: false,
	suppressText: false,
	fallbackSource: null,
	fallbackError: null,
	quietErrors: options.quietErrors === true,
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
		const textStream: { yield: TextYieldFn | null; end: TextEndFn | null } = {
			yield: null,
			end: null,
		};
		let streamingPost: Promise<unknown> | null = null;
		/** Text the platform is not yet known to have rendered. */
		let pendingText = '';
		let streamingStopped = false;
		/** Only a platform that can stop streaming mid-turn re-reads the text. */
		const retainText = this.options.singleStreamedRunPerTurn === true;
		/** Set when the post failed, so the retained text is posted instead. */
		let streamingPostRejected = false;
		let streamingPostError: unknown;

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
			}
			if (streamingPost) {
				const post = streamingPost;
				streamingPost = null;
				if (this.options.singleStreamedRunPerTurn) streamingStopped = true;
				await post;
				// A post that rejected left the reply unsent — on a post-and-edit
				// platform the user is looking at a placeholder. Post the retained
				// text below instead of dropping it, and fall back to telling the
				// user only when there is no text to deliver.
				if (!streamingPostRejected) {
					pendingText = '';
				} else if (!pendingText.trim()) {
					await this.postError(thread, streamingPostError, responseState);
				}
			}
			const text = pendingText;
			pendingText = '';
			if (text.trim()) await this.postBufferedText(thread, text, responseState);
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
		let budgetStop: string | undefined;

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta': {
						if (responseState.suppressText) break;
						const { delta } = chunk;
						// Opening on whitespace alone posts a placeholder that the
						// platform then has nothing to replace it with.
						if (!delta.trim() && !responseState.hasVisibleResponse) break;
						await responseLifecycle.startStreamingResponse();
						if (retainText) pendingText += delta;
						textStream.yield?.(delta);
						if (delta.trim()) responseState.hasVisibleResponse = true;
						break;
					}
					case 'tool-call-suspended': {
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
					case 'message':
						await responseLifecycle.startDiscreteResponse();
						responseState.hasVisibleResponse ||= await this.options.handleMessage(chunk, thread);
						break;
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
						break;
					default:
						// Ignore non-user-visible chunks (reasoning, tool-input-*,
						// start-step, finish-step, etc.)
						break;
				}
			}
			if (budgetStop !== undefined) {
				await this.postBudgetStop(thread, budgetStop, responseState, responseLifecycle);
			} else {
				await this.postFallbackIfNeeded(responseState, responseLifecycle, thread);
			}
		} finally {
			await responseLifecycle.finish();
		}
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
			await thread.post({ markdown: text });
		} catch (postError: unknown) {
			this.options.logger.error('[AgentChatBridge] Buffered post failed', {
				error: postError instanceof Error ? postError.message : String(postError),
			});
			if (throwOnDeliveryError) throw postError;
			await this.postError(thread, postError, state);
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
						break;
					default:
						break;
				}
			}
			await flushBuffer();
			if (budgetStop !== undefined) {
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
