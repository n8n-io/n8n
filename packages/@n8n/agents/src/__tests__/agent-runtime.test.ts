import { z } from 'zod';

import { AgentRuntime } from '../runtime/agent-runtime';
import { AgentEventBus } from '../runtime/event-bus';
import { isLlmMessage } from '../sdk/message';
import { Tool, Tool as ToolBuilder } from '../sdk/tool';
import { AgentEvent } from '../types/runtime/event';
import type { StreamChunk } from '../types/sdk/agent';
import type { ContentToolResult, Message } from '../types/sdk/message';
import type { BuiltTool, InterruptibleToolContext } from '../types/sdk/tool';
import type { BuiltTelemetry } from '../types/telemetry';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock provider packages so createModel() doesn't fail when no API key is set
jest.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

jest.mock('@ai-sdk/anthropic', () => ({
	createAnthropic: () => () => ({
		provider: 'anthropic',
		modelId: 'mock',
		specificationVersion: 'v3',
	}),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

// Mock generateText and streamText from the 'ai' package
jest.mock('ai', () => {
	const actual = jest.requireActual<AiImport>('ai');
	return {
		...actual,
		generateText: jest.fn(),
		streamText: jest.fn(),
		tool: jest.fn((config: unknown) => config),
		Output: {
			object: jest.fn(({ schema }: { schema: unknown }) => ({ _type: 'object', schema })),
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateText, streamText } = require('ai') as {
	generateText: jest.Mock;
	streamText: jest.Mock;
};

/** Minimal successful generateText response. */
function makeGenerateSuccess(text = 'OK') {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'text', text }],
				},
			],
		},
		toolCalls: [],
	};
}

/** Generator that yields the given chunks then ends cleanly. */
function* makeChunkStream(
	chunks: Array<Record<string, unknown>>,
): Generator<Record<string, unknown>> {
	for (const c of chunks) {
		yield c;
	}
}

/**
 * Create a pre-rejected promise whose rejection is already handled, so it
 * never causes an unhandled-rejection crash even if nobody awaits it.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
function silentReject<T = never>(error: Error): Promise<T> {
	const p = Promise.reject<T>(error);
	p.catch(() => {}); // suppress unhandled-rejection warning
	return p;
}

function makeErrorStream(error: Error) {
	return new ReadableStream({
		start(controller) {
			controller.error(error);
		},
	});
}

/** Collect all chunks from a ReadableStream. */
async function collectChunks(stream: ReadableStream<unknown>): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value as StreamChunk);
	}
	return chunks;
}

/** Minimal successful streamText response. */
function makeStreamSuccess(text = 'Hello') {
	return {
		fullStream: makeChunkStream([{ type: 'text-delta', textDelta: text }]),
		finishReason: Promise.resolve('stop'),
		usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
		response: Promise.resolve({
			messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		}),
		toolCalls: Promise.resolve([]),
	};
}

/** Build a default runtime wired to the shared eventBus for inspection. */
function createRuntime(eventBus?: AgentEventBus) {
	const bus = eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		eventBus: bus,
	});
	return { runtime, bus };
}

const testSchema = z.object({ answer: z.string(), score: z.number() });

/** Build a runtime configured with structuredOutput. */
function createStructuredRuntime(options?: { tools?: BuiltTool[]; eventBus?: AgentEventBus }) {
	const bus = options?.eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test-structured',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		structuredOutput: testSchema,
		eventBus: bus,
		...(options?.tools ? { tools: options.tools } : {}),
	});
	return { runtime, bus };
}

/** Minimal successful generateText response with structured output. */
function makeGenerateSuccessWithOutput(output: unknown, text = 'OK') {
	return { ...makeGenerateSuccess(text), output };
}

/** Minimal successful streamText response with structured output. */
function makeStreamSuccessWithOutput(output: unknown, text = 'Hello') {
	return { ...makeStreamSuccess(text), output: Promise.resolve(output) };
}

/** Mock generateText response that triggers a tool call. */
function makeGenerateWithToolCall(toolCallId: string, toolName: string, input: unknown) {
	return {
		finishReason: 'tool-calls',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId, toolName, args: input }],
				},
			],
		},
		toolCalls: [{ toolCallId, toolName, input }],
	};
}

/** Build an interruptible tool that suspends on first call and returns on resume. */
function makeInterruptibleTool(): BuiltTool {
	return {
		name: 'approve',
		description: 'Requires approval',
		inputSchema: z.object({ question: z.string() }),
		suspendSchema: z.object({ question: z.string() }),
		resumeSchema: z.object({ approved: z.boolean() }),
		handler: async (_input: unknown, ctx: unknown) => {
			const { suspend, resumeData } = ctx as InterruptibleToolContext;
			if (!resumeData) {
				return await suspend({ question: 'approve?' });
			}
			return { approved: true };
		},
	};
}

