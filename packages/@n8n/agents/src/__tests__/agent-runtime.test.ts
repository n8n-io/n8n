import { z } from 'zod';

import { AgentRuntime } from '../runtime/agent-runtime';
import { AgentEventBus } from '../runtime/event-bus';
import { AgentEvent } from '../types/event';
import type { StreamChunk } from '../types/stream';
import type { BuiltTool, InterruptibleToolContext } from '../types/tool';

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

// Mock generateText and streamText from the 'ai' package
jest.mock('ai', () => ({
	generateText: jest.fn(),
	streamText: jest.fn(),
	tool: jest.fn((config: unknown) => config),
	Output: {
		object: jest.fn(({ schema }: { schema: unknown }) => ({ _type: 'object', schema })),
	},
}));

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
		const readableStream = await runtime.stream('hello');
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
		const readableStream = await runtime.stream('hello');
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
		const readableStream = await runtime.stream('hello');
		await collectChunks(readableStream);

		expect(runtime.getState().status).toBe('failed');
	});

	it('yields error chunk and finishes cleanly on abort', async () => {
		streamText.mockReturnValue(makeStreamSuccess());

		const { runtime, bus } = createRuntime();
		bus.on(AgentEvent.TurnStart, () => bus.abort());

		const readableStream = await runtime.stream('hello');
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

		const firstStream = await runtime.stream('hello');
		const firstChunks = await collectChunks(firstStream);
		expect(firstChunks.some((c) => c.type === 'error')).toBe(true);

		const secondStream = await runtime.stream('hello');
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
		const readableStream = await runtime.stream('hello');

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

	it('resolves with an error stream when the runId is not found (stream mode)', async () => {
		const { runtime } = createRuntime();
		const stream = await runtime.resume(
			'stream',
			{ approved: true },
			{ runId: 'nonexistent-run-id', toolCallId: 'tc-1' },
		);

		const chunks = await collectChunks(stream as ReadableStream<unknown>);
		expect(chunks.some((c) => c.type === 'error')).toBe(true);
	});

	it('resolves with an error result when the runId is not found (generate mode)', async () => {
		const { runtime } = createRuntime();
		const result = await runtime.resume(
			'generate',
			{ approved: true },
			{ runId: 'nonexistent-run-id', toolCallId: 'tc-1' },
		);

		expect(result.finishReason).toBe('error');
		expect(result.error).toBeDefined();
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
		const stream = await runtime.stream('What is the capital of France?');
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
		const stream = await runtime.stream('hello');
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
		const stream = await runtime.stream('hello');
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
		const stream = await runtime.stream('hello');
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
		const stream = await runtime.stream('What is 2 + 3?');
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

		const { runId, toolCallId } = firstResult.pendingSuspend!;

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

		const { runId, toolCallId } = firstResult.pendingSuspend!;

		// Second call (after resume): LLM streams final answer with structured output
		const expected = { answer: 'Approved', score: 1 };
		streamText.mockReturnValueOnce(makeStreamSuccessWithOutput(expected, 'Approved'));

		const stream = await runtime.resume('stream', { approved: true }, { runId, toolCallId });

		const chunks = await collectChunks(stream as ReadableStream<unknown>);
		const finish = chunks.find((c) => c.type === 'finish') as StreamChunk & {
			type: 'finish';
		};
		expect(finish).toBeDefined();
		expect(finish.structuredOutput).toEqual(expected);
	});
});
