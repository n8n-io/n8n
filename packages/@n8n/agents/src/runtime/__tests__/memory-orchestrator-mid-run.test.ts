import type { ObservationalMemoryConfig } from '../../types';
import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList, OBSERVATION_CONTINUATION_REMINDER } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function assistantMsg(text: string): AgentMessage {
	return { role: 'assistant', content: [{ type: 'text', text }] };
}

function runOptions(): RunOptions & ExecutionOptions {
	return { persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID } };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function buildOrchestrator(
	store: InMemoryMemory,
	observationalMemory: ObservationalMemoryConfig,
	tokenCounter?: (text: string) => Promise<number>,
): { orchestrator: MemoryOrchestrator; tracker: BackgroundTaskTracker } {
	const config = {
		name: 'mid-run-agent',
		memory: store,
		observationalMemory,
	} as unknown as AgentRuntimeConfig;
	const tracker = new BackgroundTaskTracker();
	// Character-count token counter keeps budget thresholds deterministic.
	const orchestrator = new MemoryOrchestrator(
		config,
		tracker,
		new AgentEventBus(),
		new RuntimeTelemetry(config),
		tokenCounter ?? (async (text) => await Promise.resolve(text.length)),
	);
	return { orchestrator, tracker };
}

describe('MemoryOrchestrator.maybeObserveMidRun', () => {
	it('does nothing below the soft threshold', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 100_000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('hello')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('persists the turn, writes observations, advances the cursor, and masks the window on crossing', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe: async () =>
				await Promise.resolve('* CRITICAL (14:30) User set up mid-run observation.'),
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		const persisted = await store.getMessagesForObservationScope(THREAD_ID);
		expect(persisted.map((m) => m.id)).toEqual(list.messages().map((m) => m.id));

		const observations = await store.getActiveObservationLog({ observationScopeId: THREAD_ID });
		expect(observations).toMatchObject([
			{ marker: 'critical', text: 'User set up mid-run observation.' },
		]);

		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);

		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
		expect(list.observationLogMemory).toContain('User set up mid-run observation.');
	});

	it('leaves the window unmasked when the observer fails', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe: async () => await Promise.reject(new Error('observer exploded')),
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		await expect(orchestrator.maybeObserveMidRun(list, runOptions())).resolves.toBeUndefined();

		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('observes a window restored from a serialized checkpoint', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe: async () => await Promise.resolve('* CRITICAL (14:30) Restored-window observation.'),
			observationLogTailLimit: 20,
		});
		const source = new AgentMessageList();
		source.addInput([userMsg('a user message crossing the threshold')]);
		source.addResponse([assistantMsg('an assistant reply with more work')]);
		// The checkpoint JSON round-trip turns every createdAt into an ISO string.
		const serialized = source.serialize();
		const list = AgentMessageList.deserialize({
			...serialized,
			messages: serialized.messages.map((m) => ({
				...m,
				createdAt: m.createdAt.toISOString() as unknown as Date,
			})),
		});

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
	});

	it('contains orchestration failures instead of failing the run', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(
			store,
			{
				observerThresholdTokens: 10,
				observe: async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
				observationLogTailLimit: 20,
			},
			async () => await Promise.reject(new Error('token counter exploded')),
		);
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		await expect(orchestrator.maybeObserveMidRun(list, runOptions())).resolves.toBeUndefined();

		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('skips without masking when another holder owns the observer lock', async () => {
		const store = new InMemoryMemory();
		await store.acquireObservationLogTaskLock(THREAD_ID, 'observer', {
			holderId: 'someone-else',
			ttlMs: 60_000,
		});
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});

	it('resets the budget after compaction and observes again when new messages cross it', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* IMPORTANT (14:31) Progress recorded.'),
		);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 30,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('first chunk of work with enough characters to cross')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);

		// Everything visible was just compacted — budget is back to zero.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);

		list.addResponse([assistantMsg('second chunk of work with enough characters to cross')]);
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(2);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(2);
	});

	// With the character-count token counter, a 750-char message is inside the
	// soft band [700, 1000), and two such messages cross the hard threshold.

	it('schedules the observer in the background at the soft threshold and activates at a later boundary', async () => {
		const store = new InMemoryMemory();
		const d = deferred<string>();
		const observe = vi.fn(async () => await d.promise);
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		// Soft crossing persists the turn and schedules in the background —
		// the boundary call returns while the observer is still pending.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(1);
		expect(list.forLlm('base').messages).toHaveLength(1);
		await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));

		// While the task is in flight, later boundaries do not schedule another.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);

		d.resolve('* CRITICAL (14:30) Background observation.');
		await tracker.flush();

		// The next boundary activates the settled result without a new observer run.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);
		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
		expect(list.observationLogMemory).toContain('Background observation.');
		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
	});

	it('joins the in-flight observer when the hard threshold is crossed', async () => {
		const store = new InMemoryMemory();
		const d = deferred<string>();
		const observe = vi.fn(async () => await d.promise);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));

		// New messages push the budget past the hard threshold mid-flight.
		list.addResponse([assistantMsg('y'.repeat(750))]);
		const boundary = orchestrator.maybeObserveMidRun(list, runOptions());
		d.resolve('* CRITICAL (14:30) First chunk observed.');
		await boundary;

		// Joined the in-flight result instead of running a second observer: the
		// cursor covers only the first message, so the second stays visible.
		expect(observe).toHaveBeenCalledTimes(1);
		const visible = list.forLlm('base').messages;
		expect(visible).toHaveLength(2);
		expect(visible[0]).toEqual({ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER });
		expect(JSON.stringify(visible[1])).toContain('y'.repeat(750));
	});

	it('falls back to synchronous observation at the hard threshold after a failed background task', async () => {
		const store = new InMemoryMemory();
		const observe = vi
			.fn(async () => await Promise.resolve('* CRITICAL (14:30) Recovered.'))
			.mockRejectedValueOnce(new Error('observer exploded'));
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		// Background task settles as failed; the window stays untouched.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await tracker.flush();
		expect(list.forLlm('base').messages).toHaveLength(1);

		// Hard crossing clears the failed result and observes synchronously.
		list.addResponse([assistantMsg('y'.repeat(750))]);
		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).toHaveBeenCalledTimes(2);
		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(1);
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);
	});

	it('budgets full tool payloads as the model sees them, not the truncated observer rendering', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Large fetch summarized.'),
		);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 5_000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('fetch the report')]);
		// One large tool result dominates the window. The budget must count the
		// full payload the model receives.
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc1',
						toolName: 'fetch_report',
						input: { url: 'https://example.com/report' },
						state: 'resolved',
						output: { data: 'x'.repeat(20_000) },
					},
				],
			},
		]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).toHaveBeenCalledTimes(1);
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(1);
		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);
	});

	it('latches mid-run observation off after repeated non-advancing observer runs', async () => {
		const store = new InMemoryMemory();
		// Runs but never yields a parseable observation, so the cursor never advances.
		const observe = vi.fn(async () => await Promise.resolve('not a bullet line'));
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);

		for (let i = 0; i < 5; i++) {
			await orchestrator.maybeObserveMidRun(list, runOptions());
		}

		// Three blocking attempts, then the latch stops the per-boundary retries.
		expect(observe).toHaveBeenCalledTimes(3);
		expect(list.forLlm('base').messages).toHaveLength(1);
	});
});