// ---------------------------------------------------------------------------
// generate() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.generate() — graceful error contract', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('resolves (never rejects) when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		await expect(runtime.generate('hello')).resolves.toBeDefined();
	});

	it('returns finishReason "error" when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('error');
	});

	it('surfaces the original error in result.error when the LLM call throws', async () => {
		const cause = new Error('API failure');
		generateText.mockRejectedValue(cause);

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.error).toBe(cause);
	});

	it('sets state to "failed" when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime } = createRuntime();
		await runtime.generate('hello');

		expect(runtime.getState().status).toBe('failed');
	});

	it('emits AgentEvent.Error (not AgentEnd) when the LLM call throws', async () => {
		generateText.mockRejectedValue(new Error('API failure'));

		const { runtime, bus } = createRuntime();
		const errorEvents: unknown[] = [];
		const endEvents: unknown[] = [];
		bus.on(AgentEvent.Error, (d) => errorEvents.push(d));
		bus.on(AgentEvent.AgentEnd, (d) => endEvents.push(d));

		await runtime.generate('hello');

		expect(errorEvents.length).toBe(1);
		expect(endEvents.length).toBe(0);
	});

	it('does NOT emit AgentEvent.Error for abort — only sets cancelled state', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		const errorEvents: unknown[] = [];
		bus.on(AgentEvent.Error, (d) => errorEvents.push(d));

		// Abort during AgentStart so the loop's first abort-check fires before generateText is called
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		await runtime.generate('hello');

		expect(errorEvents.length).toBe(0);
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('returns finishReason "error" and sets cancelled status on abort', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		// Abort during AgentStart so the loop's first abort-check fires before generateText is called
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('error');
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('is reusable after an error — subsequent call with a good LLM response succeeds', async () => {
		generateText
			.mockRejectedValueOnce(new Error('transient error'))
			.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();

		const first = await runtime.generate('hello');
		expect(first.finishReason).toBe('error');

		const second = await runtime.generate('hello');
		expect(second.finishReason).toBe('stop');
		expect(second.error).toBeUndefined();
	});

	it('returns an empty messages array (no partial data) when abort fires before the first LLM call', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('first turn response'));

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		const result = await runtime.generate('hello');
		// Abort fired before any LLM response was accumulated
		expect(result.finishReason).toBe('error');
		expect(result.messages).toEqual([]);
	});

	it('succeeds normally when there is no error', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Great answer'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();
		expect(result.messages.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// stream() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.stream() — graceful error contract', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('resolves (never rejects) when the LLM stream throws', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		await expect(runtime.stream('hello')).resolves.toBeDefined();
	});

	it('yields an error chunk when the LLM stream throws', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);
	});

	it('closes the stream cleanly (with a finish chunk) after an error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const finishChunks = chunks.filter((c) => c.type === 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);

		const finish = finishChunks[finishChunks.length - 1] as StreamChunk & {
			type: 'finish';
			finishReason: string;
		};
		expect(finish.finishReason).toBe('error');
	});

	it('sets state to "failed" after a stream error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');
		await collectChunks(readableStream);

		expect(runtime.getState().status).toBe('failed');
	});

	it('yields error chunk and finishes cleanly on abort', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.TurnStart, () => bus.abort());

		const { stream: readableStream } = await runtime.stream('hello');
		const chunks = await collectChunks(readableStream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);

		expect(runtime.getState().status).toBe('cancelled');
	});

	it('stream is reusable after an error', async () => {
		const streamError = new Error('transient');
		streamText
			.mockReturnValueOnce({
				fullStream: makeErrorStream(streamError),
				finishReason: silentReject(streamError),
				usage: Promise.resolve(undefined),
				response: silentReject(streamError),
				toolCalls: Promise.resolve([]),
			})
			.mockReturnValue(makeStreamSuccess('OK'));

		const { runtime } = createRuntime();

		const { stream: firstStream } = await runtime.stream('hello');
		const firstChunks = await collectChunks(firstStream);
		expect(firstChunks.some((c) => c.type === 'error')).toBe(true);

		const { stream: secondStream } = await runtime.stream('hello');
		const secondChunks = await collectChunks(secondStream);
		expect(secondChunks.some((c) => c.type === 'finish')).toBe(true);
		const finish = secondChunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
			finishReason: string;
		};
		expect(finish.finishReason).toBe('stop');
	});

	it('never throws when consuming the stream after an error', async () => {
		const streamError = new Error('stream broke');
		streamText.mockReturnValue({
			fullStream: makeErrorStream(streamError),
			finishReason: silentReject(streamError),
			usage: Promise.resolve(undefined),
			response: silentReject(streamError),
			toolCalls: Promise.resolve([]),
		});

		const { runtime } = createRuntime();
		const { stream: readableStream } = await runtime.stream('hello');

		await expect(collectChunks(readableStream)).resolves.toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// resume() — graceful error contract
// ---------------------------------------------------------------------------

describe('AgentRuntime.resume() — graceful error contract', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('rejects with an error when the runId is not found', async () => {
		const { runtime } = createRuntime();
		const streamPromise = runtime.resume(
			'stream',
			{ approved: true },
			{ runId: 'nonexistent-run-id', toolCallId: 'tc-1' },
		);
		await expect(streamPromise).rejects.toThrow(
			'No suspended run found for runId: nonexistent-run-id',
		);
	});
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('AgentRuntime — state transitions on error', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('starts idle, then reflects running→failed after a generate error', async () => {
		const { runtime } = createRuntime();

		expect(runtime.getState().status).toBe('idle');

		generateText.mockRejectedValue(new Error('oops'));
		const runDone = runtime.generate('hi');

		await runDone;
		expect(runtime.getState().status).toBe('failed');
	});

	it('starts idle, then reflects running→cancelled on abort', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.AgentStart, () => bus.abort());

		await runtime.generate('hi');
		expect(runtime.getState().status).toBe('cancelled');
	});

	it('transitions to success on a clean run', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();
		await runtime.generate('hi');

		expect(runtime.getState().status).toBe('success');
	});
});

// ---------------------------------------------------------------------------
// Concurrent tool execution
// ---------------------------------------------------------------------------

/** Create a simple non-interruptible mock tool. */
function makeMockTool(name: string, handler: (input: unknown) => Promise<unknown>): BuiltTool {
	return {
		name,
		description: `Mock tool ${name}`,
		inputSchema: z.object({ value: z.string().optional() }),
		handler: async (input) => await handler(input),
	};
}

/** Create an interruptible mock tool that suspends. */
function makeSuspendingTool(
	name: string,
	handler: (input: unknown, ctx: InterruptibleToolContext) => Promise<unknown>,
): BuiltTool {
	return {
		name,
		description: `Suspending tool ${name}`,
		inputSchema: z.object({ value: z.string().optional() }),
		suspendSchema: z.object({ reason: z.string() }),
		resumeSchema: z.object({ approved: z.boolean() }),
		handler: async (input, ctx) => await handler(input, ctx as InterruptibleToolContext),
	};
}

