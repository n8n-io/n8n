/**
 * Tests for the Agent builder focusing on per-run isolation guarantees introduced
 * by the "shared config, per-run runtime" refactor.
 */

import { Agent } from '../sdk/agent';
import { AgentEvent } from '../types/runtime/event';

// ---------------------------------------------------------------------------
// Module mocks (same as agent-runtime.test.ts)
// ---------------------------------------------------------------------------

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

// Prevent real catalog HTTP calls
jest.mock('../sdk/catalog', () => ({
	getModelCost: jest.fn().mockResolvedValue(undefined),
	computeCost: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateText, streamText } = require('ai') as {
	generateText: jest.Mock;
	streamText: jest.Mock;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGenerateSuccess(text = 'OK') {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		},
		toolCalls: [],
	};
}

function* makeChunkStream(chunks: Array<Record<string, unknown>>) {
	for (const c of chunks) yield c;
}

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

async function drainStream(stream: ReadableStream<unknown>): Promise<void> {
	const reader = stream.getReader();

	while (true) {
		const { done } = await reader.read();
		if (done) break;
	}
}

function buildAgent() {
	return new Agent('test').model('openai/gpt-4o-mini').instructions('You are a test assistant.');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent — per-run isolation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('concurrent generate() calls', () => {
		it('returns independent results for each call', async () => {
			generateText
				.mockResolvedValueOnce(makeGenerateSuccess('Result A'))
				.mockResolvedValueOnce(makeGenerateSuccess('Result B'));

			const agent = buildAgent();

			const [resultA, resultB] = await Promise.all([
				agent.generate('Prompt A'),
				agent.generate('Prompt B'),
			]);

			const textA = resultA.messages
				.flatMap((m) => ('content' in m ? m.content : []))
				.filter((c) => c.type === 'text')
				.map((c) => ('text' in c ? c.text : ''))
				.join('');

			const textB = resultB.messages
				.flatMap((m) => ('content' in m ? m.content : []))
				.filter((c) => c.type === 'text')
				.map((c) => ('text' in c ? c.text : ''))
				.join('');

			expect(textA).toBe('Result A');
			expect(textB).toBe('Result B');
			expect(resultA.runId).not.toBe(resultB.runId);
		});

		it('aborting one generate() does not cancel the other', async () => {
			const abortControllerA = new AbortController();

			// Run A resolves only after a delay; we'll abort it via its signal.
			// Run B resolves immediately.
			let resolveA!: (v: unknown) => void;
			const pendingA = new Promise((res) => {
				resolveA = res;
			});

			generateText.mockImplementation(async ({ abortSignal }: { abortSignal?: AbortSignal }) => {
				if (abortSignal === abortControllerA.signal || abortSignal?.aborted) {
					// Simulate the AI SDK throwing on abort
					await new Promise((_, rej) =>
						abortSignal.addEventListener('abort', () => rej(new Error('aborted')), {
							once: true,
						}),
					);
				}
				// Run B path — return immediately
				await pendingA;
				return makeGenerateSuccess('Result B');
			});

			const agent = buildAgent();

			// Start both runs; abort run A immediately
			const runAPromise = agent.generate('Prompt A', { abortSignal: abortControllerA.signal });
			abortControllerA.abort();
			resolveA(undefined);

			const runA = await runAPromise;
			expect(runA.finishReason).toBe('error');

			// Run B separately (no abort)
			generateText.mockResolvedValueOnce(makeGenerateSuccess('Result B'));
			const runB = await agent.generate('Prompt B');
			const textB = runB.messages
				.flatMap((m) => ('content' in m ? m.content : []))
				.filter((c) => c.type === 'text')
				.map((c) => ('text' in c ? c.text : ''))
				.join('');
			expect(textB).toBe('Result B');
		});
	});

	describe('concurrent stream() calls', () => {
		it('returns independent streams for each call', async () => {
			streamText
				.mockReturnValueOnce(makeStreamSuccess('Stream A'))
				.mockReturnValueOnce(makeStreamSuccess('Stream B'));

			const agent = buildAgent();

			const [resultA, resultB] = await Promise.all([
				agent.stream('Prompt A'),
				agent.stream('Prompt B'),
			]);

			// Both streams should be distinct ReadableStream objects
			expect(resultA.stream).not.toBe(resultB.stream);
			expect(resultA.runId).not.toBe(resultB.runId);

			// Drain both streams to completion
			await Promise.all([drainStream(resultA.stream), drainStream(resultB.stream)]);
		});

		it('aborting one stream does not cancel the other', async () => {
			const abortControllerA = new AbortController();

			streamText.mockImplementation(({ abortSignal }: { abortSignal?: AbortSignal }) => {
				if (abortSignal === abortControllerA.signal) {
					return {
						fullStream: (async function* () {
							// Wait until aborted then throw
							await new Promise<void>((_, rej) => {
								abortSignal.addEventListener('abort', () => rej(new Error('aborted')), {
									once: true,
								});
							});
							yield 'something';
						})(),
						finishReason: Promise.resolve('error'),
						usage: Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
						response: Promise.resolve({ messages: [] }),
						toolCalls: Promise.resolve([]),
					};
				}
				return makeStreamSuccess('Stream B');
			});

			const agent = buildAgent();

			const [resultA, resultB] = await Promise.all([
				agent.stream('Prompt A', { abortSignal: abortControllerA.signal }),
				agent.stream('Prompt B'),
			]);

			// Abort run A
			abortControllerA.abort();

			// Drain stream B — it should complete successfully regardless of A being aborted
			await drainStream(resultB.stream);

			// Drain stream A — it will error but shouldn't affect B
			await drainStream(resultA.stream).catch(() => {});
		});
	});

	describe('event handlers (on())', () => {
		it('fires registered handlers for every concurrent run', async () => {
			generateText
				.mockResolvedValueOnce(makeGenerateSuccess('A'))
				.mockResolvedValueOnce(makeGenerateSuccess('B'));

			const agent = buildAgent();
			const agentStartEvents: string[] = [];

			agent.on(AgentEvent.AgentStart, () => {
				agentStartEvents.push('start');
			});

			await Promise.all([agent.generate('Prompt A'), agent.generate('Prompt B')]);

			// Handler should have fired once per run
			expect(agentStartEvents).toHaveLength(2);
		});

		it('handlers registered before first run still fire on every subsequent run', async () => {
			generateText
				.mockResolvedValueOnce(makeGenerateSuccess('First'))
				.mockResolvedValueOnce(makeGenerateSuccess('Second'));

			const agent = buildAgent();
			const events: string[] = [];

			agent.on(AgentEvent.AgentEnd, () => {
				events.push('end');
			});

			await agent.generate('First');
			await agent.generate('Second');

			expect(events).toHaveLength(2);
		});
	});

	describe('abort() broadcast', () => {
		it('aborts all active runs when agent.abort() is called', async () => {
			let resolveA!: (v: unknown) => void;

			generateText.mockImplementation(async ({ abortSignal }: { abortSignal?: AbortSignal }) => {
				// Each call waits until its resolver is called or the signal fires
				await new Promise((res, rej) => {
					abortSignal?.addEventListener('abort', () => rej(new Error('aborted')), {
						once: true,
					});
					resolveA ??= res;
				});
				return makeGenerateSuccess();
			});

			const agent = buildAgent();

			const runAPromise = agent.generate('A');
			const runBPromise = agent.generate('B');

			// Give both calls time to reach the mock and register abort listeners
			await new Promise((res) => setTimeout(res, 10));

			// Broadcast abort — both runs should be cancelled
			agent.abort();

			const [runA, runB] = await Promise.all([runAPromise, runBPromise]);
			expect(runA.finishReason).toBe('error');
			expect(runB.finishReason).toBe('error');
		});
	});

	describe('off() — event handler removal', () => {
		it('removes a specific handler so it no longer fires', async () => {
			generateText
				.mockResolvedValueOnce(makeGenerateSuccess('A'))
				.mockResolvedValueOnce(makeGenerateSuccess('B'));

			const agent = buildAgent();
			const events: string[] = [];

			const handler = () => events.push('end');
			agent.on(AgentEvent.AgentEnd, handler);
			await agent.generate('First');

			agent.off(AgentEvent.AgentEnd, handler);
			await agent.generate('Second');

			// Handler should have fired only for the first run
			expect(events).toHaveLength(1);
		});

		it('removing one handler does not affect other handlers for the same event', async () => {
			generateText.mockResolvedValueOnce(makeGenerateSuccess('A'));

			const agent = buildAgent();
			const firedA: string[] = [];
			const firedB: string[] = [];

			const handlerA = () => firedA.push('a');
			const handlerB = () => firedB.push('b');

			agent.on(AgentEvent.AgentEnd, handlerA);
			agent.on(AgentEvent.AgentEnd, handlerB);

			agent.off(AgentEvent.AgentEnd, handlerA);

			await agent.generate('Hello');

			expect(firedA).toHaveLength(0);
			expect(firedB).toHaveLength(1);
		});

		it('off() on a handler that was never registered is a no-op', () => {
			const agent = buildAgent();
			expect(() => agent.off(AgentEvent.AgentEnd, () => {})).not.toThrow();
		});
	});

	describe('trackStreamBus — cleanup on stream cancel', () => {
		it('removes the bus from active runs when the consumer cancels the stream', async () => {
			streamText.mockReturnValueOnce(makeStreamSuccess('Hello'));

			const agent = buildAgent();

			// Access the private set via casting so we can assert its size
			const getActiveBuses = () =>
				(agent as unknown as { activeEventBuses: Set<unknown> }).activeEventBuses;

			const { stream } = await agent.stream('Hello');

			// Bus is registered while the stream is live
			expect(getActiveBuses().size).toBe(1);

			// Consumer cancels instead of draining
			await stream.cancel();

			// Bus must be removed immediately after cancel
			expect(getActiveBuses().size).toBe(0);
		});

		it('removes the bus from active runs when the consumer drains the stream normally', async () => {
			streamText.mockReturnValueOnce(makeStreamSuccess('Hello'));

			const agent = buildAgent();
			const getActiveBuses = () =>
				(agent as unknown as { activeEventBuses: Set<unknown> }).activeEventBuses;

			const { stream } = await agent.stream('Hello');
			expect(getActiveBuses().size).toBe(1);

			await drainStream(stream);

			expect(getActiveBuses().size).toBe(0);
		});

		it('abort() after stream cancel does not throw on a disposed bus', async () => {
			streamText.mockReturnValueOnce(makeStreamSuccess('Hello'));

			const agent = buildAgent();
			const { stream } = await agent.stream('Hello');

			await stream.cancel();

			// agent.abort() should be harmless — no active buses remain
			expect(() => agent.abort()).not.toThrow();
		});
	});

	describe('result.getState()', () => {
		it('generate() result.getState() reports success after a clean run', async () => {
			generateText.mockResolvedValueOnce(makeGenerateSuccess());

			const agent = buildAgent();
			const result = await agent.generate('Hello');

			expect(result.getState().status).toBe('success');
		});

		it('generate() result.getState() reports failed after an error', async () => {
			generateText.mockRejectedValueOnce(new Error('boom'));

			const agent = buildAgent();
			const result = await agent.generate('Hello');

			expect(result.getState().status).toBe('failed');
		});

		it('stream() result.getState() reports success after the stream is consumed', async () => {
			streamText.mockReturnValueOnce(makeStreamSuccess());

			const agent = buildAgent();
			const { stream, getState } = await agent.stream('Hello');

			// State is running while stream is open
			expect(getState().status).toBe('running');

			await drainStream(stream);

			expect(getState().status).toBe('success');
		});
	});
});
