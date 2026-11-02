import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import { AgentChatStreamConsumer, ReplyDeliveryError } from '../agent-chat-stream-consumer';

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

const SUSPENDED_CHUNK = {
	type: 'tool-call-suspended',
	runId: 'run-1',
	toolCallId: 'tool-1',
	suspendPayload: {},
} as unknown as StreamChunk;

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
	const streamedText: string[] = [];
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
		let text = '';
		for await (const chunk of message as AsyncIterable<string>) {
			text += chunk;
		}
		streamedText.push(text);
		return undefined;
	});
	const thread = mock<Thread<unknown, unknown>>();
	thread.post = post as unknown as typeof thread.post;
	return { thread, streamed, streamedText, discrete };
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

describe('AgentChatStreamConsumer — stream delivery failure', () => {
	it('continues past a failed post and clears status after reporting the error', async () => {
		const localThread = mock<Thread<unknown, unknown>>();
		const error = new Error('Slack delivery failed');
		localThread.post.mockRejectedValue(error);
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeStreamingConsumer({ postErrorToThread });
		const clearBeforeResponse = vi.fn().mockResolvedValue(undefined);
		const resumeAfterResponse = vi.fn().mockResolvedValue(undefined);
		const toolStarted = vi.fn();
		async function* stream(): AsyncGenerator<StreamChunk> {
			yield { type: 'text-delta', id: 't-1', delta: 'Saving the reply.' };
			yield { type: 'text-end', id: 't-1' };
			yield { type: 'tool-call', toolCallId: 'save', toolName: 'save_reply', input: {} };
			toolStarted();
			yield { type: 'finish', finishReason: 'stop' };
		}

		await consumer.consume(stream(), localThread, {
			statusHandle: {
				keepDuringResponse: true,
				clearBeforeResponse,
				resumeAfterResponse,
			},
		});

		expect(postErrorToThread).toHaveBeenCalledOnce();
		const [, reported] = postErrorToThread.mock.calls[0];
		expect(reported).toBeInstanceOf(ReplyDeliveryError);
		expect((reported as ReplyDeliveryError).cause).toBe(error);
		expect(toolStarted).toHaveBeenCalledOnce();
		expect(toolStarted.mock.invocationCallOrder[0]).toBeGreaterThan(
			localThread.post.mock.invocationCallOrder[0],
		);
		expect(postErrorToThread.mock.invocationCallOrder[0]).toBeGreaterThan(
			toolStarted.mock.invocationCallOrder[0],
		);
		expect(resumeAfterResponse).toHaveBeenCalled();
		expect(clearBeforeResponse).toHaveBeenCalledOnce();
		expect(clearBeforeResponse.mock.invocationCallOrder[0]).toBeGreaterThan(
			postErrorToThread.mock.invocationCallOrder[0],
		);
	});

	it('posts the retained text when the streamed post fails', async () => {
		const { thread, discrete } = makeStreamingThread({ rejectAfterMs: 0 });
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeStreamingConsumer({ postErrorToThread });

		await consumer.consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'The full ' },
				{ type: 'text-delta', id: 't-1', delta: 'reply.' },
			]),
			thread,
		);

		expect(discrete).toEqual([{ markdown: 'The full reply.' }]);
		expect(postErrorToThread).not.toHaveBeenCalled();
	});
});

