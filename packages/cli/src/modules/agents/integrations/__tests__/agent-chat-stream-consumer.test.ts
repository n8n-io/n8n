import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import { AgentChatStreamConsumer } from '../agent-chat-stream-consumer';

function makeStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* () {
		for (const chunk of chunks) yield chunk;
	})();
}

function makeConsumer(
	postErrorToThread: (thread: Thread<unknown, unknown> | null, error: unknown) => Promise<void>,
) {
	return new AgentChatStreamConsumer({
		disableStreaming: true,
		logger: mock<Logger>(),
		postErrorToThread,
		handleSuspension: vi.fn().mockResolvedValue('skipped'),
		handleMessage: vi.fn().mockResolvedValue(false),
		isIntegrationActionTool: () => true,
	});
}

const thread = mock<Thread<unknown, unknown>>();

describe('AgentChatStreamConsumer — rate-limit fallback', () => {
	it('posts a fallback error after a RATE_LIMIT_EXCEEDED tool result', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		const rateLimitResult = {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
				message:
					'The Slack integration has exceeded its rate limit. Please wait a few minutes before trying again.',
			},
		};

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: rateLimitResult,
				},
				{ type: 'text-delta', id: 't-1', delta: 'Let me try again' },
			]),
			thread,
		);

		expect(postErrorToThread).toHaveBeenCalledTimes(1);
		const postedError = postErrorToThread.mock.calls[0][1];
		expect(postedError).toEqual(rateLimitResult);
	});

	it('still posts the fallback when a later tool result succeeds', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		const rateLimitResult = {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
				message: 'The Slack integration has exceeded its rate limit.',
			},
		};

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: rateLimitResult,
				},
				{
					type: 'tool-result',
					toolCallId: 'tc-2',
					toolName: 'linear_action',
					output: { ok: true },
				},
			]),
			thread,
		);

		// rate-limit is not cleared by a later success
		expect(postErrorToThread).toHaveBeenCalledTimes(1);
	});

	it('does not post a fallback when there is no rate-limit or error', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: { ok: true },
				},
			]),
			thread,
		);

		expect(postErrorToThread).not.toHaveBeenCalled();
	});
});

function isAsyncIterable(value: unknown): boolean {
	return typeof (value as Record<symbol, unknown>)?.[Symbol.asyncIterator] === 'function';
}

/** Separates streamed posts (an async iterable) from discrete ones. */
function makeStreamingThread({
	stall = false,
	settleAfterMs,
	rejectAfterMs,
}: { stall?: boolean; settleAfterMs?: number; rejectAfterMs?: number } = {}) {
	const streamed: unknown[] = [];
	const discrete: unknown[] = [];
	const post = vi.fn(async (message: unknown) => {
		if (!isAsyncIterable(message)) {
			discrete.push(message);
			return undefined;
		}
		streamed.push(message);
		if (settleAfterMs !== undefined) {
			return await new Promise((resolve) => setTimeout(resolve, settleAfterMs));
		}
		if (rejectAfterMs !== undefined) {
			return await new Promise((_resolve, reject) =>
				setTimeout(() => reject(new Error('late failure')), rejectAfterMs),
			);
		}
		if (stall) return await new Promise(() => {});
		for await (const _chunk of message as AsyncIterable<string>) {
			// Drain the iterable the way a real adapter does.
		}
		return undefined;
	});
	const thread = mock<Thread<unknown, unknown>>();
	thread.post = post as unknown as typeof thread.post;
	return { thread, streamed, discrete };
}

function makeStreamingConsumer(
	options: Partial<ConstructorParameters<typeof AgentChatStreamConsumer>[0]> = {},
) {
	return new AgentChatStreamConsumer({
		disableStreaming: false,
		logger: mock<Logger>(),
		postErrorToThread: vi.fn().mockResolvedValue(undefined),
		handleSuspension: vi.fn().mockResolvedValue('posted'),
		handleMessage: vi.fn().mockResolvedValue(true),
		isIntegrationActionTool: () => true,
		...options,
	});
}

describe('AgentChatStreamConsumer — streamingPostTimeoutMs', () => {
	it('posts the streamed text as an ordinary message when the streamed post never settles', async () => {
		const onStreamingPostStalled = vi.fn();
		const { thread, discrete } = makeStreamingThread({ stall: true });
		const consumer = makeStreamingConsumer({
			streamingPostTimeoutMs: 10,
			onStreamingPostStalled,
		});

		await consumer.consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'Half a ' },
				{ type: 'text-delta', id: 't-1', delta: 'sentence' },
			]),
			thread,
		);

		expect(discrete).toEqual([{ markdown: 'Half a sentence' }]);
		expect(onStreamingPostStalled).toHaveBeenCalledTimes(1);
	});

	it('does not post twice or report a stall when the streamed post settles', async () => {
		const onStreamingPostStalled = vi.fn();
		const { thread, streamed, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer({
			streamingPostTimeoutMs: 10_000,
			onStreamingPostStalled,
		});

		await consumer.consume(
			makeStream([{ type: 'text-delta', id: 't-1', delta: 'All of it' }]),
			thread,
		);

		expect(streamed).toHaveLength(1);
		expect(discrete).toEqual([]);
		expect(onStreamingPostStalled).not.toHaveBeenCalled();
	});
});

