import { InMemoryFilesystem } from '../../__tests__/workspace/test-utils';
import type { ObservationalMemoryConfig } from '../../types';
import type { ExecutionOptions, RunOptions } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import type { ObservationLogObserverInput } from '../../types/sdk/observation-log';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import type { ScopedMemoryTaskEvent } from '../memory/scoped-memory-task-runner';
import { AgentMessageList, OBSERVATION_CONTINUATION_REMINDER } from '../model/message-list';
import { isContentToolResultOutput } from '../model/messages';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { guardToolResultForModel } from '../tools/tool-result-guard';
import { protectUntrustedToolResult } from '../tools/untrusted-tool-output';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

/** After a mid-turn swap, the turn's request stays visible next to the notes. */
function expectOnlyRequest(list: AgentMessageList) {
	const messages = list.forLlm('base').messages;
	expect(messages).toHaveLength(1);
	expect(messages[0].role).toBe('user');
	expect(messages[0].content).not.toBe(OBSERVATION_CONTINUATION_REMINDER);
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
		// These cases cover the disable-for-run policy; retry has its own tests.
		// System placement keeps the masked window easy to assert; message placement has its own tests.
		observationalMemory: {
			failurePolicy: 'disableForRun',
			logPlacement: 'system',
			...observationalMemory,
		},
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

		expectOnlyRequest(list);
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
		expectOnlyRequest(list);
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
		// Only the turn's request stays visible after the swap.
		expect(list.llmVisibleMessages()).toHaveLength(1);
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

	describe('with measured request size', () => {
		const usage = (promptTokens: number) => ({
			promptTokens,
			completionTokens: 0,
			totalTokens: promptTokens,
		});

		it('blocks for observation when the measured request crosses the hard threshold', async () => {
			const store = new InMemoryMemory();
			const observe = vi.fn(
				async () => await Promise.resolve('* IMPORTANT (14:31) Large prompt observed.'),
			);
			const { orchestrator } = buildOrchestrator(store, {
				observerThresholdTokens: 1_000,
				observe,
				observationLogTailLimit: 20,
			});
			const list = new AgentMessageList();
			list.addInput([userMsg('a short message')]);

			// The system prompt and tools make the real request far larger than its messages.
			await orchestrator.recordModelCallUsage(list, usage(5_000));
			list.addResponse([assistantMsg('a short reply')]);
			await orchestrator.maybeObserveMidRun(list, runOptions());

			expect(observe).toHaveBeenCalledTimes(1);
			expectOnlyRequest(list);
		});

		it('keeps the message estimate when the call reports no usage', async () => {
			const store = new InMemoryMemory();
			const observe = vi.fn(async () => await Promise.resolve('* IMPORTANT (14:31) Unused.'));
			const { orchestrator } = buildOrchestrator(store, {
				observerThresholdTokens: 1_000,
				observe,
				observationLogTailLimit: 20,
			});
			const list = new AgentMessageList();
			// Over the soft threshold on message size alone, so a lost estimate shows.
			list.addInput([userMsg('x'.repeat(750))]);

			await orchestrator.recordModelCallUsage(list, undefined);
			await orchestrator.recordModelCallUsage(list, usage(0));
			list.addResponse([assistantMsg('a short reply')]);
			await orchestrator.maybeObserveMidRun(list, runOptions());

			await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1));
		});
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
		expectOnlyRequest(list);
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

		// Joined the in-flight result first. The request stays visible, so the
		// window is still too full and a second Observer call covers the reply.
		expect(observe).toHaveBeenCalledTimes(2);
		expectOnlyRequest(list);
	});

	it.each(['provider', 'commit'] as const)(
		'defers a failed %s attempt until the next run',
		async (failure) => {
			const store = new InMemoryMemory();
			const observe = vi.fn(async () => await Promise.resolve('* INFO Conversation reviewed.'));
			if (failure === 'provider') observe.mockRejectedValueOnce(new Error('observer failed'));
			else
				vi.spyOn(store, 'commitObservationLogBatch').mockRejectedValueOnce(
					new Error('batch commit failed'),
				);
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
			// The next turn has no request of its own, so the reminder anchors the window.
			expect(next.forLlm('base').messages).toEqual([
				{ role: 'user', content: OBSERVATION_CONTINUATION_REMINDER },
			]);
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toHaveLength(
				1,
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

	it.each([false, true])(
		'retains a full document after compaction (untrusted: %s)',
		async (untrusted) => {
			const store = new InMemoryMemory();
			const fact = 'The agreed launch color is violet.';
			const document =
				'Background document text. '.repeat(400).slice(0, 7_500 - fact.length) + fact;
			const output = { content: document };
			const guarded = await guardToolResultForModel(
				untrusted ? protectUntrustedToolResult(output, { name: 'fetch_report' }) : output,
			);
			const observe = vi.fn(
				async ({ transcript }: ObservationLogObserverInput) =>
					await Promise.resolve(
						transcript.includes(fact)
							? `* IMPORTANT ${fact}`
							: '* IMPORTANT The document was incomplete.',
					),
			);
			const { orchestrator } = buildOrchestrator(store, {
				observerThresholdTokens: 5_000,
				observe,
				observationLogTailLimit: 20,
			});
			const list = new AgentMessageList();
			list.addInput([userMsg('fetch the report')]);
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
							output: guarded.historyOutput,
						},
					],
				},
			]);

			await orchestrator.maybeObserveMidRun(list, runOptions());

			expect(observe).toHaveBeenCalledWith(
				expect.objectContaining({ transcript: expect.stringContaining(document) }),
			);
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toMatchObject([
				{ text: fact },
			]);
			expect(list.observationLogMemory).toContain(fact);
			expectOnlyRequest(list);
		},
	);

	// A valid NO_OBSERVATIONS advances the cursor, so only malformed output is non-advancing.
	it.each(['not a bullet line'])(
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

	it.each(['Not an observation.'])(
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

	it('moves the cursor past empty results so a new run reads only new messages', async () => {
		const store = new InMemoryMemory();
		const inputs: ObservationLogObserverInput[] = [];
		const observe = vi.fn(async (input: ObservationLogObserverInput) => {
			inputs.push(input);
			return await Promise.resolve('NO_OBSERVATIONS');
		});
		const { orchestrator, tracker, events } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observe,
		});
		for (const text of ['Thank you for the help.', 'Thanks again.']) {
			const list = new AgentMessageList();
			await orchestrator.loadInto(list, runOptions());
			list.addInput([userMsg(text)]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			expect(await store.getActiveObservationLog({ observationScopeId: THREAD_ID })).toEqual([]);
			expect(await store.getCursor(THREAD_ID)).not.toBeNull();
		}
		expect(observe).toHaveBeenCalledTimes(2);
		expect(inputs[1].deltaMessages).toHaveLength(1);
		expect(events).toContainEqual(
			expect.objectContaining({
				type: 'completed',
				value: expect.objectContaining({
					status: 'ran',
					observationsWritten: 0,
					cursorAdvanced: true,
					skippedLines: [],
				}),
			}),
		);
	});

	it('does not tell the observer that a live offloaded result is unavailable', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const inputs: ObservationLogObserverInput[] = [];
		const { orchestrator } = buildOrchestrator(store, {
			observerThresholdTokens: 10,
			observationLogTailLimit: 20,
			observe: async (input) => {
				inputs.push(input);
				return await Promise.resolve('* CRITICAL (14:30) Search done.');
			},
		});
		const path = `tool-results/runs/${'a'.repeat(43)}/${'r'.repeat(43)}.result.json`;
		const list = new AgentMessageList();
		list.addInput([userMsg('search something big')]);
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'search',
						input: {},
						state: 'resolved',
						output: {
							_offloaded: true,
							path,
							originalCharCount: 250_000,
							estimatedTokenCount: 60_000,
							requiredAction: {
								toolName: 'workspace_read_tool_result',
								input: { path, view: 'json', pointer: '' },
							},
							message: 'Stored in workspace',
						},
					},
				],
			},
		]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(inputs).toHaveLength(1);
		const { transcript } = inputs[0];
		expect(transcript).not.toMatch(/expired|unavailable/i);
		expect(transcript).toContain('stored only for its originating run');
		expect(transcript).toContain('250000');
		// The durable log must not point at a run-scoped file.
		expect(transcript).not.toContain(path);
		// The live run keeps the readable reference.
		expect(JSON.stringify(list.messages())).toContain(path);
	});

	it.each([false, true])(
		'keeps a readable offloaded result path after observations (untrusted: %s)',
		async (untrusted) => {
			const filesystem = new InMemoryFilesystem();
			const output = { content: 'Search result text. '.repeat(15_000) };
			const modelOutput = untrusted
				? protectUntrustedToolResult(output, { name: 'search' })
				: output;
			const guarded = await guardToolResultForModel(
				modelOutput,
				(text) => Math.ceil(text.length / 4),
				{
					filesystem,
					runId: 'run-1',
					toolCallId: 'search-call',
				},
			);
			expect(guarded).toMatchObject({ offloaded: true, truncated: false });
			const envelope = isContentToolResultOutput(guarded.historyOutput)
				? (JSON.parse(
						guarded.historyOutput.value.filter((part) => part.type === 'text')[0].text,
					) as { path: string })
				: (guarded.historyOutput as { path: string });
			const { path } = envelope;
			const store = new InMemoryMemory();
			const observe = vi.fn(async () => await Promise.resolve('* IMPORTANT Search completed.'));
			const { orchestrator, tracker } = buildOrchestrator(store, {
				observerThresholdTokens: 10,
				observe,
			});
			const list = new AgentMessageList();
			await orchestrator.loadInto(list, runOptions());
			list.addInput([userMsg('Search the documents and compare the results.')]);
			list.addResponse([
				assistantMsg('I will compare the search results next.'),
				{
					id: 'search-result',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'search-call',
							toolName: 'search',
							input: {},
							state: 'resolved',
							output: guarded.historyOutput,
						},
					],
				},
			]);
			expect(JSON.stringify(list.forLlm('base'))).toContain(path);

			await orchestrator.maybeObserveMidRun(list, runOptions());

			expect(observe).toHaveBeenCalledTimes(1);
			expect(await store.getCursor(THREAD_ID)).toMatchObject({
				lastObservedMessageId: 'search-result',
			});
			expect(list.observationLogMemory).toContain('Search completed.');
			const persisted = await store.getMessagesForObservationScope(THREAD_ID);
			expect(JSON.stringify(persisted)).not.toContain(path);
			expect(persisted.at(-1)).toMatchObject({
				content: [
					{
						type: 'tool-call',
						output: untrusted
							? {
									type: 'content',
									value: [{ type: 'text', text: expect.stringContaining('"runScoped":true') }],
								}
							: { _offloaded: true, runScoped: true },
					},
				],
			});
			await expect(filesystem.readFile(path, { encoding: 'utf8' })).resolves.toBe(
				JSON.stringify(isContentToolResultOutput(modelOutput) ? modelOutput.value : output),
			);
			expect(JSON.stringify(list.messages())).toContain(path);
			const context = JSON.stringify(list.forLlm('base'));
			expect(context).not.toContain('I will compare the search results next.');
			// AGENT-1536: The model still needs the path while the run can read the file.
			expect(context).toContain(path);

			list.addResponse([assistantMsg('Compare the remaining search results.')]);
			await orchestrator.maybeObserveMidRun(list, runOptions());
			expect(observe).toHaveBeenCalledTimes(2);
			const nextContext = JSON.stringify(list.forLlm('base'));
			expect(nextContext).toContain(path);
			expect(nextContext).not.toContain('Compare the remaining search results.');

			await orchestrator.saveToMemory(list, runOptions());
			await tracker.flush();
			const nextRun = new AgentMessageList();
			await orchestrator.loadInto(nextRun, runOptions());
			expect(JSON.stringify(nextRun.messages())).not.toContain(path);
			expect(JSON.stringify(nextRun.forLlm('base'))).not.toContain(path);
		},
	);
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

	it.each(['invalid', 'provider'] as const)(
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
			pending.resolve('Not an observation.');
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
		expectOnlyRequest(list);

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

describe('MemoryOrchestrator budget estimate', () => {
	it('counts runtime catalogue reminders but ignores custom messages hidden from the model', async () => {
		const counted: string[] = [];
		const { orchestrator } = buildOrchestrator(
			new InMemoryMemory(),
			{ observerThresholdTokens: 100_000, observe: vi.fn(), observationLogTailLimit: 20 },
			async (text) => {
				counted.push(text);
				return await Promise.resolve(text.length);
			},
		);
		const list = new AgentMessageList();
		list.addInput([userMsg('Review an invoice')]);
		list.addResponse([
			{ type: 'custom', data: { type: 'n8n:runtime-skill-catalog', content: 'Current catalogue' } },
			{ type: 'custom', data: { dummy: 'Hidden application state' } },
		]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		expect(counted.join('\n')).toContain(
			'<system-reminder>\nCurrent catalogue\n</system-reminder>',
		);
		expect(counted.join('\n')).not.toContain('Hidden application state');
	});

	it('does not count the bytes of a file in a tool output', async () => {
		const counted: string[] = [];
		const { orchestrator } = buildOrchestrator(
			new InMemoryMemory(),
			{ observerThresholdTokens: 100_000, observe: vi.fn(), observationLogTailLimit: 20 },
			async (text) => {
				counted.push(text);
				return await Promise.resolve(text.length);
			},
		);
		const list = new AgentMessageList();
		list.addInput([userMsg('Read the image')]);
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'read_binary_data',
						input: { fileId: 'file-1' },
						state: 'resolved',
						output: {
							type: 'content',
							value: [
								{ type: 'text', text: '{"fileId":"file-1"}' },
								{
									type: 'file',
									mediaType: 'image/png',
									fileRef: { id: 'file-1' },
									data: new Uint8Array(10_000),
								},
							],
						},
					},
				],
			} as unknown as AgentMessage,
		]);

		await orchestrator.maybeObserveMidRun(list, runOptions());

		const text = counted.join('\n');
		expect(text).toContain('file-1');
		expect(text).not.toContain('"data"');
		expect(text.length).toBeLessThan(1_000);
	});
});
