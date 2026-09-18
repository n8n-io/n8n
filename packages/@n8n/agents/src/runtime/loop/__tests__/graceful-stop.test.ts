import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import type { ExecutionOptions, StreamChunk } from '../../../types/sdk/agent';
import { InMemoryMemory } from '../../memory/memory-store';
import { AgentEventBus } from '../../state/event-bus';
import { AgentRuntime } from '../agent-runtime';

vi.mock('../../../sdk/catalog', () => ({
	getModelCost: vi.fn().mockResolvedValue(undefined),
	computeCost: vi.fn().mockReturnValue(undefined),
}));

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};
const PERSISTENCE = { threadId: 'thread-1', resourceId: 'user-1' };
const SKIPPED = '[Skipped: the user sent a new instruction]';
const CANCELLED = '[Tool call cancelled: the user sent a new instruction]';

/**
 * A two-step run: the first model turn calls the lookup tool `toolCalls` times,
 * the second answers. The host check runs before each tool call and at the
 * clean boundary between the two steps.
 */
async function runWithCheck(
	options: ExecutionOptions = {},
	toolCalls = 1,
	handler = vi.fn().mockResolvedValue({ found: true }),
) {
	const model = new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: [
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					...Array.from({ length: toolCalls }, (_, index) => ({
						type: 'tool-call' as const,
						toolCallId: `tc-${index + 1}`,
						toolName: 'lookup',
						input: '{}',
					})),
					{
						type: 'finish',
						finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
						usage: USAGE,
					},
				]),
			},
			{
				stream: convertArrayToReadableStream<MockStreamPart>([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'txt-1' },
					{ type: 'text-delta', id: 'txt-1', delta: 'Done.' },
					{ type: 'text-end', id: 'txt-1' },
					{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
				]),
			},
		],
	});
	const memory = new InMemoryMemory();
	const runtime = new AgentRuntime({
		name: 'graceful-stop-test',
		model,
		instructions: 'Use the lookup tool.',
		tools: [{ name: 'lookup', description: 'Look up data', inputSchema: z.object({}), handler }],
		eventBus: new AgentEventBus(),
		memory,
	});
	const result = await runtime.stream('Look up the data.', {
		...options,
		persistence: PERSISTENCE,
		smoothStream: false,
	});
	const chunks: StreamChunk[] = [];
	const reader = result.stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
	const persisted = await memory.getMessages(PERSISTENCE.threadId, {
		resourceId: PERSISTENCE.resourceId,
	});
	return { model, chunks, persisted, result, handler };
}

describe('shouldStopGracefully', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('runs every step when no check is supplied', async () => {
		const { model, chunks, handler } = await runWithCheck();

		expect(handler).toHaveBeenCalledOnce();
		expect(model.doStreamCalls).toHaveLength(2);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
	});

	it('asks before each tool call and at the boundary, and continues on false', async () => {
		const shouldStopGracefully = vi.fn().mockResolvedValue(false);
		const { model, handler } = await runWithCheck({ shouldStopGracefully }, 2);

		expect(shouldStopGracefully.mock.calls).toEqual([
			[{ step: 1, before: 'tool-call' }],
			[{ step: 1, before: 'tool-call' }],
			[{ step: 1, before: 'model-call' }],
		]);
		expect(handler).toHaveBeenCalledTimes(2);
		expect(model.doStreamCalls).toHaveLength(2);
	});

	it('ends the run at the boundary as a normal completion', async () => {
		const shouldStopGracefully = vi.fn(
			async ({ before }: { before: string }) => before === 'model-call',
		);
		const { model, chunks, persisted, result, handler } = await runWithCheck({
			shouldStopGracefully,
		});

		// The tool call ran; the step the check refused never started; not a cancellation.
		expect(handler).toHaveBeenCalledOnce();
		expect(model.doStreamCalls).toHaveLength(1);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
		expect(result.getState().status).toBe('success');
		expect(persisted).toContainEqual(
			expect.objectContaining({
				role: 'assistant',
				content: [expect.objectContaining({ type: 'tool-call', state: 'resolved' })],
			}),
		);
	});

	it('lets the tool call in flight finish and skips the rest of the batch', async () => {
		// The first call is in flight when the host's answer changes: it must run
		// to its end, and only the call that has not started is skipped.
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let stopRequested = false;
		const handler = vi.fn(async () => {
			await gate;
			return { found: true };
		});
		const shouldStopGracefully = vi.fn(async () => stopRequested);
		const run = runWithCheck({ shouldStopGracefully }, 2, handler);
		await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
		stopRequested = true;
		release();
		const { model, chunks, persisted, result } = await run;

		expect(handler).toHaveBeenCalledOnce();
		expect(model.doStreamCalls).toHaveLength(1);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
		expect(result.getState().status).toBe('success');
		// Asked before each call and once at the boundary; the first answer that
		// is true is final, so the boundary is not asked again.
		expect(shouldStopGracefully).toHaveBeenCalledTimes(2);
		const assistant = persisted.find(
			(message) => 'role' in message && message.role === 'assistant',
		);
		expect(assistant && 'content' in assistant ? assistant.content : undefined).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ toolCallId: 'tc-1', state: 'resolved' }),
				expect.objectContaining({ toolCallId: 'tc-2', output: SKIPPED }),
			]),
		);
	});

	it('logs a failing check and keeps the run going', async () => {
		const error = new Error('Queue unavailable');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const { model, chunks, result } = await runWithCheck({
			shouldStopGracefully: () => {
				throw error;
			},
		});

		expect(warn).toHaveBeenCalledWith('Graceful stop check failed; continuing the run', {
			runId: result.runId,
			error,
		});
		expect(model.doStreamCalls).toHaveLength(2);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
	});

	it('interrupt: cancels the tool call in flight and ends the run as a completion', async () => {
		const interrupt = new AbortController();
		// The host interrupts while the call runs; the executor cancels it through
		// the tool's own signal, so the handler never gets to finish.
		const handler = vi.fn(async (_input: unknown, ctx: { abortSignal?: AbortSignal }) => {
			interrupt.abort();
			await new Promise<never>((_resolve, reject) => {
				ctx.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
					once: true,
				});
			});
			return { found: true };
		});
		const shouldStopGracefully = vi.fn().mockResolvedValue(false);
		const { model, chunks, persisted, result } = await runWithCheck(
			{ shouldStopGracefully, interruptSignal: interrupt.signal },
			2,
			handler,
		);

		expect(handler).toHaveBeenCalledOnce();
		expect(model.doStreamCalls).toHaveLength(1);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
		expect(result.getState().status).toBe('success');
		// The host was still asked, so it can record the stop.
		expect(shouldStopGracefully).toHaveBeenCalledWith({ step: 1, before: 'model-call' });
		const assistant = persisted.find(
			(message) => 'role' in message && message.role === 'assistant',
		);
		expect(assistant && 'content' in assistant ? assistant.content : undefined).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ toolCallId: 'tc-1', output: CANCELLED }),
				expect.objectContaining({ toolCallId: 'tc-2', output: SKIPPED }),
			]),
		);
	});

	it('interrupt: a signal that fired before the run started still ends it at the first check', async () => {
		const interrupt = new AbortController();
		interrupt.abort();
		const { model, chunks, result, handler } = await runWithCheck({
			shouldStopGracefully: vi.fn().mockResolvedValue(false),
			interruptSignal: interrupt.signal,
		});

		// The first model call is cancelled outright; nothing else runs.
		expect(handler).not.toHaveBeenCalled();
		expect(model.doStreamCalls.length).toBeLessThanOrEqual(1);
		expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
		expect(result.getState().status).toBe('success');
	});
});