describe.each([
	['streaming', false],
	['buffered', true],
])('AgentChatStreamConsumer — maxMessageLength (%s)', (_name, disableStreaming) => {
	it('continues a long reply in new messages that end on whole lines', async () => {
		const { thread, streamedText, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer({ disableStreaming, maxMessageLength: 20 });
		const lines = Array.from({ length: 10 }, (_, i) => `line ${i}\n`);

		await consumer.consume(
			makeStream(lines.map((delta) => ({ type: 'text-delta', id: 't-1', delta }))),
			thread,
		);

		const messages = disableStreaming
			? discrete.map((message) => (message as { markdown: string }).markdown)
			: streamedText;
		expect(messages.length).toBeGreaterThan(1);
		expect(messages.join('')).toBe(lines.join(''));
		for (const message of messages) {
			expect(message.length).toBeLessThanOrEqual(20);
			expect(message.endsWith('\n')).toBe(true);
		}
	});

	it('breaks a line that does not fit in one message', async () => {
		const { thread, streamedText, discrete } = makeStreamingThread();
		const consumer = makeStreamingConsumer({ disableStreaming, maxMessageLength: 20 });
		const text = 'x'.repeat(50);

		await consumer.consume(makeStream([{ type: 'text-delta', id: 't-1', delta: text }]), thread);

		const messages = disableStreaming
			? discrete.map((message) => (message as { markdown: string }).markdown)
			: streamedText;
		expect(messages).toEqual(['x'.repeat(20), 'x'.repeat(20), 'x'.repeat(10)]);
	});
});

describe.each([
	['streaming', false],
	['buffered', true],
])('AgentChatStreamConsumer — text step boundaries (%s)', (_name, disableStreaming) => {
	async function consumeText(chunks: StreamChunk[]) {
		const { thread, streamedText, discrete } = makeStreamingThread();
		await makeStreamingConsumer({ disableStreaming }).consume(makeStream(chunks), thread);
		return disableStreaming ? discrete : streamedText;
	}

	function expectedText(text: string) {
		return disableStreaming ? [{ markdown: text }] : [text];
	}

	it('separates text before and after a tool call', async () => {
		const result = await consumeText([
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-1', delta: 'That is it.' },
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: {} },
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'lookup', output: { ok: true } },
			{ type: 'finish-step' },
			{ type: 'start-step' },
			{ type: 'reasoning-delta', id: 'r-1', delta: 'Internal reasoning' },
			{ type: 'text-delta', id: 't-2', delta: 'New ' },
			{ type: 'text-delta', id: 't-2', delta: 'word' },
			{ type: 'finish-step' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		expect(result).toEqual(expectedText('That is it.\n\nNew word'));
	});

	it('adds one separator across steps without text', async () => {
		const result = await consumeText([
			{ type: 'text-delta', id: 't-1', delta: 'Before' },
			{ type: 'finish-step' },
			{ type: 'start-step' },
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: {} },
			{ type: 'finish-step' },
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-2', delta: '' },
			{ type: 'text-delta', id: 't-2', delta: 'After' },
		]);

		expect(result).toEqual(expectedText('Before\n\nAfter'));
	});

	it('does not add a separator before the first text', async () => {
		const result = await consumeText([
			{ type: 'start-step' },
			{ type: 'finish-step' },
			{ type: 'start-step' },
			{ type: 'text-delta', id: 't-1', delta: 'First ' },
			{ type: 'text-delta', id: 't-1', delta: 'message' },
			{ type: 'finish-step' },
		]);

		expect(result).toEqual(expectedText('First message'));
	});

	it('starts text after a discrete message without a leading separator', async () => {
		const result = await consumeText([
			{ type: 'text-delta', id: 't-1', delta: 'Before' },
			{ type: 'finish-step' },
			{ type: 'message', message: { role: 'assistant', content: [] } },
			{ type: 'text-delta', id: 't-2', delta: 'After' },
		]);

		expect(result).toEqual(
			disableStreaming ? [{ markdown: 'Before' }, { markdown: 'After' }] : ['Before', 'After'],
		);
	});
});

describe.each([
	['streaming', false],
	['buffered', true],
])('AgentChatStreamConsumer — custom replies after progress (%s)', (_name, disableStreaming) => {
	it('calls the handler for each custom reply after visible progress', async () => {
		const { thread, streamedText, discrete } = makeStreamingThread();
		const replies: Array<Extract<StreamChunk, { type: 'message' }>> = [
			{
				type: 'message',
				message: { role: 'assistant', content: [{ type: 'text', text: 'First custom reply' }] },
			},
			{
				type: 'message',
				message: { role: 'assistant', content: [{ type: 'text', text: 'Second custom reply' }] },
			},
		];
		const handleMessage = vi.fn().mockResolvedValue(true);
		const consumer = makeStreamingConsumer({ disableStreaming, handleMessage });

		await consumer.consume(
			makeStream([
				{ type: 'text-delta', id: 'progress', delta: 'Preparing the replies.' },
				...replies,
				{ type: 'finish', finishReason: 'stop' },
			]),
			thread,
		);

		expect(handleMessage).toHaveBeenCalledTimes(2);
		expect(handleMessage).toHaveBeenNthCalledWith(
			1,
			replies[0],
			thread,
			...(disableStreaming ? [undefined] : []),
		);
		expect(handleMessage).toHaveBeenNthCalledWith(
			2,
			replies[1],
			thread,
			...(disableStreaming ? [undefined] : []),
		);
		expect(discrete).toEqual(disableStreaming ? [{ markdown: 'Preparing the replies.' }] : []);
		expect(streamedText).toEqual(disableStreaming ? [] : ['Preparing the replies.']);
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

describe('AgentChatStreamConsumer — suspension routing', () => {
	function makeSuspensionConsumer(disableStreaming: boolean) {
		const handleSuspension = vi.fn().mockResolvedValue('posted');
		const consumer = new AgentChatStreamConsumer({
			disableStreaming,
			logger: mock<Logger>(),
			postErrorToThread: vi.fn().mockResolvedValue(undefined),
			handleSuspension,
			handleMessage: vi.fn().mockResolvedValue(false),
			isIntegrationActionTool: () => true,
		});
		return { consumer, handleSuspension };
	}

	it.each([
		['streaming', false],
		['buffered', true],
	])('passes the acting user to the suspension handler (%s)', async (_name, disableStreaming) => {
		const { consumer, handleSuspension } = makeSuspensionConsumer(disableStreaming);

		await consumer.consume(makeStream([SUSPENDED_CHUNK]), thread, { actingUserId: 'user-1' });

		expect(handleSuspension).toHaveBeenCalledWith(SUSPENDED_CHUNK, thread, 'user-1');
	});

	it('leaves the acting user unset on a turn no user drove', async () => {
		const { consumer, handleSuspension } = makeSuspensionConsumer(true);

		await consumer.consume(makeStream([SUSPENDED_CHUNK]), thread);

		expect(handleSuspension).toHaveBeenCalledWith(SUSPENDED_CHUNK, thread, undefined);
	});
});

const SESSION_BUDGET_MESSAGE =
	'⚠️ This session reached its cost cap and stopped. Open the agent in n8n and increase the cap.';
const MONTHLY_BUDGET_MESSAGE =
	'⚠️ This agent reached its monthly budget and stopped. Open the agent in n8n and increase the cap.';

describe('AgentChatStreamConsumer — budget stop', () => {
	it('posts the session message once and clears the status when the run never starts', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);
		const localThread = mock<Thread<unknown, unknown>>();
		const clearBeforeResponse = vi.fn().mockResolvedValue(undefined);

		await consumer.consume(
			makeStream([
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.session' } },
			]),
			localThread,
			{ statusHandle: { clearBeforeResponse } },
		);

		expect(localThread.post).toHaveBeenCalledTimes(1);
		expect(localThread.post).toHaveBeenCalledWith({ markdown: SESSION_BUDGET_MESSAGE });
		expect(clearBeforeResponse).toHaveBeenCalledTimes(1);
		expect(postErrorToThread).not.toHaveBeenCalled();
	});

	it.each([
		['streaming', false],
		['buffered', true],
	])('posts partial text and then the monthly message (%s)', async (_name, disableStreaming) => {
		const { thread: localThread, streamedText, discrete } = makeStreamingThread();

		await makeStreamingConsumer({ disableStreaming }).consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'Partial answer' },
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.monthly' } },
			]),
			localThread,
		);

		if (disableStreaming) {
			expect(discrete).toEqual([
				{ markdown: 'Partial answer' },
				{ markdown: MONTHLY_BUDGET_MESSAGE },
			]);
			return;
		}
		expect(streamedText).toEqual(['Partial answer']);
		expect(discrete).toEqual([{ markdown: MONTHLY_BUDGET_MESSAGE }]);
	});

	it('does not post a budget message when the run finishes normally', async () => {
		const { thread: localThread, discrete } = makeStreamingThread();

		await makeStreamingConsumer({ disableStreaming: true }).consume(
			makeStream([
				{ type: 'text-delta', id: 't-1', delta: 'All done' },
				{ type: 'finish', finishReason: 'stop' },
			]),
			localThread,
		);

		expect(discrete).toEqual([{ markdown: 'All done' }]);
	});

	it('reports a rejected budget post once and does not post the budget line again', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);
		const localThread = mock<Thread<unknown, unknown>>();
		const deliveryError = new Error('delivery failed');
		localThread.post.mockRejectedValue(deliveryError);

		await consumer.consume(
			makeStream([
				{ type: 'finish', finishReason: 'guardrail', guardrail: { code: 'budget.session' } },
			]),
			localThread,
		);

		expect(localThread.post).toHaveBeenCalledTimes(1);
		expect(localThread.post).toHaveBeenCalledWith({ markdown: SESSION_BUDGET_MESSAGE });
		expect(postErrorToThread).toHaveBeenCalledTimes(1);
		expect(postErrorToThread).toHaveBeenCalledWith(
			localThread,
			expect.any(ReplyDeliveryError),
			undefined,
		);
	});
});

