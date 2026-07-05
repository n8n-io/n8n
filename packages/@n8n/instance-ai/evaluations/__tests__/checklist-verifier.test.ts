import type { Mock } from 'vitest';
import { vi } from 'vitest';

vi.mock('../../src/utils/eval-agents', () => ({
	createEvalAgent: vi.fn(),
	resolveEvalModelConfig: vi.fn(() => ({
		modelId: 'anthropic/test-model',
		provider: 'anthropic',
		providerModelId: 'test-model',
		apiKey: 'test-key',
	})),
	EPHEMERAL_CACHE: {},
}));

import { createEvalAgent, resolveEvalModelConfig } from '../../src/utils/eval-agents';
import {
	VERIFY_ATTEMPT_TIMEOUTS_MS,
	VERIFY_INACTIVITY_TIMEOUT_MS,
	verifyChecklist,
} from '../checklist/verifier';
import type { VerificationArtifact } from '../harness/runner';
import type { ChecklistItem } from '../types';

const mockCreateEvalAgent = vi.mocked(createEvalAgent);
const mockResolveEvalModelConfig = vi.mocked(resolveEvalModelConfig);

const CHECKLIST: ChecklistItem[] = [
	{ id: 1, description: 'two posts forwarded', category: 'execution', strategy: 'llm' },
];

const ARTIFACT: VerificationArtifact = {
	workflowContext: '## Workflow structure',
	scenarioContext: '## Scenario',
};

const GOOD_OUTPUT = {
	results: [
		{ id: 1, pass: true, reasoning: 'looks right', failureCategory: null, rootCause: null },
	],
};

type StreamFn = Mock<(messages: unknown, opts: { abortSignal: AbortSignal }) => Promise<unknown>>;

