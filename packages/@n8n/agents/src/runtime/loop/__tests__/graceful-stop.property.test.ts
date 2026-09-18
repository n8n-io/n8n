import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import fc from 'fast-check';
import { z } from 'zod';

import type { ExecutionOptions, StreamChunk } from '../../../types/sdk/agent';
import { InMemoryMemory } from '../../memory/memory-store';
import { AgentEventBus } from '../../state/event-bus';
import { AgentRuntime } from '../agent-runtime';

vi.mock('../../../sdk/catalog', () => ({
	getModelCost: vi.fn().mockResolvedValue(undefined),
	computeCost: vi.fn().mockReturnValue(undefined),
}));

/**
 * Property tests for the two ways a host ends a run early. For any batch of
 * tool calls and any point the host picks, the outcome must be the same
 * shape: the calls before the point ran, the one at the point either ran or
 * was cancelled, the rest were skipped, every call is settled for the model,
 * no further model call was made, and the run is a normal completion.
 */

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};
const PERSISTENCE = { threadId: 'thread-1', resourceId: 'user-1' };
const SKIPPED = '[Skipped: the user sent a new instruction]';
const CANCELLED = '[Tool call cancelled: the user sent a new instruction]';
const MAX_TOOL_CALLS = 6;

type ToolCallPart = { toolCallId: string; state?: string; output?: unknown };

async function runBatch(
	toolCalls: number,
	options: ExecutionOptions,
	handler: (input: unknown, ctx: { abortSignal?: AbortSignal }) => Promise<unknown>,
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
						toolCallId: `tc-${index}`,
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
		name: 'graceful-stop-property',
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
	const persisted = await memory.getMessages(PERSISTENCE.threadId, {
		resourceId: PERSISTENCE.resourceId,
	});
	const assistant = persisted.find((message) => 'role' in message && message.role === 'assistant');
	const parts =
		assistant && 'content' in assistant && Array.isArray(assistant.content)
			? (assistant.content as ToolCallPart[]).filter((part) => 'toolCallId' in part)
			: [];
	return { model, chunks, result, parts };
}

/** Every call is settled: the first `resolved` ran, the rest read as skipped or cancelled. */
function expectSettled(parts: ToolCallPart[], toolCalls: number, resolved: number, cancelled = 0) {
	expect(parts.map((part) => part.toolCallId)).toEqual(
		Array.from({ length: toolCalls }, (_, index) => `tc-${index}`),
	);
	parts.forEach((part, index) => {
		if (index < resolved) expect(part.state).toBe('resolved');
		else if (index < resolved + cancelled) expect(part.output).toBe(CANCELLED);
		else expect(part.output).toBe(SKIPPED);
	});
}

describe('graceful stop — properties', () => {
	it('a check that turns true before call k runs exactly k calls and settles the rest', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 1, max: MAX_TOOL_CALLS }),
				fc.integer({ min: 0, max: MAX_TOOL_CALLS }),
				async (toolCalls, stopAt) => {
					const k = Math.min(stopAt, toolCalls);
					let asked = 0;
					const handler = vi.fn(async () => ({ ok: true }));
					const { model, chunks, result, parts } = await runBatch(
						toolCalls,
						// Before each tool call the host is asked once; true from the k-th ask.
						{ shouldStopGracefully: vi.fn(async () => asked++ >= k) },
						handler,
					);

					expect(handler).toHaveBeenCalledTimes(k);
					expect(model.doStreamCalls).toHaveLength(1);
					expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
					expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
					expect(result.getState().status).toBe('success');
					expectSettled(parts, toolCalls, k);
				},
			),
			{ numRuns: 60 },
		);
	});

	it('an interrupt during call j cancels it, skips the rest and still completes the run', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 1, max: MAX_TOOL_CALLS }),
				fc.integer({ min: 0, max: MAX_TOOL_CALLS - 1 }),
				async (toolCalls, interruptAt) => {
					const j = Math.min(interruptAt, toolCalls - 1);
					const interrupt = new AbortController();
					let started = 0;
					const handler = vi.fn(async (_input: unknown, ctx: { abortSignal?: AbortSignal }) => {
						if (started++ !== j) return { ok: true };
						// The host interrupts while this call runs; the call observes its own
						// signal and never gets to finish.
						interrupt.abort();
						await new Promise<never>((_resolve, reject) => {
							ctx.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
								once: true,
							});
						});
						return { ok: true };
					});
					const { model, chunks, result, parts } = await runBatch(
						toolCalls,
						{
							shouldStopGracefully: vi.fn().mockResolvedValue(false),
							interruptSignal: interrupt.signal,
						},
						handler,
					);

					expect(handler).toHaveBeenCalledTimes(j + 1);
					expect(model.doStreamCalls).toHaveLength(1);
					expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
					expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
					expect(result.getState().status).toBe('success');
					expectSettled(parts, toolCalls, j, 1);
				},
			),
			{ numRuns: 60 },
		);
	});

	it('without a stop, every call runs and the run takes its second model turn', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: MAX_TOOL_CALLS }), async (toolCalls) => {
				const handler = vi.fn(async () => ({ ok: true }));
				const { model, chunks, result, parts } = await runBatch(
					toolCalls,
					{ shouldStopGracefully: vi.fn().mockResolvedValue(false) },
					handler,
				);

				expect(handler).toHaveBeenCalledTimes(toolCalls);
				expect(model.doStreamCalls).toHaveLength(2);
				expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
				expect(result.getState().status).toBe('success');
				expectSettled(parts, toolCalls, toolCalls);
			}),
			{ numRuns: 30 },
		);
	});
});
