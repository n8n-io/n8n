import type { ObservationalMemoryConfig } from '../../types';
import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import type { ScopedMemoryTaskEvent } from '../memory/scoped-memory-task-runner';
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
): {
	orchestrator: MemoryOrchestrator;
	tracker: BackgroundTaskTracker;
	events: ScopedMemoryTaskEvent[];
} {
	const events: ScopedMemoryTaskEvent[] = [];
	const config = {
		name: 'mid-run-agent',
		memory: store,
		observationalMemory,
		onMemoryTaskEvent: (event: ScopedMemoryTaskEvent) => events.push(event),
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
	return { orchestrator, tracker, events };
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

	it('does nothing when midRunObservation is disabled, even past the threshold', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(
			async () => await Promise.resolve('* CRITICAL (14:30) Should not appear.'),
		);
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			midRunObservation: false,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('a user message crossing the threshold')]);
		list.addResponse([assistantMsg('an assistant reply with more work')]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(observe).not.toHaveBeenCalled();
		expect(await store.getMessagesForObservationScope(THREAD_ID)).toHaveLength(0);
		expect(list.forLlm('base').messages).toHaveLength(2);
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
		const lock = await store.acquireObservationLogTaskLock(THREAD_ID, 'observer', {
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

		for (let attempt = 0; attempt < 4; attempt++) {
			await orchestrator.maybeObserveMidRun(list, runOptions());
		}
		expect(observe).not.toHaveBeenCalled();
		expect(list.llmVisibleMessages()).toHaveLength(1);
		await store.releaseObservationLogTaskLock(lock!);
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);
		expect(list.llmVisibleMessages()).toHaveLength(0);
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

	it.each(['provider', 'cursor'] as const)(
		'defers a failed %s attempt until the next run',
		async (failure) => {
			const store = new InMemoryMemory();
			const observe = vi.fn(async () => await Promise.resolve('* INFO Conversation reviewed.'));
			if (failure === 'provider') observe.mockRejectedValueOnce(new Error('observer failed'));
			else vi.spyOn(store, 'setCursor').mockRejectedValueOnce(new Error('cursor write failed'));
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

			// A hard crossing must not retry the failed background attempt.
			list.addResponse([assistantMsg('y'.repeat(750))]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			expect(observe).toHaveBeenCalledTimes(1);
			expect(list.llmVisibleMessages()).toHaveLength(2);
			expect(await store.getCursor(THREAD_ID)).toBeNull();

			const next = new AgentMessageList();
			await orchestrator.loadInto(next, runOptions());
			await orchestrator.maybeObserveMidRun(next, runOptions());
			expect(observe).toHaveBeenCalledTimes(2);
			expect(next.forLlm('base').messages).toEqual([
				{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
			]);
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(
				failure === 'cursor' ? 2 : 1,
			);
			const cursor = await store.getCursor(THREAD_ID);
			expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);
		},
	);

	it('keeps observation enabled while a tool call is pending', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(async () => await Promise.resolve('* COMPLETION Lookup completed.'));
		const { orchestrator } = buildOrchestrator(store, { observerThresholdTokens: 1, observe });
		const list = new AgentMessageList();
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'lookup',
						state: 'pending',
						input: {},
					},
				],
			},
		]);
		for (let attempt = 0; attempt < 4; attempt++) {
			await orchestrator.maybeObserveMidRun(list, runOptions());
		}
		expect(observe).not.toHaveBeenCalled();
		list.setToolCallResult('call-1', 'done');
		await store.saveMessages({
			threadId: THREAD_ID,
			resourceId: RESOURCE_ID,
			messages: [...list.messages()],
		});
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);
		expect(list.llmVisibleMessages()).toHaveLength(0);
	});

	it('defers observation after the turn save fails and recovers on the next run', async () => {
		const store = new InMemoryMemory();
		vi.spyOn(store, 'saveMessages').mockRejectedValueOnce(new Error('Message write failed'));
		const observe = vi.fn(async () => await Promise.resolve('* INFO Conversation reviewed.'));
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('A message that crosses the threshold.')]);
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();
		expect(observe).not.toHaveBeenCalled();
		expect(await store.getCursor(THREAD_ID)).toBeNull();
		expect(list.llmVisibleMessages()).toHaveLength(1);

		const next = new AgentMessageList();
		await orchestrator.loadInto(next, runOptions());
		await orchestrator.maybeObserveMidRun(next, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);
		expect(next.llmVisibleMessages()).toHaveLength(0);
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

	it.each(['not a bullet line', 'NO_OBSERVATIONS'])(
		'stops after a non-advancing response and permits another attempt on resume: %s',
		async (output) => {
			const store = new InMemoryMemory();
			const observe = vi.fn(async () => await Promise.resolve(output));
			const { orchestrator, tracker } = buildOrchestrator(store, {
				observerThresholdTokens: 10,
				observe,
				observationLogTailLimit: 20,
			});
			const list = new AgentMessageList();
			list.addInput([userMsg('a user message crossing the threshold')]);

			for (let i = 0; i < 5; i++) {
				await orchestrator.maybeObserveMidRun(list, runOptions());
			}

			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			expect(observe).toHaveBeenCalledTimes(1);
			expect(list.forLlm('base').messages).toHaveLength(1);
			expect(await store.getCursor(THREAD_ID)).toBeNull();

			await orchestrator.applyObservationMask(list, runOptions().persistence);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			expect(observe).toHaveBeenCalledTimes(2);
			expect(await store.getCursor(THREAD_ID)).toBeNull();

			observe.mockResolvedValue('* IMPORTANT The work is still open.');
			await orchestrator.applyObservationMask(list, runOptions().persistence);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			expect(observe).toHaveBeenCalledTimes(3);
			expect(await store.getCursor(THREAD_ID)).not.toBeNull();
		},
	);

	it.each(['Not an observation.', 'NO_OBSERVATIONS'])(
		'does not retry a non-advancing in-flight attempt at the hard boundary: %s',
		async (output) => {
			const store = new InMemoryMemory();
			const pending = deferred<string>();
			const observe = vi.fn(async () => await pending.promise);
			const { orchestrator } = buildOrchestrator(store, {
				observerThresholdTokens: 1000,
				observe,
			});
			const list = new AgentMessageList();
			list.addInput([userMsg('x'.repeat(750))]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));
			list.addResponse([assistantMsg('y'.repeat(750))]);
			const boundary = orchestrator.maybeObserveMidRun(list, runOptions());
			pending.resolve(output);
			await boundary;
			expect(observe).toHaveBeenCalledTimes(1);
			expect(await store.getCursor(THREAD_ID)).toBeNull();
			expect(list.llmVisibleMessages()).toHaveLength(2);
		},
	);

	it('keeps raw history after empty results and retries only on a new run', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(async () => await Promise.resolve('NO_OBSERVATIONS'));
		const { orchestrator, tracker, events } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
		});
		for (const callCount of [1, 2]) {
			const list = new AgentMessageList();
			await orchestrator.loadInto(list, runOptions());
			list.addInput([userMsg('Thank you for the help.')]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			expect(observe).toHaveBeenCalledTimes(callCount);
			expect(list.llmVisibleMessages()).toEqual(list.messages());
			expect(await store.getMessagesForObservationScope(THREAD_ID)).toEqual(list.messages());
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toEqual([]);
			expect(await store.getCursor(THREAD_ID)).toBeNull();
		}
		expect(events).toContainEqual(
			expect.objectContaining({
				type: 'completed',
				value: expect.objectContaining({
					status: 'ran',
					observationsWritten: 0,
					cursorAdvanced: false,
					skippedLines: [],
				}),
			}),
		);
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

	it('queues the tail observer behind an in-flight mid-run task at end of turn', async () => {
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

		// Soft crossing schedules the mid-run observer in the background.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));

		// The post-boundary tail is persisted at end of turn. The mid-run task
		// only covers up to its boundary, so the tail observer must queue
		// behind it on the per-scope runner instead of being joined and dropped.
		list.addResponse([assistantMsg('y'.repeat(750))]);
		await orchestrator.saveToMemory(list, runOptions());
		pendingObservation.resolve('* CRITICAL (14:30) Observed.');
		await tracker.flush();

		// Mid-run observer plus the queued tail observer both ran, and the
		// cursor now points at the turn's last message.
		expect(observe).toHaveBeenCalledTimes(2);
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);

		// The follow-up turn starts clean: loadInto resets the per-run flag and
		// history loads since the cursor (now at the previous turn's last
		// message), so no catch-up observer is needed and the gate applies.
		const nextList = new AgentMessageList();
		await orchestrator.loadInto(nextList, runOptions());
		nextList.addInput([userMsg('z'.repeat(250))]);
		await orchestrator.saveToMemory(nextList, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(2);
	});

	it.each(['invalid', 'provider', 'empty'] as const)(
		'suppresses a queued tail after a non-advancing %s outcome without disabling a newer run',
		async (outcome) => {
			const store = new InMemoryMemory();
			const pending = deferred<string>();
			const observe = vi
				.fn(async () => await Promise.resolve('* IMPORTANT New work recorded.'))
				.mockImplementationOnce(async () => {
					const response = await pending.promise;
					if (outcome === 'provider') throw new Error('Observer failed');
					return response;
				});
			const { orchestrator, tracker, events } = buildOrchestrator(store, {
				observerThresholdTokens: 1000,
				observe,
			});
			const list = new AgentMessageList();
			list.addInput([userMsg('x'.repeat(750))]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));
			list.addResponse([assistantMsg('y'.repeat(50))]);
			await orchestrator.saveToMemory(list, runOptions());

			const next = new AgentMessageList();
			await orchestrator.loadInto(next, runOptions());
			next.addInput([userMsg('z'.repeat(750))]);
			const boundary = orchestrator.maybeObserveMidRun(next, runOptions());
			pending.resolve(outcome === 'empty' ? 'NO_OBSERVATIONS' : 'Not an observation.');
			await boundary;
			await tracker.flush();

			expect(observe).toHaveBeenCalledTimes(2);
			expect(events).toContainEqual(
				expect.objectContaining({
					type: 'completed',
					value: { status: 'skipped', reason: 'run-disabled' },
				}),
			);
			expect(await store.getCursor(THREAD_ID)).toMatchObject({
				lastObservedMessageId: next.messages().at(-1)?.id,
			});
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(
				1,
			);
		},
	);

	it('schedules the tail observer after a settled, activated mid-run observation even when the tail is below threshold', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(async () => await Promise.resolve('* CRITICAL (14:30) Observed.'));
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);
		list.addResponse([assistantMsg('y'.repeat(750))]);

		// Hard crossing runs the observer synchronously, advances the cursor,
		// and masks the window — no in-flight mid-run task remains.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		expect(observe).toHaveBeenCalledTimes(1);
		expect(list.forLlm('base').messages).toEqual([
			{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
		]);

		// A small post-boundary tail is added before the turn ends. Its budget
		// is below the threshold, so the gate alone would skip it.
		list.addResponse([assistantMsg('z'.repeat(200))]);

		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		// The per-run flag forces the tail observer past the budget gate.
		expect(observe).toHaveBeenCalledTimes(2);
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);
	});

	it('schedules the tail observer after a soft mid-run task settled without a later boundary activating it', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(async () => await Promise.resolve('* CRITICAL (14:30) Observed.'));
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		// Soft crossing schedules in the background; the task settles and
		// advances the cursor, but no later boundary activates it, so the
		// window is never masked.
		await orchestrator.maybeObserveMidRun(list, runOptions());
		await tracker.flush();
		expect(await store.getCursor(THREAD_ID)).not.toBeNull();
		expect(list.forLlm('base').messages).toHaveLength(1);

		// The whole unmasked turn (750 + 200) is still below the threshold, so
		// the budget gate alone would skip the tail.
		list.addResponse([assistantMsg('z'.repeat(200))]);
		await orchestrator.saveToMemory(list, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(2);
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe(list.messages().at(-1)?.id);
	});

	it('detaches a settled mid-run task before gating a new turn', async () => {
		const store = new InMemoryMemory();
		const observe = vi.fn(async () => await Promise.resolve('* CRITICAL (14:30) Observed.'));
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		await tracker.flush();
		expect(observe).toHaveBeenCalledTimes(1);

		const nextList = new AgentMessageList();
		await orchestrator.loadInto(nextList, runOptions());
		nextList.addInput([userMsg('z'.repeat(100))]);
		await orchestrator.saveToMemory(nextList, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(1);
	});

	it('keeps the gate on the next turn when the previous mid-run task settles after it started', async () => {
		const store = new InMemoryMemory();
		const pendingObservation = deferred<string>();
		const observe = vi
			.fn(async () => await Promise.resolve('* CRITICAL (14:30) Tail observed.'))
			.mockImplementationOnce(async () => await pendingObservation.promise);
		const { orchestrator, tracker } = buildOrchestrator(store, {
			observerThresholdTokens: 1000,
			observe,
			observationLogTailLimit: 20,
		});
		const list = new AgentMessageList();
		list.addInput([userMsg('x'.repeat(750))]);

		await orchestrator.maybeObserveMidRun(list, runOptions());
		await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));
		list.addResponse([assistantMsg('y'.repeat(50))]);
		await orchestrator.saveToMemory(list, runOptions());

		// The follow-up turn starts while the previous mid-run task is still in
		// flight, so it loads the full previous turn (no cursor yet). The task
		// settles only afterwards; that settlement must not mark the new run as
		// having advanced the cursor.
		const nextList = new AgentMessageList();
		await orchestrator.loadInto(nextList, runOptions());
		pendingObservation.resolve('* CRITICAL (14:30) Observed.');
		await tracker.flush();
		expect(observe).toHaveBeenCalledTimes(2);

		// 800 chars of history plus 100 of input stay below the threshold: with
		// no mid-run observation this turn, the gate applies and skips.
		nextList.addInput([userMsg('z'.repeat(100))]);
		await orchestrator.saveToMemory(nextList, runOptions());
		await tracker.flush();

		expect(observe).toHaveBeenCalledTimes(2);
	});

	it('skips post-turn observation when a settled attempt failed to advance', async () => {
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

		expect(observe).toHaveBeenCalledTimes(1);
		expect(await store.getCursor(THREAD_ID)).toBeNull();
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