describe('AgentChatStreamConsumer — stopped sessions', () => {
	it.each([
		{ disableStreaming: false, partial: '' },
		{ disableStreaming: false, partial: 'Partial reply' },
		{ disableStreaming: true, partial: '' },
		{ disableStreaming: true, partial: 'Partial reply' },
	])('posts one stop notice for %j', async ({ disableStreaming, partial }) => {
		const { thread, discrete, streamedText } = makeStreamingThread();
		const postErrorToThread = vi.fn();
		const clearBeforeResponse = vi.fn();
		const consumer = makeStreamingConsumer({ disableStreaming, postErrorToThread });
		const chunks: StreamChunk[] = partial
			? [{ type: 'text-delta', id: 'text', delta: partial }]
			: [];
		chunks.push(
			{
				type: 'tool-result',
				toolName: 'work',
				toolCallId: 'tc',
				isError: true,
				output: 'Incomplete',
			},
			{ type: 'finish', finishReason: 'cancelled' },
			{ type: 'finish', finishReason: 'cancelled' },
		);

		await consumer.consume(makeStream(chunks), thread, { statusHandle: { clearBeforeResponse } });

		expect(
			discrete.filter(
				(message) => (message as { markdown?: string }).markdown === 'Session stopped',
			),
		).toEqual([{ markdown: 'Session stopped' }]);
		if (partial) {
			if (disableStreaming) expect(discrete[0]).toEqual({ markdown: partial });
			else expect(streamedText).toEqual([partial]);
		}
		expect(postErrorToThread).not.toHaveBeenCalled();
		expect(clearBeforeResponse).toHaveBeenCalled();
	});
});

