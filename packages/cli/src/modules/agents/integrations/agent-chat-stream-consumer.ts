import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { BridgeStatusHandle } from './agent-chat-integration';
import { type TextEndFn, type TextYieldFn } from './types';

type SuspendedChunk = Extract<StreamChunk, { type: 'tool-call-suspended' }>;
type MessageChunk = Extract<StreamChunk, { type: 'message' }>;

interface AgentChatStreamConsumerOptions {
	disableStreaming: boolean;
	logger: Logger;
	postErrorToThread: (thread: Thread<unknown, unknown> | null, error: unknown) => Promise<void>;
	handleSuspension: (chunk: SuspendedChunk, thread: Thread<unknown, unknown>) => Promise<void>;
	handleMessage: (chunk: MessageChunk, thread: Thread<unknown, unknown>) => Promise<void>;
}

interface ConsumeStreamOptions {
	forceBuffered?: boolean;
	statusHandle?: BridgeStatusHandle;
}

export class AgentChatStreamConsumer {
	constructor(private readonly options: AgentChatStreamConsumerOptions) {}

	async consume(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread<unknown, unknown>,
		options: ConsumeStreamOptions = {},
	): Promise<void> {
		if (this.options.disableStreaming || options.forceBuffered) {
			await this.consumeBuffered(stream, thread, {
				statusHandle: options.statusHandle,
			});
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

		try {
			for await (const chunk of stream) {
				switch (chunk.type) {
					case 'text-delta': {
						const { delta } = chunk;
						await responseLifecycle.startStreamingResponse();
						textStream.yield?.(delta);
						break;
					}
					case 'reasoning-delta': {
						const { delta } = chunk;
						await responseLifecycle.startStreamingResponse();
						textStream.yield?.(`_${delta}_`);
						break;
					}
					case 'tool-call-suspended':
						await responseLifecycle.startDiscreteResponse();
						await this.options.handleSuspension(chunk, thread);
						// Don't start new streaming post — wait for next text delta
						break;
					case 'message':
						await responseLifecycle.startDiscreteResponse();
						await this.options.handleMessage(chunk, thread);
						break;
					case 'error':
						await responseLifecycle.startDiscreteResponse();
						await this.options.postErrorToThread(thread, chunk.error);
						break;
					default:
						// Ignore other chunk types (finish, tool-input-*,
						// start-step, finish-step, etc.)
						break;
				}
			}
		} finally {
			await responseLifecycle.finish();
		}
	}

	private createResponseLifecycle(options: {
		statusHandle?: BridgeStatusHandle;
		ensureStreamingPost?: () => void;
		endStreamingPost?: () => Promise<void>;
	}) {
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

	private async consumeBuffered(
		stream: AsyncGenerator<StreamChunk>,
		thread: Thread<unknown, unknown>,
		options: { statusHandle?: BridgeStatusHandle } = {},
	): Promise<void> {
		let buffer = '';
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
				await this.options.postErrorToThread(thread, postError);
				this.options.logger.error('[AgentChatBridge] Buffered post failed', {
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
					case 'tool-call-suspended':
						await flushBuffer();
						await responseLifecycle.startDiscreteResponse();
						await this.options.handleSuspension(chunk, thread);
						break;
					case 'message':
						await flushBuffer();
						await responseLifecycle.startDiscreteResponse();
						await this.options.handleMessage(chunk, thread);
						break;
					case 'error':
						await flushBuffer();
						await responseLifecycle.startDiscreteResponse();
						await this.options.postErrorToThread(thread, chunk.error);
						break;
					default:
						break;
				}
			}
		} finally {
			await flushBuffer();
			await responseLifecycle.finish();
		}
	}
}