/** Build a runtime with tools and concurrency config. */
function createRuntimeWithTools(tools: BuiltTool[], concurrency: number, eventBus?: AgentEventBus) {
	const bus = eventBus ?? new AgentEventBus();
	const runtime = new AgentRuntime({
		name: 'test',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test assistant.',
		tools,
		eventBus: bus,
		toolCallConcurrency: concurrency,
		checkpointStorage: 'memory',
	});
	return { runtime, bus };
}

/** Create a generateText response that triggers tool calls, then a follow-up stop. */
function makeGenerateWithToolCalls(
	toolCalls: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown> }>,
) {
	return {
		finishReason: 'tool-calls',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: toolCalls.map((tc) => ({
						type: 'tool-call',
						toolCallId: tc.toolCallId,
						toolName: tc.toolName,
						args: tc.args,
					})),
				},
			],
		},
		toolCalls: toolCalls.map((tc) => ({
			toolCallId: tc.toolCallId,
			toolName: tc.toolName,
			input: tc.args,
		})),
	};
}

describe('AgentRuntime — concurrent tool execution', () => {
	beforeEach(() => {
		generateText.mockReset();
		streamText.mockReset();
	});

	it('runs tools concurrently when concurrency > 1', async () => {
		let peakConcurrency = 0;
		let activeConcurrency = 0;

		const slowTool = makeMockTool('slow_tool', async () => {
			activeConcurrency++;
			peakConcurrency = Math.max(peakConcurrency, activeConcurrency);
			await new Promise((r) => setTimeout(r, 50));
			activeConcurrency--;
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([slowTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'slow_tool', args: { value: 'a' } },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: { value: 'b' } },
					{ toolCallId: 'tc-3', toolName: 'slow_tool', args: { value: 'c' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		expect(peakConcurrency).toBe(3);
	});

	it('suspensions stop later batches and save unexecuted tools as pending', async () => {
		const executedTools: string[] = [];

		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			executedTools.push('suspend_tool');
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const normalTool = makeMockTool('normal_tool', async () => {
			executedTools.push('normal_tool');
			return await Promise.resolve({ done: true });
		});

		const { runtime } = createRuntimeWithTools([suspendTool, normalTool], 2);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'x' } },
				{ toolCallId: 'tc-2', toolName: 'normal_tool', args: { value: 'y' } },
				{ toolCallId: 'tc-3', toolName: 'normal_tool', args: { value: 'z' } },
			]),
		);

		const result = await runtime.generate('run tools');

		// Batch 1 (tc-1 + tc-2) runs, but batch 2 (tc-3) is skipped because batch 1 had a suspension
		expect(executedTools).toContain('suspend_tool');
		expect(executedTools.filter((t) => t === 'normal_tool').length).toBe(1);
		expect(result.finishReason).toBe('tool-calls');

		// tc-1 is suspended, tc-3 is saved as unexecuted pending
		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend!.length).toBe(1);
		expect(result.pendingSuspend![0].toolCallId).toBe('tc-1');

		// Verify tc-3 is in the persisted state as a pending tool call (without suspendPayload)
		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-3']).toBeDefined();
		expect(state.pendingToolCalls['tc-3'].suspended).toBe(false);
	});

	it('pendingSuspend is an array of all suspended tools with preserved payloads', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend!.length).toBe(2);

		const ids = result.pendingSuspend!.map((s) => s.toolCallId);
		expect(ids).toContain('tc-1');
		expect(ids).toContain('tc-2');

		for (const s of result.pendingSuspend!) {
			expect(s.suspendPayload).toEqual({ reason: 'needs approval' });
			expect(s.runId).toBeTruthy();
			expect(s.toolName).toBe('suspend_tool');
		}
	});

	it('resume returns leftover suspends after resolving one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		expect(first.pendingSuspend!.length).toBe(2);

		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — concurrent resume doesn't call generateText when pending tools remain
		const resumed = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId: 'tc-1' },
		);

		// tc-2 should still be pending
		expect(resumed.pendingSuspend).toBeDefined();
		expect(resumed.pendingSuspend!.length).toBe(1);
		expect(resumed.pendingSuspend![0].toolCallId).toBe('tc-2');
		// runId must not change across suspend/resume cycles
		expect(resumed.pendingSuspend![0].runId).toBe(runId);
	});

	it('already-suspended tools are NOT re-executed on resume', async () => {
		let executionCount = 0;

		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			executionCount++;
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		expect(executionCount).toBe(2); // both executed initially

		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — only tc-1 should re-execute, not tc-2
		generateText.mockResolvedValueOnce(makeGenerateSuccess('After resume'));
		await runtime.resume('generate', { approved: true }, { runId, toolCallId: 'tc-1' });

		expect(executionCount).toBe(3); // only tc-1 re-executed (2 initial + 1 resume)
	});

	it('after all suspends resolved, LLM loop continues', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			if (ctx.resumeData) return { approved: true };
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', args: { value: 'b' } },
			]),
		);

		const first = await runtime.generate('run tools');
		const { runId } = first.pendingSuspend![0];

		// Resume tc-1 — tc-2 still pending, so no LLM call
		const second = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId: 'tc-1' },
		);
		expect(second.pendingSuspend!.length).toBe(1);

		// runId must stay the same across suspend/resume cycles
		const runId2 = second.pendingSuspend![0].runId;
		expect(runId2).toBe(runId);

		// Resume tc-2 — no more pending, LLM loop should continue
		generateText.mockResolvedValueOnce(makeGenerateSuccess('all done'));
		const third = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId: runId2, toolCallId: 'tc-2' },
		);

		expect(third.pendingSuspend).toBeUndefined();
		expect(third.finishReason).toBe('stop');
	});

	it('bounded concurrency (2) batches respects the limit', async () => {
		const batchSizes: number[] = [];
		let activeConcurrency = 0;

		const slowTool = makeMockTool('slow_tool', async () => {
			activeConcurrency++;
			batchSizes.push(activeConcurrency);
			await new Promise((r) => setTimeout(r, 30));
			activeConcurrency--;
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([slowTool], 2);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'slow_tool', args: { value: 'a' } },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: { value: 'b' } },
					{ toolCallId: 'tc-3', toolName: 'slow_tool', args: { value: 'c' } },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// Peak concurrency within any batch should never exceed 2
		expect(Math.max(...batchSizes)).toBeLessThanOrEqual(2);
	});

	it('tool error becomes LLM-visible message — loop continues and slow tool completes', async () => {
		const completedTools: string[] = [];

		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('tool failed'));
		});

		const slowTool = makeMockTool('slow_tool', async () => {
			await new Promise((r) => setTimeout(r, 50));
			completedTools.push('slow_tool');
			return { done: true };
		});

		const { runtime } = createRuntimeWithTools([errorTool, slowTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'error_tool', args: {} },
					{ toolCallId: 'tc-2', toolName: 'slow_tool', args: {} },
				]),
			)
			// The LLM is called again after seeing the error tool result
			.mockResolvedValueOnce(makeGenerateSuccess('Handled the error'));

		const result = await runtime.generate('run tools');

		// Loop continues after tool error — LLM sees the error and responds
		expect(result.finishReason).toBe('stop');
		// allSettled waits for all in-flight tools before returning
		expect(completedTools).toContain('slow_tool');
	});

	it('sequential mode (concurrency=1) wraps single suspension in an array', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(Array.isArray(result.pendingSuspend)).toBe(true);
		expect(result.pendingSuspend!.length).toBe(1);
		expect(result.pendingSuspend![0].toolCallId).toBe('tc-1');
	});

	it('tool error produces an error tool-result in the message list and loop continues', async () => {
		type ToolOutputContent = {
			type: string;
			output?: { type: string; value?: { error?: string } };
		};
		type ToolMessage = { role: string; content: ToolOutputContent[] };
		const receivedMessages: unknown[] = [];

		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('intentional failure'));
		});

		const { runtime } = createRuntimeWithTools([errorTool], 1);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'error_tool', args: { value: 'x' } },
				]),
			)
			.mockImplementationOnce(async ({ messages }: { messages: unknown[] }) => {
				receivedMessages.push(...messages);
				return await Promise.resolve(makeGenerateSuccess('I saw the error'));
			});

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// LLM was called a second time — it saw the error tool result and continued
		expect(generateText).toHaveBeenCalledTimes(2);
		// The second LLM call received a tool message whose output carries the error description
		const toolMsg = receivedMessages.find(
			(m): m is ToolMessage =>
				typeof m === 'object' && m !== null && (m as ToolMessage).role === 'tool',
		);
		expect(toolMsg).toBeDefined();
		const hasErrorOutput = toolMsg!.content.some((c) => !!c.output?.value?.error);
		expect(hasErrorOutput).toBe(true);
	});

	it('mixed success+error batch — successful results are preserved', async () => {
		const successTool = makeMockTool('success_tool', async () => {
			return await Promise.resolve({ value: 42 });
		});
		const errorTool = makeMockTool('error_tool', async () => {
			return await Promise.reject(new Error('tool failed'));
		});

		const { runtime } = createRuntimeWithTools([successTool, errorTool], Infinity);

		generateText
			.mockResolvedValueOnce(
				makeGenerateWithToolCalls([
					{ toolCallId: 'tc-1', toolName: 'success_tool', args: {} },
					{ toolCallId: 'tc-2', toolName: 'error_tool', args: {} },
				]),
			)
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const result = await runtime.generate('run tools');

		expect(result.finishReason).toBe('stop');
		// Successful tool call is recorded in toolCalls summary
		expect(result.toolCalls).toBeDefined();
		expect(result.toolCalls!.some((tc) => tc.tool === 'success_tool')).toBe(true);
	});

	it('toolName is stored in pendingToolCalls and accessible without findToolName', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		await runtime.generate('run tools');

		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-1']).toBeDefined();
		expect(state.pendingToolCalls['tc-1'].toolName).toBe('suspend_tool');
	});

	it('unexecuted pending tools also carry toolName', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});
		const normalTool = makeMockTool('normal_tool', async () => {
			return await Promise.resolve({ done: true });
		});

		// concurrency=1 so tc-1 runs first (suspends), tc-2 is left unexecuted
		const { runtime } = createRuntimeWithTools([suspendTool, normalTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'x' } },
				{ toolCallId: 'tc-2', toolName: 'normal_tool', args: { value: 'y' } },
			]),
		);

		await runtime.generate('run tools');

		const state = runtime.getState();
		expect(state.pendingToolCalls['tc-2']).toBeDefined();
		expect(state.pendingToolCalls['tc-2'].toolName).toBe('normal_tool');
		expect(state.pendingToolCalls['tc-2'].suspended).toBe(false);
	});

	it('tool-call-suspended chunks include resumeSchema when tool defines one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		streamText.mockReturnValue({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-1',
								toolName: 'suspend_tool',
								args: { value: 'a' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', input: { value: 'a' } },
			]),
		});

		const { stream: readableStream } = await runtime.stream('run tools');
		const chunks = await collectChunks(readableStream);

		const suspendedChunks = chunks.filter((c) => c.type === 'tool-call-suspended') as Array<
			StreamChunk & { type: 'tool-call-suspended'; resumeSchema?: unknown }
		>;
		expect(suspendedChunks.length).toBe(1);
		// resumeSchema should be a JSON Schema object (from zod-to-json-schema conversion)
		expect(suspendedChunks[0].resumeSchema).toBeDefined();
		expect(typeof suspendedChunks[0].resumeSchema).toBe('object');
	});

	it('pendingSuspend entries include resumeSchema when tool defines one', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], 1);

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCalls([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', args: { value: 'a' } },
			]),
		);

		const result = await runtime.generate('run tools');

		expect(result.pendingSuspend).toBeDefined();
		expect(result.pendingSuspend![0].resumeSchema).toBeDefined();
		expect(typeof result.pendingSuspend![0].resumeSchema).toBe('object');
	});

	it('stream mode emits multiple tool-call-suspended chunks for concurrent suspensions', async () => {
		const suspendTool = makeSuspendingTool('suspend_tool', async (_input, ctx) => {
			return await ctx.suspend({ reason: 'needs approval' });
		});

		const { runtime } = createRuntimeWithTools([suspendTool], Infinity);

		streamText.mockReturnValue({
			fullStream: makeChunkStream([{ type: 'text-delta', textDelta: 'thinking...' }]),
			finishReason: Promise.resolve('tool-calls'),
			usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
			response: Promise.resolve({
				messages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'tc-1',
								toolName: 'suspend_tool',
								args: { value: 'a' },
							},
							{
								type: 'tool-call',
								toolCallId: 'tc-2',
								toolName: 'suspend_tool',
								args: { value: 'b' },
							},
						],
					},
				],
			}),
			toolCalls: Promise.resolve([
				{ toolCallId: 'tc-1', toolName: 'suspend_tool', input: { value: 'a' } },
				{ toolCallId: 'tc-2', toolName: 'suspend_tool', input: { value: 'b' } },
			]),
		});

		const { stream: readableStream } = await runtime.stream('run tools');
		const chunks = await collectChunks(readableStream);

		const suspendedChunks = chunks.filter((c) => c.type === 'tool-call-suspended');
		expect(suspendedChunks.length).toBe(2);

		const finishChunks = chunks.filter((c) => c.type === 'finish');
		expect(finishChunks.length).toBe(1);
		expect((finishChunks[0] as StreamChunk & { type: 'finish' }).finishReason).toBe('tool-calls');
	});
});