describe('MemoryOrchestrator.saveToMemory observer gating', () => {
	it('does not schedule the observer below the threshold', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 100_000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('hello')]);
		list.addResponse([assistantMsg('hi')]);

		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toEqual([]);
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(2);
	});

	it('schedules the observer once the threshold is crossed', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Threshold crossed.'),
		);
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a message crossing the threshold')]);

		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(1);
		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
	});

	it('deduplicates an in-flight mid-run task without blocking later post-turn observation', async () => {
		const store = new InMemoryMemory();
		const pendingObservation = deferred<string>();
		const observe = vi.fn(async () => await pendingObservation.promise);
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));

		list.addResponse([assistantMsg('y'.repeat(750))]);
		await orchestrator.saveToMemory(list, runOptions());
		pendingObservation.resolve('* CRITICAL (14:30) Observed.');
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(1);

		const nextList = new AgentMessageList();
		await orchestrator.loadInto(nextList, runOptions());
		nextList.addInput([userMsg('z'.repeat(250))]);
		await orchestrator.saveToMemory(nextList, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(2);
	});

	it('gates normally when a settled mid-run task never advanced the cursor', async () => {
		const store = new InMemoryMemory();
		const observe = vi
			.fn(async () => await Promise.resolve('* CRITICAL (14:30) Observed post-turn.'))
			.mockResolvedValueOnce('not a bullet line');
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		// Soft crossing schedules a background task that settles without
		// advancing; no later boundary consumes it before the turn ends.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await tracker.flush();
		expect(await store.getCursor(THREAD_ID)).toBeNull();

		list.addResponse([assistantMsg('y'.repeat(750))]);
		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(2);
		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
	});

	it('persists the turn when observer budget estimation fails', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const { orchestrator, tracker } = buildOrchestrator(
			store,
			{
				observerThresholdTokens: 10,
				observe,
				observationLogTailLimit: 20,
			},
			async () => await Promise.reject(new Error('token counter exploded')),
		);
		const list = new AgentMessageList();
		list.addInput([userMsg('a message crossing the threshold')]);

		await expect(orchestrator.saveToMemory(list, runOptions())).resolves.toBeUndefined();
		await tracker.flush();

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(1);
	});
});

describe('MemoryOrchestrator.persistTurnDelta', () => {
	const observationalMemory: ObservationalMemoryConfig = {
		observerThresholdTokens: 100_000,
		observe: async () => await Promise.resolve(''),
		observationLogTailLimit: 20,
	};

	it('persists only the unpersisted suffix of the turn across repeated crossings', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(store, observationalMemory);
		const saveSpy = vi.spyOn(store, 'saveMessages');
		const list = new AgentMessageList();
		list.addInput([userMsg('first message')]);

		await orchestrator.persistTurnDelta(list, runOptions());
		list.addResponse([assistantMsg('second message')]);
		await orchestrator.persistTurnDelta(list, runOptions());
		// Nothing new: no store write at all.
		await orchestrator.persistTurnDelta(list, runOptions());

		expect(saveSpy.mock.calls.map((c) => c[0].messages.length)).toEqual([1, 1]);
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(2);
	});

	it('re-persists the turn after a resume entry resets the watermark', async () => {
		const store = new InMemoryMemory();
		const { orchestrator } = buildOrchestrator(store, observationalMemory);
		const list = new AgentMessageList();
		list.addInput([userMsg('needs approval')]);
		await orchestrator.persistTurnDelta(list, runOptions());

		const saveSpy = vi.spyOn(store, 'saveMessages');
		await orchestrator.persistTurnDelta(list, runOptions());
		expect(saveSpy).not.toHaveBeenCalled();

		// Resume entry point: a suspension settles the pending tool call in
		// place, so the restored turn must be re-persisted from scratch.
		await orchestrator.applyObservationMask(list, runOptions().persistence);
		await orchestrator.persistTurnDelta(list, runOptions());
		expect(saveSpy).toHaveBeenCalledTimes(1);
	});
});
