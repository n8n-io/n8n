import { AgentRuntime } from '../runtime/agent-runtime';
import { AgentEventBus } from '../runtime/event-bus';
import { AgentEvent } from '../types/event';
import type { StreamChunk } from '../types/stream';

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