// Structured output — generate()
// ---------------------------------------------------------------------------

describe('AgentRuntime.generate() — structured output', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns structuredOutput when schema is configured', async () => {
		const expected = { answer: 'Paris', score: 0.95 };
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput(expected));

		const { runtime } = createStructuredRuntime();
		const result = await runtime.generate('What is the capital of France?');

		expect(result.structuredOutput).toEqual(expected);
		expect(result.finishReason).toBe('stop');
	});

	it('does not include structuredOutput when no schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('Just text'));

		const { runtime } = createRuntime();
		const result = await runtime.generate('hello');

		expect(result.structuredOutput).toBeUndefined();
	});

	it('passes the output spec to generateText when schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccessWithOutput({ answer: 'test', score: 1 }));

		const { runtime } = createStructuredRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.output).toBeDefined();
		expect(callArgs.output).toEqual(
			expect.objectContaining({ _type: 'object', schema: testSchema }),
		);
	});

	it('does not pass the output spec to generateText when no schema is configured', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const { runtime } = createRuntime();
		await runtime.generate('hello');

		const callArgs = (generateText.mock.calls[0] as [unknown, unknown])[0] as Record<
			string,
			unknown
		>;
		expect(callArgs.output).toBeUndefined();
	});

	it('preserves structuredOutput through tool-call iterations', async () => {
		const tool: BuiltTool = {
			name: 'add',
			description: 'Add numbers',
			inputSchema: z.object({ a: z.number(), b: z.number() }),
			handler: async (input: unknown) => {
				const { a, b } = input as { a: number; b: number };
				return await Promise.resolve({ sum: a + b });
			},
		};

		const expected = { answer: '5', score: 1 };
		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'add', { a: 2, b: 3 }))
			.mockResolvedValueOnce(makeGenerateSuccessWithOutput(expected, 'The sum is 5'));

		const { runtime } = createStructuredRuntime({ tools: [tool] });
		const result = await runtime.generate('What is 2 + 3?');

		expect(result.structuredOutput).toEqual(expected);
		expect(result.finishReason).toBe('stop');
	});
});