describe('AgentChatStreamConsumer — files queued for the final reply', () => {
	const queued = (toolCallId: string, fileIds: string[]): StreamChunk => ({
		type: 'tool-result',
		toolCallId,
		toolName: 'telegram_action',
		output: { ok: true, queuedFileIds: fileIds, note: 'The files go with your final reply.' },
	});

	function makeFilesConsumer(disableStreaming: boolean) {
		const postReplyFiles = vi.fn().mockResolvedValue(undefined);
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = new AgentChatStreamConsumer({
			disableStreaming,
			logger: mock<Logger>(),
			postErrorToThread,
			handleSuspension: vi.fn().mockResolvedValue('posted'),
			handleMessage: vi.fn().mockResolvedValue(true),
			isIntegrationActionTool: (toolName) => toolName === 'telegram_action',
			postReplyFiles,
		});
		return { consumer, postReplyFiles, postErrorToThread };
	}

	it('posts the files with the final reply as caption on a buffered platform', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);
		const localThread = mock<Thread<unknown, unknown>>();

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Here is your chart.' },
			]),
			localThread,
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).toHaveBeenCalledTimes(1);
		expect(postReplyFiles).toHaveBeenCalledWith(localThread, {
			fileIds: ['file-1'],
			caption: 'Here is your chart.',
			agentThreadId: 'agent-thread-1',
			onPosted: expect.any(Function),
		});
		expect(localThread.post).not.toHaveBeenCalled();
	});

	it('posts the files in their own message after a streamed reply', async () => {
		const { thread: localThread, streamedText } = makeStreamingThread();
		const { consumer, postReplyFiles } = makeFilesConsumer(false);

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Here is your chart.' },
			]),
			localThread,
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(streamedText).toEqual(['Here is your chart.']);
		expect(postReplyFiles).toHaveBeenCalledWith(localThread, {
			fileIds: ['file-1'],
			caption: '',
			agentThreadId: 'agent-thread-1',
			onPosted: expect.any(Function),
		});
	});

	it('reads files that a batch action queued', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'telegram_action',
					output: {
						ok: true,
						results: [{ action: 'respond', result: { ok: true, queuedFileIds: ['file-1'] } }],
					},
				},
			]),
			mock<Thread<unknown, unknown>>(),
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ fileIds: ['file-1'] }),
		);
	});

	it('ignores queued file IDs from tools other than the integration action tool', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);

		await consumer.consume(
			makeStream([
				{ ...queued('tc-1', ['file-1']), toolName: 'some_workflow_tool' } as StreamChunk,
			]),
			mock<Thread<unknown, unknown>>(),
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).not.toHaveBeenCalled();
	});

	it.each([
		['streaming', false],
		['buffered', true],
	])('keeps the files of a suspended run for its resume (%s)', async (_name, disableStreaming) => {
		const { consumer, postReplyFiles } = makeFilesConsumer(disableStreaming);

		await consumer.consume(
			makeStream([queued('tc-1', ['file-1']), SUSPENDED_CHUNK]),
			makeStreamingThread().thread,
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).not.toHaveBeenCalled();
	});

	it('sends the files that a resumed run queued before its suspension one time', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);

		await consumer.consume(
			makeStream([
				// The resumed tool call can report its result again. It must not add the file twice.
				queued('tc-1', ['file-1']),
				queued('tc-2', ['file-2']),
				{ type: 'text-delta', id: 't-1', delta: 'Done.' },
			]),
			mock<Thread<unknown, unknown>>(),
			{
				agentThreadId: 'agent-thread-1',
				earlierToolResults: [
					{
						toolCallId: 'tc-1',
						toolName: 'telegram_action',
						output: { ok: true, queuedFileIds: ['file-1'] },
					},
				],
			},
		);

		expect(postReplyFiles).toHaveBeenCalledTimes(1);
		expect(postReplyFiles).toHaveBeenCalledWith(expect.anything(), {
			fileIds: ['file-1', 'file-2'],
			caption: 'Done.',
			agentThreadId: 'agent-thread-1',
			onPosted: expect.any(Function),
		});
	});

	it('sends the files without a caption after do_not_respond', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Staying quiet' },
				{
					type: 'tool-result',
					toolCallId: 'tc-2',
					toolName: 'telegram_action',
					output: { ok: true, silent: true },
				},
			]),
			mock<Thread<unknown, unknown>>(),
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ fileIds: ['file-1'], caption: '' }),
		);
	});

	it('sends the files without a caption when the run ends with no text', async () => {
		const { consumer, postReplyFiles } = makeFilesConsumer(true);

		await consumer.consume(
			makeStream([queued('tc-1', ['file-1'])]),
			mock<Thread<unknown, unknown>>(),
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ fileIds: ['file-1'], caption: '' }),
		);
	});

	it('posts the reply text and an error when the files cannot be sent', async () => {
		const { consumer, postReplyFiles, postErrorToThread } = makeFilesConsumer(true);
		const error = new Error('File "file-1" not found in this conversation.');
		postReplyFiles.mockRejectedValue(error);
		const localThread = mock<Thread<unknown, unknown>>();

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Here is your chart.' },
			]),
			localThread,
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(localThread.post).toHaveBeenCalledWith({ markdown: 'Here is your chart.' });
		expect(postErrorToThread).toHaveBeenCalledWith(localThread, error, undefined);
	});

	it('does not post the reply text again when a later file group fails', async () => {
		const { consumer, postReplyFiles, postErrorToThread } = makeFilesConsumer(true);
		const error = new Error('Failed to upload the second file group');
		// The first group goes out with the caption, then the second group fails.
		postReplyFiles.mockImplementation(async (_thread, { onPosted }) => {
			onPosted?.();
			throw error;
		});
		const localThread = mock<Thread<unknown, unknown>>();

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1', 'doc-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Here is your chart.' },
			]),
			localThread,
			{ agentThreadId: 'agent-thread-1' },
		);

		expect(postReplyFiles).toHaveBeenCalledWith(
			localThread,
			expect.objectContaining({ caption: 'Here is your chart.' }),
		);
		expect(localThread.post).not.toHaveBeenCalled();
		expect(postErrorToThread).toHaveBeenCalledWith(localThread, error, undefined);
	});

	it('posts the reply text when the files of a wake delivery cannot be sent', async () => {
		const { consumer, postReplyFiles, postErrorToThread } = makeFilesConsumer(true);
		const error = new Error('File "file-1" not found in this conversation.');
		postReplyFiles.mockRejectedValue(error);
		const localThread = mock<Thread<unknown, unknown>>();

		await consumer.consume(
			makeStream([
				queued('tc-1', ['file-1']),
				{ type: 'text-delta', id: 't-1', delta: 'Here is your chart.' },
			]),
			localThread,
			{ agentThreadId: 'agent-thread-1', throwOnDeliveryError: true },
		);

		expect(localThread.post).toHaveBeenCalledWith({ markdown: 'Here is your chart.' });
		expect(postErrorToThread).toHaveBeenCalledWith(localThread, error, true);
	});
});