/** Wire createEvalAgent().structuredOutput().stream() to the given stream mock. */
function mockVerifierAgent(stream: StreamFn): void {
	const agent = { stream };
	const structuredOutput = vi.fn().mockReturnValue(agent);
	mockCreateEvalAgent.mockReturnValue({ structuredOutput } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

/** A stream that emits the given chunks immediately, then closes. */
function chunkStream(chunks: unknown[]): ReadableStream<unknown> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

/** A stream that never emits anything (stuck transport). */
function stuckStream(): ReadableStream<unknown> {
	return new ReadableStream({ start: () => {} });
}

/** A stream that emits a delta every `intervalMs` forever (alive but never finishing). */
function heartbeatStream(intervalMs: number): ReadableStream<unknown> {
	let cancelled = false;
	return new ReadableStream({
		start(controller) {
			const tick = (): void => {
				if (cancelled) return;
				try {
					controller.enqueue({ type: 'text-delta', id: 't', delta: '.' });
				} catch {
					return;
				}
				setTimeout(tick, intervalMs);
			};
			setTimeout(tick, intervalMs);
		},
		cancel() {
			cancelled = true;
		},
	});
}

/** A stream that emits chunks at the given fake-clock offsets, then closes. */
function timedStream(events: Array<{ at: number; chunk?: unknown; close?: true }>) {
	return new ReadableStream({
		start(controller) {
			for (const event of events) {
				setTimeout(() => {
					if (event.chunk !== undefined) controller.enqueue(event.chunk);
					if (event.close) controller.close();
				}, event.at);
			}
		},
	});
}

async function runWithTimers(promise: Promise<unknown>): Promise<unknown> {
	await vi.runAllTimersAsync();
	return await promise;
}

describe('verifyChecklist (agents stream path)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		mockResolveEvalModelConfig.mockReturnValue({
			modelId: 'anthropic/test-model',
			provider: 'anthropic',
			providerModelId: 'test-model',
			apiKey: 'test-key',
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('parses structured output from the finish chunk', async () => {
		const stream: StreamFn = vi.fn().mockResolvedValue({
			stream: chunkStream([
				{ type: 'text-delta', id: 't', delta: 'thinking…' },
				{
					type: 'finish',
					finishReason: 'stop',
					usage: { totalTokens: 10 },
					structuredOutput: GOOD_OUTPUT,
				},
			]),
		});
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toEqual([
			{
				id: 1,
				pass: true,
				reasoning: 'looks right',
				strategy: 'llm',
				failureCategory: undefined,
				rootCause: undefined,
			},
		]);
		expect(attempts).toHaveLength(1);
		expect(attempts[0].status).toBe('success');
		expect(stream).toHaveBeenCalledTimes(1);
	});

	it('falls back to parsing the streamed text when no structured output arrives', async () => {
		const json = JSON.stringify(GOOD_OUTPUT);
		const stream: StreamFn = vi.fn().mockResolvedValue({
			stream: chunkStream([
				{ type: 'text-delta', id: 't', delta: json.slice(0, 20) },
				{ type: 'text-delta', id: 't', delta: json.slice(20) },
				{ type: 'finish', finishReason: 'stop' },
			]),
		});
		mockVerifierAgent(stream);

		const { results } = (await runWithTimers(verifyChecklist(CHECKLIST, ARTIFACT))) as Awaited<
			ReturnType<typeof verifyChecklist>
		>;

		expect(results).toHaveLength(1);
		expect(results[0].pass).toBe(true);
	});

	it('bounds a never-emitting stream by the attempt cap (inactivity not yet armed)', async () => {
		const stream: StreamFn = vi
			.fn()
			.mockImplementation(async () => await Promise.resolve({ stream: stuckStream() }));
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toEqual([]);
		expect(attempts.map((a) => a.error)).toEqual([
			expect.stringContaining('verifier timed out after 60000ms'),
			expect.stringContaining('verifier timed out after 120000ms'),
			expect.stringContaining('verifier timed out after 240000ms'),
		]);
		expect(stream).toHaveBeenCalledTimes(VERIFY_ATTEMPT_TIMEOUTS_MS.length);
	});

	it('aborts a mid-stream stall on inactivity and exhausts all ladder attempts', async () => {
		// One chunk arrives, then silence: the watchdog (armed by the first chunk)
		// fires at chunk+45s, well before each attempt cap.
		const stream: StreamFn = vi.fn().mockImplementation(
			async () =>
				await Promise.resolve({
					stream: timedStream([{ at: 1_000, chunk: { type: 'text-delta', id: 't', delta: '…' } }]),
				}),
		);
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toEqual([]);
		expect(attempts).toHaveLength(VERIFY_ATTEMPT_TIMEOUTS_MS.length);
		for (const attempt of attempts) {
			expect(attempt.status).toBe('threw');
			expect(attempt.error).toContain(
				`verifier stalled: no stream activity for ${VERIFY_INACTIVITY_TIMEOUT_MS}ms`,
			);
		}
	});

	it('tolerates slow time-to-first-chunk beyond the inactivity window', async () => {
		// First chunk at 50s (> 45s window, < 60s cap): must NOT be treated as a stall.
		const stream: StreamFn = vi.fn().mockResolvedValue({
			stream: timedStream([
				{ at: 50_000, chunk: { type: 'text-delta', id: 't', delta: '…' } },
				{
					at: 52_000,
					chunk: { type: 'finish', finishReason: 'stop', structuredOutput: GOOD_OUTPUT },
					close: true,
				},
			]),
		});
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toHaveLength(1);
		expect(attempts[0].status).toBe('success');
		expect(stream).toHaveBeenCalledTimes(1);
	});

	it('keeps an alive-but-slow stream open past the inactivity window and succeeds', async () => {
		// Deltas at 30s/55s and finish at 58s: gaps stay under the 45s inactivity
		// window, and the total stays under the 60s first-attempt cap.
		const stream: StreamFn = vi.fn().mockResolvedValue({
			stream: timedStream([
				{ at: 30_000, chunk: { type: 'text-delta', id: 't', delta: '…' } },
				{ at: 55_000, chunk: { type: 'text-delta', id: 't', delta: '…' } },
				{
					at: 58_000,
					chunk: { type: 'finish', finishReason: 'stop', structuredOutput: GOOD_OUTPUT },
					close: true,
				},
			]),
		});
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toHaveLength(1);
		expect(attempts[0].status).toBe('success');
		expect(stream).toHaveBeenCalledTimes(1);
	});

	it('escalates the per-attempt cap 60s/120s/240s when the stream stays alive but never finishes', async () => {
		const stream: StreamFn = vi
			.fn()
			.mockImplementation(async () => await Promise.resolve({ stream: heartbeatStream(30_000) }));
		mockVerifierAgent(stream);

		const promise = verifyChecklist(CHECKLIST, ARTIFACT);
		// Bounded advance (not runAllTimers — the heartbeat reschedules forever):
		// caps 60s+120s+240s, two jittered pauses ≤ 3.5s, plus slack.
		await vi.advanceTimersByTimeAsync(430_000);
		const { results, attempts } = await promise;

		expect(results).toEqual([]);
		expect(attempts.map((a) => a.error)).toEqual([
			expect.stringContaining('verifier timed out after 60000ms'),
			expect.stringContaining('verifier timed out after 120000ms'),
			expect.stringContaining('verifier timed out after 240000ms'),
		]);
	});

	it('retries after an error chunk and succeeds on the next attempt', async () => {
		const stream: StreamFn = vi
			.fn()
			.mockResolvedValueOnce({
				stream: chunkStream([
					{ type: 'error', error: new Error('overloaded') },
					{ type: 'finish', finishReason: 'error' },
				]),
			})
			.mockResolvedValueOnce({
				stream: chunkStream([
					{ type: 'finish', finishReason: 'stop', structuredOutput: GOOD_OUTPUT },
				]),
			});
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toHaveLength(1);
		expect(attempts.map((a) => a.status)).toEqual(['model_error', 'success']);
		expect(attempts[0].error).toContain('overloaded');
		expect(stream).toHaveBeenCalledTimes(2);
	});

	it('returns empty when the model keeps answering unparseably', async () => {
		const stream: StreamFn = vi.fn().mockImplementation(
			async () =>
				await Promise.resolve({
					stream: chunkStream([
						{ type: 'text-delta', id: 't', delta: 'not json' },
						{ type: 'finish', finishReason: 'stop' },
					]),
				}),
		);
		mockVerifierAgent(stream);

		const { results, attempts } = (await runWithTimers(
			verifyChecklist(CHECKLIST, ARTIFACT),
		)) as Awaited<ReturnType<typeof verifyChecklist>>;

		expect(results).toEqual([]);
		expect(attempts.map((a) => a.status)).toEqual([
			'no_parseable_results',
			'no_parseable_results',
			'no_parseable_results',
		]);
	});
});

describe('verifyChecklist (native OpenAI path)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		mockResolveEvalModelConfig.mockReturnValue({
			modelId: 'openai/gpt-test',
			provider: 'openai',
			providerModelId: 'gpt-test',
			apiKey: 'test-key',
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('uses the attempt-cap ladder as the only watchdog for the non-streaming fetch', async () => {
		const fetchMock = vi.fn(
			async (_url: unknown, init: { signal: AbortSignal }) =>
				await new Promise((_resolve, reject) => {
					init.signal.addEventListener(
						'abort',
						() => {
							const reason: unknown = init.signal.reason;
							reject(reason instanceof Error ? reason : new Error(String(reason)));
						},
						{ once: true },
					);
				}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const promise = verifyChecklist(CHECKLIST, ARTIFACT);
		await vi.runAllTimersAsync();
		const { results, attempts } = await promise;

		expect(results).toEqual([]);
		expect(attempts.map((a) => a.error)).toEqual([
			expect.stringContaining('verifier timed out after 60000ms'),
			expect.stringContaining('verifier timed out after 120000ms'),
			expect.stringContaining('verifier timed out after 240000ms'),
		]);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