// ---------------------------------------------------------------------------
// Structured output — stream()
// ---------------------------------------------------------------------------

describe('AgentRuntime.stream() — structured output', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('includes structuredOutput in the finish chunk when schema is configured', async () => {
		const expected = { answer: 'Paris', score: 0.95 };
		streamText.mockReturnValue(makeStreamSuccessWithOutput(expected));

		const { runtime } = createStructuredRuntime();
		const { stream } = await runtime.stream('What is the capital of France?');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});

	it('does not include structuredOutput in the finish chunk when no schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime } = createRuntime();
		const { stream } = await runtime.stream('hello');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toBeUndefined();
	});

	it('passes the output spec to streamText when schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccessWithOutput({ answer: 'test', score: 1 }));

		const { runtime } = createStructuredRuntime();
		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);

		const callArgs = (streamText.mock.calls[0] as [unknown, unknown])[0] as Record<string, unknown>;
		expect(callArgs.output).toBeDefined();
		expect(callArgs.output).toEqual(
			expect.objectContaining({ _type: 'object', schema: testSchema }),
		);
	});

	it('does not pass the output spec to streamText when no schema is configured', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime } = createRuntime();
		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);
		const callArgs = (streamText.mock.calls[0] as [unknown, unknown])[0] as Record<string, unknown>;
		expect(callArgs.output).toBeUndefined();
	});

	it('preserves structuredOutput through tool-call iterations', async () => {
		const tool: BuiltTool = {
			name: 'add',
			description: 'Add numbers',
			inputSchema: z.object({ a: z.number(), b: z.number() }),
			handler: async (input: unknown) => {
				const { a, b } = input as { a: number; b: number };
				return await Promise.resolve({ sum: a + b });
			},
		};

		const expected = { answer: '5', score: 1 };
		streamText
			.mockReturnValueOnce({
				fullStream: makeChunkStream([
					{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'add', args: { a: 2, b: 3 } },
				]),
				finishReason: Promise.resolve('tool-calls'),
				usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
				response: Promise.resolve({
					messages: [
						{
							role: 'assistant',
							content: [
								{
									type: 'tool-call',
									toolCallId: 'tc-1',
									toolName: 'add',
									args: { a: 2, b: 3 },
								},
							],
						},
					],
				}),
				toolCalls: Promise.resolve([
					{ toolCallId: 'tc-1', toolName: 'add', input: { a: 2, b: 3 } },
				]),
			})
			.mockReturnValueOnce(makeStreamSuccessWithOutput(expected, 'The sum is 5'));

		const { runtime } = createStructuredRuntime({ tools: [tool] });
		const { stream } = await runtime.stream('What is 2 + 3?');
		const chunks = await collectChunks(stream);

		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});
});