describe('AgentChatStreamConsumer — singleStreamedRunPerTurn', () => {
	const textThenMessageThenText = (): StreamChunk[] => [
		{ type: 'text-delta', id: 't-1', delta: 'Before' },
		{ type: 'message', message: { text: 'a card' } } as unknown as StreamChunk,
		{ type: 'text-delta', id: 't-2', delta: 'After' },
	];

	it('streams once and posts the trailing text as its own message', async () => {
		const { thread, streamed, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer({ singleStreamedRunPerTurn: true });

		await consumer.consume(makeStream(textThenMessageThenText()), thread);

		expect(streamed).toHaveLength(1);
		expect(discrete).toEqual([{ markdown: 'After' }]);
	});

	it('opens a second streamed post when the platform allows it', async () => {
		const { thread, streamed, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer();

		await consumer.consume(makeStream(textThenMessageThenText()), thread);

		expect(streamed).toHaveLength(2);
		expect(discrete).toEqual([]);
	});
});

describe('AgentChatStreamConsumer — silent outcome after a discrete post', () => {
	it('drops trailing text that a do_not_respond outcome silenced', async () => {
		const { thread, streamed, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer({ singleStreamedRunPerTurn: true });

		await consumer.consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'Before' },
				{ type: 'message', message: { text: 'a card' } } as unknown as StreamChunk,
				{ type: 'text-delta', id: 't-2', delta: 'After' },
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'teams_action',
					output: { silent: true },
				},
			]),
			thread,
		);

		expect(streamed).toHaveLength(1);
		expect(discrete).toEqual([]);
	});
});

describe('AgentChatStreamConsumer — delivery that must not stream', () => {
	it('buffers a proactive send even on a streaming platform', async () => {
		const { thread, streamed, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer();

		await consumer.consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'Scheduled ' },
				{ type: 'text-delta', id: 't-1', delta: 'reminder' },
			]),
			thread,
			// What deliverWakeResponse passes, so a failure can be retried.
			{ throwOnDeliveryError: true },
		);

		expect(streamed).toEqual([]);
		expect(discrete).toEqual([{ markdown: 'Scheduled reminder' }]);
	});
});

describe('AgentChatStreamConsumer — a streamed post that settles after the deadline', () => {
	it('posts the buffered text once and does not wait for the late post', async () => {
		const onStreamingPostStalled = vi.fn();
		const { thread, streamed, discrete } = makeStreamingThread({ settleAfterMs: 200 });
		const consumer = makeStreamingConsumer({
			streamingPostTimeoutMs: 10,
			onStreamingPostStalled,
		});

		await consumer.consume(
			makeStream([{ type: 'text-delta', id: 't-1', delta: 'Late but fine' }]),
			thread,
		);

		expect(streamed).toHaveLength(1);
		expect(discrete).toEqual([{ markdown: 'Late but fine' }]);
		expect(onStreamingPostStalled).toHaveBeenCalledTimes(1);

		// The turn is over; the late settle must not add a second message.
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(discrete).toEqual([{ markdown: 'Late but fine' }]);
	});

	it('stays quiet when an abandoned post rejects after the turn ended', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const { thread, discrete } = makeStreamingThread({ rejectAfterMs: 200 });
		const consumer = makeStreamingConsumer({
			streamingPostTimeoutMs: 10,
			postErrorToThread,
		});

		await consumer.consume(
			makeStream([{ type: 'text-delta', id: 't-1', delta: 'Recovered text' }]),
			thread,
		);

		expect(discrete).toEqual([{ markdown: 'Recovered text' }]);

		// An error posted now would land after the reply the user already has.
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(postErrorToThread).not.toHaveBeenCalled();
		expect(discrete).toEqual([{ markdown: 'Recovered text' }]);
	});
});

describe('AgentChatStreamConsumer — a rejection that outruns the deadline', () => {
	it('lets the error reply own the turn instead of posting the text on top of it', async () => {
		const onStreamingPostStalled = vi.fn();
		let releaseError: (() => void) | undefined;
		const postErrorToThread = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					releaseError = resolve;
				}),
		);
		const { thread, discrete } = makeStreamingThread({ rejectAfterMs: 5 });
		const consumer = makeStreamingConsumer({
			streamingPostTimeoutMs: 40,
			onStreamingPostStalled,
			postErrorToThread,
		});

		// The post rejects, its error reply hangs, and the deadline fires while
		// that reply is still in flight.
		await consumer.consume(
			makeStream([{ type: 'text-delta', id: 't-1', delta: 'Half a reply' }]),
			thread,
		);

		expect(discrete).toEqual([]);
		expect(onStreamingPostStalled).not.toHaveBeenCalled();

		releaseError?.();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(postErrorToThread).toHaveBeenCalledTimes(1);
		expect(discrete).toEqual([]);
	});
});
