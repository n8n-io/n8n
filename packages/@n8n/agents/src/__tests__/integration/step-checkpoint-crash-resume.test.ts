/**
 * Durable-log RFC (resilience phase), end to end through the public SDK
 * surface: run with `stepCheckpoints` on, crash mid-run, crash-resume from the
 * persisted step checkpoint with a fresh Agent instance.
 *
 * The model is scripted by injecting a `MockLanguageModelV3` through the
 * public `.model()` builder — the real `streamText`, loop, tool executor and
 * checkpoint machinery all run. (Module-level mocking is not available here:
 * the source lazy-loads the AI SDK via `require()`, which only the unit
 * config's require-rewrite plugin makes mockable.)
 *
 * Crash model: a graceful abort is NOT a crash — the stream session's shutdown
 * path deletes the run's checkpoint (cancel semantics). A crash is teardown
 * never running. So the test gates tool #2 on a deferred promise that is never
 * resolved: the loop freezes awaiting the tool batch, the abort signal is
 * never observed (abort checks sit at step boundaries), no shutdown code runs,
 * and the batch-1 checkpoint durably survives in the shared store — exactly
 * the state a dead process leaves behind. Everything is event-ordered; no
 * timers.
 */
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks } from './helpers';
import { Agent, Tool } from '../../index';
import type { CheckpointStore, SerializableAgentState } from '../../types';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

/** A scripted model turn that calls one tool. */
function makeToolCallTurn(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(args) },
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

/** A scripted model turn that finishes with plain text. */
function makeTextTurn(text: string): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'txt-1' },
		{ type: 'text-delta', id: 'txt-1', delta: text },
		{ type: 'text-end', id: 'txt-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

/**
 * A minimal CheckpointStore backed by a plain Map so it can be shared across
 * agent instances, standing in for durable external storage.
 */
class InMemoryCheckpointStore implements CheckpointStore {
	private store = new Map<string, SerializableAgentState>();

	async save(key: string, state: SerializableAgentState): Promise<void> {
		this.store.set(key, structuredClone(state));
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		const state = this.store.get(key);
		return state ? structuredClone(state) : undefined;
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	get size(): number {
		return this.store.size;
	}
}

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('step checkpoints + crash resume through the public Agent API', () => {
	it('resumes a crashed run from its step checkpoint under the original runId', async () => {
		const store = new InMemoryCheckpointStore();
		const counters: Record<string, { entered: number; completed: number }> = {
			tool_one: { entered: 0, completed: 0 },
			tool_two: { entered: 0, completed: 0 },
			tool_three: { entered: 0, completed: 0 },
		};

		// One scripted model shared by both agent instances: turns 1-2 belong to
		// the original run, turns 3-5 to the crash-resumed one.
		const turns: MockStreamResult[] = [
			makeToolCallTurn('tc-1', 'tool_one', { value: 'first' }),
			makeToolCallTurn('tc-2', 'tool_two', { value: 'second' }),
			makeToolCallTurn('tc-2b', 'tool_two', { value: 'second-retry' }),
			makeToolCallTurn('tc-3', 'tool_three', { value: 'third' }),
			makeTextTurn('all three steps done'),
		];
		let nextTurn = 0;
		const model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'scripted',
			doStream: async () => turns[nextTurn++],
		});

		// Crash window controls: tool #2's first invocation signals entry and
		// then blocks on a deferred that is never resolved.
		const toolTwoEntered = createDeferred();
		const toolTwoGate = createDeferred();
		let gateArmed = true;

		const makeRecordingTool = (name: string, step: number): Tool =>
			new Tool(name)
				.description(`Run step ${step} of the job`)
				.input(z.object({ value: z.string().optional() }))
				.handler(async () => {
					counters[name].entered++;
					if (name === 'tool_two' && gateArmed) {
						toolTwoEntered.resolve();
						await toolTwoGate.promise; // never resolves — the crash victim
					}
					counters[name].completed++;
					return { ok: true, step };
				});

		const buildAgent = (): Agent =>
			new Agent('crash-resume-agent')
				.model(model)
				.instructions('Run the three steps in order using the tools. Be concise.')
				.tool(makeRecordingTool('tool_one', 1))
				.tool(makeRecordingTool('tool_two', 2))
				.tool(makeRecordingTool('tool_three', 3))
				.checkpoint(store);

		// --- Half 1: run until the crash ---
		const agent1 = buildAgent();
		const controller = new AbortController();
		const first = await agent1.stream('Run steps one, two and three', {
			stepCheckpoints: true,
			abortSignal: controller.signal,
		});
		const originalRunId = first.runId;
		expect(originalRunId).toBeTruthy();

		// Consume in the background so the loop isn't stalled by backpressure.
		// Never awaited: the run freezes inside tool #2 and this stream never ends.
		void collectStreamChunks(first.stream).catch(() => {});

		await toolTwoEntered.promise;
		// Tool #2 is in flight, so the batch-1 step checkpoint is durably stored.
		// The abort is the kill signal; the frozen loop never observes it, so no
		// teardown (which would delete the checkpoint as a cancellation) runs.
		controller.abort();

		const checkpointAtCrash = await store.load(originalRunId);
		expect(checkpointAtCrash?.status).toBe('running');
		expect(checkpointAtCrash?.pendingToolCalls).toEqual({});
		expect(JSON.stringify(checkpointAtCrash?.messageList)).toContain('tc-1');
		expect(counters.tool_one).toEqual({ entered: 1, completed: 1 });
		expect(model.doStreamCalls).toHaveLength(2);

		// --- Half 2: fresh agent, same store, crash-resume ---
		gateArmed = false;
		const contextNote =
			'Your previous "tool_two" call was interrupted by a restart. Its effect is unverified — verify before retrying.';
		const agent2 = buildAgent();
		const resumed = await agent2.crashResume({
			runId: originalRunId,
			contextNotes: [contextNote],
			stepCheckpoints: true,
		});

		// The run continues under the ORIGINAL runId.
		expect(resumed.runId).toBe(originalRunId);

		const chunks = await collectStreamChunks(resumed.stream);
		expect(chunks.filter((c) => c.type === 'error')).toHaveLength(0);
		const finish = chunksOfType(chunks, 'finish').at(-1);
		expect(finish?.finishReason).toBe('stop');

		// Every tool completed exactly once across both halves. The step-1 tool
		// was not re-run on resume (its result came from the checkpoint); tool #2's
		// first entry is the crash victim, re-issued by the scripted model as a
		// fresh call after reading the context note.
		expect(counters.tool_one).toEqual({ entered: 1, completed: 1 });
		expect(counters.tool_two).toEqual({ entered: 2, completed: 1 });
		expect(counters.tool_three).toEqual({ entered: 1, completed: 1 });

		// The first resumed model call saw the checkpointed history AND the note.
		expect(model.doStreamCalls).toHaveLength(5);
		const resumedPrompt = JSON.stringify(model.doStreamCalls[2].prompt);
		expect(resumedPrompt).toContain('tc-1');
		expect(resumedPrompt).toContain('interrupted by a restart');

		// Completion deleted the checkpoint...
		expect(await store.load(originalRunId)).toBeUndefined();
		expect(store.size).toBe(0);

		// ...so a second crash-resume attempt finds nothing to resume.
		const agent3 = buildAgent();
		await expect(agent3.crashResume({ runId: originalRunId })).rejects.toThrow(
			/No checkpoint found/,
		);
	});
});