// ---------------------------------------------------------------------------
// Structured output — resume()
// ---------------------------------------------------------------------------

describe('AgentRuntime.resume() — structured output', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns structuredOutput after resume in generate mode', async () => {
		const interruptibleTool = makeInterruptibleTool();
		const { runtime } = createStructuredRuntime({ tools: [interruptibleTool] });

		// First call: LLM triggers the interruptible tool
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'proceed?' }),
		);

		const firstResult = await runtime.generate('Should I proceed?');
		expect(firstResult.finishReason).toBe('tool-calls');
		expect(firstResult.pendingSuspend).toBeDefined();

		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Second call (after resume): LLM returns final answer with structured output
		const expected = { answer: 'Approved', score: 1 };
		generateText.mockResolvedValueOnce(makeGenerateSuccessWithOutput(expected, 'Approved'));

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId },
		);

		expect(resumeResult.structuredOutput).toEqual(expected);
		expect(resumeResult.finishReason).toBe('stop');
	});

	it('returns structuredOutput after resume in stream mode', async () => {
		const interruptibleTool = makeInterruptibleTool();
		const { runtime } = createStructuredRuntime({ tools: [interruptibleTool] });

		// First call: LLM triggers the interruptible tool (via generate to get the runId)
		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'proceed?' }),
		);

		const firstResult = await runtime.generate('Should I proceed?');
		expect(firstResult.pendingSuspend).toBeDefined();

		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Second call (after resume): LLM streams final answer with structured output
		const expected = { answer: 'Approved', score: 1 };
		streamText.mockReturnValueOnce(makeStreamSuccessWithOutput(expected, 'Approved'));

		const resumed = await runtime.resume('stream', { approved: true }, { runId, toolCallId });

		const chunks = await collectChunks(resumed.stream as ReadableStream<unknown>);
		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});
});

// ---------------------------------------------------------------------------
// Eager input streaming
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/require-await */
describe('providerOptions — tool adapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('forwards providerOptions to the AI SDK tool when set', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ai = require('ai') as { tool: jest.Mock };
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const adapter = require('../runtime/tool-adapter') as {
			toAiSdkTools: (tools: BuiltTool[]) => Record<string, unknown>;
		};

		const builtTool: BuiltTool = {
			name: 'set_code',
			description: 'Set code in editor',
			inputSchema: z.object({ code: z.string() }),
			providerOptions: { anthropic: { eagerInputStreaming: true } },
			handler: async () => ({ ok: true }),
		};

		const result = adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.objectContaining({
				providerOptions: {
					anthropic: { eagerInputStreaming: true },
				},
			}),
		);
		expect(result).toHaveProperty('set_code');
	});

	it('forwards arbitrary provider options (not just Anthropic)', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ai = require('ai') as { tool: jest.Mock };
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const adapter = require('../runtime/tool-adapter') as {
			toAiSdkTools: (tools: BuiltTool[]) => Record<string, unknown>;
		};

		const builtTool: BuiltTool = {
			name: 'draw',
			description: 'Draw an image',
			inputSchema: z.object({ prompt: z.string() }),
			providerOptions: { openai: { strict: true } },
			handler: async () => ({ ok: true }),
		};

		adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.objectContaining({
				providerOptions: { openai: { strict: true } },
			}),
		);
	});

	it('does not pass providerOptions when not set', () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const ai = require('ai') as { tool: jest.Mock };
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const adapter = require('../runtime/tool-adapter') as {
			toAiSdkTools: (tools: BuiltTool[]) => Record<string, unknown>;
		};

		const builtTool: BuiltTool = {
			name: 'search',
			description: 'Search',
			inputSchema: z.object({ query: z.string() }),
			handler: async () => ({ results: [] }),
		};

		adapter.toAiSdkTools([builtTool]);

		expect(ai.tool).toHaveBeenCalledWith(
			expect.not.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				providerOptions: expect.anything(),
			}),
		);
	});
});

describe('Tool builder — providerOptions', () => {
	it('sets providerOptions via .providerOptions()', () => {
		const built = new Tool('set_code')
			.description('Set code')
			.input(z.object({ code: z.string() }))
			.providerOptions({ anthropic: { eagerInputStreaming: true } })
			.handler(async () => ({ ok: true }))
			.build();

		expect(built.providerOptions).toEqual({ anthropic: { eagerInputStreaming: true } });
	});

	it('merges multiple .providerOptions() calls', () => {
		const built = new Tool('multi')
			.description('Multi-provider tool')
			.input(z.object({ text: z.string() }))
			.providerOptions({ anthropic: { eagerInputStreaming: true } })
			.providerOptions({ openai: { strict: true } })
			.handler(async () => ({ ok: true }))
			.build();

		expect(built.providerOptions).toEqual({
			anthropic: { eagerInputStreaming: true },
			openai: { strict: true },
		});
	});

	it('defaults to undefined when .providerOptions() is not called', () => {
		const built = new Tool('search')
			.description('Search')
			.input(z.object({ query: z.string() }))
			.handler(async () => ({ results: [] }))
			.build();

		expect(built.providerOptions).toBeUndefined();
	});
});
/* eslint-enable @typescript-eslint/require-await */

// ---------------------------------------------------------------------------
// Runtime validation — input schema
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime input schema validation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('surfaces a ZodError as a tool error outcome when LLM provides invalid input', async () => {
		// Tool expects { id: z.string() } but LLM will provide { id: 123 } (wrong type)
		const strictTool: BuiltTool = {
			name: 'strict',
			description: 'strict',
			inputSchema: z.object({ id: z.string() }),
			handler: async () => {
				return await Promise.resolve({ ok: true });
			},
		};

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'strict', { id: 123 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtimeWithTool = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [strictTool],
		});

		const result = await runtimeWithTool.generate('go');
		// The ZodError is caught by Promise.allSettled; the loop continues and
		// the LLM responds with 'done' on the next turn.
		expect(result.finishReason).toBe('stop');

		const toolErrorMessage = result.messages.find(
			(m) => isLlmMessage(m) && m.role === 'tool' && m.content[0].type === 'tool-result',
		) as Message;
		expect(toolErrorMessage).toBeDefined();
		const content = toolErrorMessage.content[0] as ContentToolResult;
		expect(content.result).toEqual(
			expect.objectContaining({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				error: expect.stringContaining('Expected string, received number'),
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// Runtime validation — JSON Schema input validation
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime JSON Schema input validation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('passes valid input through without error', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { id: 'abc' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		expect(result.finishReason).toBe('stop');

		// No tool-result error — the tool ran successfully
		const toolResultMsg = result.messages.find(
			(m) => isLlmMessage(m) && m.role === 'tool',
		) as Message;
		expect(toolResultMsg).toBeDefined();
		const content = toolResultMsg.content[0] as ContentToolResult;
		expect(content.isError).toBeFalsy();
	});

	it('surfaces a validation error as a tool error outcome when LLM provides the wrong type', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { id: { type: 'string' } },
				required: ['id'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			// LLM sends { id: 123 } — a number where a string is required
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { id: 123 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		expect(result.finishReason).toBe('stop');

		const toolResultMsg = result.messages.find(
			(m) => isLlmMessage(m) && m.role === 'tool',
		) as Message;
		expect(toolResultMsg).toBeDefined();
		console.log('ToolResultMsg', toolResultMsg);
		const content = toolResultMsg.content[0] as ContentToolResult;
		expect(content.isError).toBe(true);
		expect(JSON.stringify(content.result)).toContain('Invalid tool input');
	});

	it('surfaces a validation error when a required property is missing', async () => {
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					age: { type: 'integer' },
				},
				required: ['name', 'age'],
			},
			handler: async () => await Promise.resolve({ ok: true }),
		};

		generateText
			// LLM omits the required 'age' field
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { name: 'Alice' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		const result = await runtime.generate('go');
		console.log('Result', result.error);
		expect(result.finishReason).toBe('stop');

		const toolResultMsg = result.messages.find(
			(m) => isLlmMessage(m) && m.role === 'tool',
		) as Message;
		const content = toolResultMsg.content[0] as ContentToolResult;
		expect(content.isError).toBe(true);
		expect(JSON.stringify(content.result)).toContain('Invalid tool input');
	});

	it('does not invoke the handler when JSON Schema validation fails', async () => {
		const handlerFn = jest.fn().mockResolvedValue({ ok: true });
		const tool: BuiltTool = {
			name: 'json_tool',
			description: 'json tool',
			inputSchema: {
				type: 'object',
				properties: { count: { type: 'integer', minimum: 1 } },
				required: ['count'],
			},
			handler: handlerFn,
		};

		generateText
			// LLM sends count: 0, which fails the minimum: 1 constraint
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'json_tool', { count: 0 }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
		});

		await runtime.generate('go');
		expect(handlerFn).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Runtime validation — resume data schema
// ---------------------------------------------------------------------------

describe('AgentRuntime — runtime resume data schema validation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('surfaces a ZodError as a top-level error when consumer provides invalid resume data', async () => {
		const tool = makeInterruptibleTool(); // has resumeSchema: z.object({ approved: z.boolean() })

		generateText.mockResolvedValueOnce(
			makeGenerateWithToolCall('tc-1', 'approve', { question: 'ok?' }),
		);

		const runtimeWithTool = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [tool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtimeWithTool.generate('go');
		expect(firstResult.pendingSuspend).toBeDefined();
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		// Resume with invalid data — missing required 'approved' field
		const resumeResultPromise = runtimeWithTool.resume(
			'generate',
			{ notApproved: 'wrong' },
			{ runId, toolCallId },
		);
		await expect(resumeResultPromise).rejects.toThrow(/"message": "Required"/);
	});
});

// ---------------------------------------------------------------------------
// AgentRuntime — tool approval (HITL wrapper)
// ---------------------------------------------------------------------------

describe('AgentRuntime — tool approval (HITL wrapper)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('suspends when a tool has .requireApproval() set', async () => {
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		generateText.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const result = await runtime.generate('Delete record rec-1');
		expect(result.finishReason).toBe('tool-calls');
		expect(result.pendingSuspend).toHaveLength(1);
		expect(result.pendingSuspend![0].toolName).toBe('delete');
		expect(result.pendingSuspend![0].suspendPayload).toMatchObject({
			type: 'approval',
			toolName: 'delete',
			args: { id: 'rec-1' },
		});
	});

	it('executes the original handler after approval', async () => {
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }))
			.mockResolvedValueOnce(makeGenerateSuccess('Done'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtime.generate('Delete record rec-1');
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId },
		);
		expect(resumeResult.finishReason).toBe('stop');
		expect(resumeResult.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ tool: 'delete', output: { deleted: 'rec-1' } }),
			]),
		);
	});

	it('returns declined message to LLM when approval is rejected', async () => {
		const approvalTool = new ToolBuilder('delete')
			.description('Delete a record')
			.input(z.object({ id: z.string() }))
			.requireApproval()
			.handler(async ({ id }: { id: string }) => {
				return await Promise.resolve({ deleted: id });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc-1', 'delete', { id: 'rec-1' }))
			.mockResolvedValueOnce(makeGenerateSuccess('Declined'));

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			tools: [approvalTool],
			checkpointStorage: 'memory',
		});

		const firstResult = await runtime.generate('Delete record rec-1');
		expect(firstResult.finishReason).toBe('tool-calls');
		const { runId, toolCallId } = firstResult.pendingSuspend![0];

		const resumeResult = await runtime.resume(
			'generate',
			{ approved: false },
			{ runId, toolCallId },
		);
		expect(resumeResult.finishReason).toBe('stop');
	});
});

// ---------------------------------------------------------------------------
// External abort signal
// ---------------------------------------------------------------------------

describe('external abort signal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should cancel run when external signal fires', async () => {
		const external = new AbortController();

		generateText.mockImplementation(
			async (opts: { abortSignal?: AbortSignal }) =>
				await new Promise((_, reject) => {
					const signal = opts.abortSignal;
					if (signal?.aborted) {
						reject(new Error('aborted'));
						return;
					}
					signal?.addEventListener('abort', () => {
						reject(new Error('aborted'));
					});
				}),
		);

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
		});

		const resultPromise = runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			abortSignal: external.signal,
		});

		external.abort();
		const result = await resultPromise;
		expect(result.finishReason).toBe('error');
	});
});

// ---------------------------------------------------------------------------
// Provider options merging
// ---------------------------------------------------------------------------

describe('provider options merging', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should deep-merge thinking config with call-level providerOptions', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'You are a test assistant.',
			thinking: { budgetTokens: 10000 },
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		expect((callArgs.providerOptions as Record<string, Record<string, unknown>>).anthropic).toEqual(
			{
				thinking: { type: 'enabled', budgetTokens: 10000 },
				cacheControl: { type: 'ephemeral' },
			},
		);
	});
});

// ---------------------------------------------------------------------------
// Instruction providerOptions
// ---------------------------------------------------------------------------

describe('instruction providerOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should attach providerOptions to system message', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'test',
			model: 'openai/gpt-4o-mini',
			instructions: 'You are a test assistant.',
			instructionProviderOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'user1', threadId: 'thread1' },
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const messages = callArgs.messages as Array<Record<string, unknown>>;
		const systemMsg = messages[0];
		expect(systemMsg.role).toBe('system');
		expect(systemMsg.providerOptions).toEqual({
			anthropic: { cacheControl: { type: 'ephemeral' } },
		});
	});
});

// ---------------------------------------------------------------------------
// Runtime telemetry — generate / stream / tool execution
// ---------------------------------------------------------------------------

describe('AgentRuntime — telemetry propagation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const baseTelemetry: BuiltTelemetry = {
		enabled: true,
		functionId: 'test-agent',
		metadata: { env: 'test' },
		recordInputs: true,
		recordOutputs: false,
		integrations: [],
		tracer: { startSpan: jest.fn() },
	};

	it('passes telemetry config into generateText as experimental_telemetry', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: baseTelemetry,
		});

		await runtime.generate('hello');

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		expect(expTelemetry.functionId).toBe('test-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
		expect(expTelemetry.recordInputs).toBe(true);
		expect(expTelemetry.recordOutputs).toBe(false);
	});

	it('passes telemetry config into streamText as experimental_telemetry', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const runtime = new AgentRuntime({
			name: 'telemetry-stream-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: baseTelemetry,
		});

		const { stream } = await runtime.stream('hello');
		await collectChunks(stream);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = streamText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		expect(expTelemetry.functionId).toBe('test-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
	});

	it('inherits telemetry from ExecutionOptions when no own telemetry is set', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'child-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			// No telemetry set on the runtime itself
		});

		await runtime.generate('hello', {
			persistence: { resourceId: 'r1', threadId: 't1' },
			telemetry: baseTelemetry,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		const expTelemetry = callArgs.experimental_telemetry as Record<string, unknown>;
		expect(expTelemetry).toBeDefined();
		expect(expTelemetry.isEnabled).toBe(true);
		// Inherited telemetry uses the child agent's name as functionId
		expect(expTelemetry.functionId).toBe('child-agent');
		expect(expTelemetry.tracer).toBe(baseTelemetry.tracer);
	});

	it('passes resolved telemetry to tool handlers via parentTelemetry', async () => {
		let capturedTelemetry: BuiltTelemetry | undefined;

		const spyTool: BuiltTool = new ToolBuilder('spy')
			.description('captures telemetry from context')
			.input(z.object({ x: z.string() }))
			.output(z.object({ ok: z.boolean() }))
			.handler(async (_input, ctx) => {
				capturedTelemetry = ctx.parentTelemetry;
				return await Promise.resolve({ ok: true });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc1', 'spy', { x: 'test' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'tool-telemetry-test',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [spyTool],
			telemetry: baseTelemetry,
		});

		await runtime.generate('test');

		expect(capturedTelemetry).toBe(baseTelemetry);
	});

	it('passes inherited telemetry to tool handlers for sub-agent scenarios', async () => {
		let capturedTelemetry: BuiltTelemetry | undefined;

		const spyTool: BuiltTool = new ToolBuilder('spy')
			.description('captures telemetry from context')
			.input(z.object({ x: z.string() }))
			.output(z.object({ ok: z.boolean() }))
			.handler(async (_input, ctx) => {
				capturedTelemetry = ctx.parentTelemetry;
				return await Promise.resolve({ ok: true });
			})
			.build();

		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('tc1', 'spy', { x: 'test' }))
			.mockResolvedValueOnce(makeGenerateSuccess('done'));

		const runtime = new AgentRuntime({
			name: 'sub-agent',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			tools: [spyTool],
			// No own telemetry
		});

		await runtime.generate('test', {
			persistence: { resourceId: 'r1', threadId: 't1' },
			telemetry: baseTelemetry,
		});

		// Should receive inherited telemetry with the child agent's functionId
		expect(capturedTelemetry).toBeDefined();
		expect(capturedTelemetry!.functionId).toBe('sub-agent');
		expect(capturedTelemetry!.tracer).toBe(baseTelemetry.tracer);
	});

	it('does not include experimental_telemetry when telemetry is disabled', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess());

		const runtime = new AgentRuntime({
			name: 'disabled-telemetry',
			model: 'openai/gpt-4o-mini',
			instructions: 'test',
			eventBus: new AgentEventBus(),
			telemetry: { ...baseTelemetry, enabled: false },
		});

		await runtime.generate('hello');

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const callArgs = generateText.mock.calls[0][0] as Record<string, unknown>;
		expect(callArgs.experimental_telemetry).toBeUndefined();
	});
});
