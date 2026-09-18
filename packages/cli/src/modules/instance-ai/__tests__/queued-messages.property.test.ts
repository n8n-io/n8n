import { INSTANCE_AI_MAX_QUEUED_MESSAGES, type InstanceAiEvent } from '@n8n/api-types';
import type { User } from '@n8n/db';
import fc from 'fast-check';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { InstanceAiService } from '../instance-ai.service';
import { readQueuedMessages, type QueuedMessage } from '../storage/queued-messages';

/**
 * Model-based property tests for the message queue: random operation
 * sequences run against the service with an in-memory thread, and a small
 * reference model says what the queue, the transcript and the started runs
 * must look like after each step. The properties are the guarantees the
 * feature is built on:
 *
 * - the queue is the model's list, in order, never past the cap;
 * - the queue goes as ONE turn: every delivery (Send now, a tool-call
 *   boundary, a run finish) carries every queued line in order, joined with
 *   newlines, under the head's id;
 * - a delivered turn is announced once, and again only when parts were added;
 * - a sent turn is no longer the user's to change: edit, remove and recall
 *   refuse it, so an announced bubble always gets its run;
 * - nothing is lost and nothing goes twice: every queued line ends up in
 *   exactly one of {still queued, one started run, dropped by the user}.
 */

const THREAD_ID = 'thread-1';
const USER = { id: 'user-1' } as User;

type ThreadPatchArgs = {
	threadId: string;
	update: (current: {
		id: string;
		metadata?: Record<string, unknown>;
	}) => { metadata?: Record<string, unknown> } | null | undefined;
};

type QueueService = {
	agentMemory: { getThread: Mock; patchThread: Mock; saveMessages: Mock };
	eventBus: { publish: Mock };
	telemetry: { track: Mock };
	runState: {
		hasLiveRun: Mock;
		getActiveRunId: Mock;
		getThreadUser: Mock;
		getTimeZone: Mock;
		startRun: Mock;
	};
	backgroundTasks: { cancelThread: Mock };
	steerInterrupts: Map<string, AbortController>;
	queuedThreads: Set<string>;
	instanceSettings: { isMultiMain: boolean };
	interruptedRunSweeper: { isThreadDrivenElsewhere: Mock };
	startExecuteRun: Mock;
	defaultTimeZone: string;
	logger: { warn: Mock; debug: Mock };
	queueMessage: (threadId: string, text: string) => Promise<Array<{ id: string; text: string }>>;
	admitQueuedMessage: (
		user: User,
		threadId: string,
		text: string,
	) => Promise<Array<{ id: string; text: string }>>;
	updateQueuedMessage: (threadId: string, messageId: string, text: string) => Promise<unknown>;
	removeQueuedMessage: (threadId: string, messageId: string) => Promise<unknown>;
	recallQueuedMessages: (
		threadId: string,
		messageId: string,
	) => Promise<{ queuedMessages: unknown[]; text: string }>;
	sendQueueNow: (user: User, threadId: string) => Promise<{ queuedMessages: unknown[] }>;
	claimQueuedTurn: (threadId: string, runId: string, step: number) => Promise<boolean>;
	flushQueuedMessage: (user: User, threadId: string) => Promise<boolean>;
	discardQueuedMessages: (threadId: string) => Promise<void>;
};

/** What the model observes from the service: announced turns and started runs. */
type Observed = {
	events: Array<{ runId: string; messageId: string; text: string; source: string }>;
	runs: Array<{ runId: string; text: string }>;
};

function createHarness() {
	const thread = {
		id: THREAD_ID,
		resourceId: USER.id,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		metadata: {} as Record<string, unknown>,
	};
	const observed: Observed = { events: [], runs: [] };
	let runCounter = 0;
	let live = false;

	const service = Object.create(InstanceAiService.prototype) as unknown as QueueService;
	service.agentMemory = {
		getThread: vi.fn(async () => ({ ...thread, metadata: { ...thread.metadata } })),
		patchThread: vi.fn(async ({ update }: ThreadPatchArgs) => {
			const current = { ...thread, metadata: { ...thread.metadata } };
			const patch = update(current);
			if (!patch) return current;
			if (patch.metadata !== undefined) thread.metadata = patch.metadata;
			return { ...current, ...patch };
		}),
		saveMessages: vi.fn(async () => {}),
	};
	service.eventBus = {
		publish: vi.fn((_threadId: string, event: InstanceAiEvent) => {
			if (event.type !== 'user-message') return;
			observed.events.push({
				runId: event.runId,
				messageId: event.payload.messageId,
				text: event.payload.text,
				source: event.payload.source,
			});
		}),
	};
	service.telemetry = { track: vi.fn() };
	service.backgroundTasks = { cancelThread: vi.fn(() => []) };
	service.steerInterrupts = new Map([['run-live', new AbortController()]]);
	service.queuedThreads = new Set();
	service.instanceSettings = { isMultiMain: false };
	service.interruptedRunSweeper = { isThreadDrivenElsewhere: vi.fn(async () => false) };
	service.startExecuteRun = vi.fn((_user: User, _threadId: string, runId: string, text: string) => {
		observed.runs.push({ runId, text });
	});
	service.defaultTimeZone = 'UTC';
	service.logger = { warn: vi.fn(), debug: vi.fn() };
	service.runState = {
		hasLiveRun: vi.fn(() => live),
		getActiveRunId: vi.fn(() => (live ? 'run-live' : undefined)),
		getThreadUser: vi.fn(() => USER),
		getTimeZone: vi.fn(() => 'UTC'),
		startRun: vi.fn(() => ({
			runId: `run-${++runCounter}`,
			abortController: new AbortController(),
		})),
	};

	return {
		service,
		observed,
		queue: () => readQueuedMessages(thread.metadata),
		setLive(value: boolean) {
			// A new run arms a fresh interrupt, as createExecutionEnvironment does.
			if (value && !live) service.steerInterrupts.set('run-live', new AbortController());
			live = value;
		},
		isLive: () => live,
		interruptFired: () => service.steerInterrupts.get('run-live')?.signal.aborted === true,
	};
}

/** The reference model: the queue as the user and the run see it. */
type ModelItem = { id: string; text: string; sent: boolean };

// Texts without newlines, so a joined turn can be split back into its lines
// for the accounting property. Newlines inside a message are covered by the
// unit tests of the storage helper.
const arbText = fc.stringOf(fc.constantFrom(...'abcdefghij '), { minLength: 1, maxLength: 6 });

type Op =
	| { kind: 'queue'; text: string }
	| { kind: 'admit'; text: string }
	| { kind: 'update'; index: number; text: string }
	| { kind: 'remove'; index: number }
	| { kind: 'recall'; index: number }
	| { kind: 'setLive'; live: boolean }
	| { kind: 'sendNow' }
	| { kind: 'claim' }
	| { kind: 'flush' }
	| { kind: 'discard' };

const arbOp: fc.Arbitrary<Op> = fc.oneof(
	{ weight: 6, arbitrary: arbText.map((text): Op => ({ kind: 'queue', text })) },
	{ weight: 3, arbitrary: arbText.map((text): Op => ({ kind: 'admit', text })) },
	{
		weight: 2,
		arbitrary: fc
			.tuple(fc.nat({ max: 7 }), arbText)
			.map(([index, text]): Op => ({ kind: 'update', index, text })),
	},
	{ weight: 2, arbitrary: fc.nat({ max: 7 }).map((index): Op => ({ kind: 'remove', index })) },
	{ weight: 2, arbitrary: fc.nat({ max: 7 }).map((index): Op => ({ kind: 'recall', index })) },
	{ weight: 3, arbitrary: fc.boolean().map((live): Op => ({ kind: 'setLive', live })) },
	{ weight: 3, arbitrary: fc.constant<Op>({ kind: 'sendNow' }) },
	{ weight: 3, arbitrary: fc.constant<Op>({ kind: 'claim' }) },
	{ weight: 3, arbitrary: fc.constant<Op>({ kind: 'flush' }) },
	{ weight: 1, arbitrary: fc.constant<Op>({ kind: 'discard' }) },
);

const joinTexts = (items: ModelItem[]) => items.map((item) => item.text).join('\n');

/** The whole queue as one sent turn under the head, the way the service merges it. */
function mergedTurn(items: ModelItem[]): ModelItem | undefined {
	const [head] = items;
	return head ? { id: head.id, text: joinTexts(items), sent: true } : undefined;
}

const pendingCount = (items: ModelItem[]) => items.filter((item) => !item.sent).length;

function expectQueueMatches(actual: QueuedMessage[], model: ModelItem[]): void {
	expect(actual.map(({ id, text, sentAt }) => ({ id, text, sent: sentAt !== undefined }))).toEqual(
		model,
	);
	// The cap is on what the user can still change; a sent turn does not count.
	expect(pendingCount(model)).toBeLessThanOrEqual(INSTANCE_AI_MAX_QUEUED_MESSAGES);
}

describe('queued messages — properties', () => {
	it('keeps the queue equal to the model and delivers it as one turn, nothing lost or doubled', async () => {
		await fc.assert(
			fc.asyncProperty(fc.array(arbOp, { maxLength: 40 }), async (ops) => {
				const h = createHarness();
				let model: ModelItem[] = [];
				/** Every line the user queued, by where it ended up. */
				const ledger = { dropped: [] as string[], queued: [] as string[] };

				for (const op of ops) {
					switch (op.kind) {
						case 'queue': {
							if (pendingCount(model) >= INSTANCE_AI_MAX_QUEUED_MESSAGES) {
								await expect(h.service.queueMessage(THREAD_ID, op.text)).rejects.toThrow(UserError);
							} else {
								const queue = await h.service.queueMessage(THREAD_ID, op.text);
								const added = queue.at(-1)!;
								expect(added.text).toBe(op.text);
								model = [...model, { id: added.id, text: op.text, sent: false }];
								ledger.queued.push(op.text);
							}
							break;
						}
						case 'admit': {
							// The composer's path: queued behind a live run, delivered at once
							// when the run the client saw has already finished.
							if (pendingCount(model) >= INSTANCE_AI_MAX_QUEUED_MESSAGES) {
								await expect(
									h.service.admitQueuedMessage(USER, THREAD_ID, op.text),
								).rejects.toThrow(UserError);
								break;
							}
							const runsBefore = h.observed.runs.length;
							const queue = await h.service.admitQueuedMessage(USER, THREAD_ID, op.text);
							ledger.queued.push(op.text);
							if (h.isLive()) {
								const added = queue.at(-1)!;
								model = [...model, { id: added.id, text: op.text, sent: false }];
							} else {
								// Delivered with whatever was queued before it, as one run.
								const before = [...model, { id: 'pending', text: op.text, sent: false }];
								expect(h.observed.runs.length).toBe(runsBefore + 1);
								expect(h.observed.runs.at(-1)?.text).toBe(joinTexts(before));
								expect(queue).toEqual([]);
								model = [];
							}
							break;
						}
						case 'update': {
							if (model.length === 0) break;
							const item = model[op.index % model.length];
							if (item.sent) {
								// On its way: no longer the user's to change.
								await expect(
									h.service.updateQueuedMessage(THREAD_ID, item.id, op.text),
								).rejects.toThrow(UserError);
								break;
							}
							await h.service.updateQueuedMessage(THREAD_ID, item.id, op.text);
							// An edit replaces the line: the old text is gone, the new one is queued.
							ledger.dropped.push(...item.text.split('\n'));
							ledger.queued.push(...op.text.split('\n'));
							model = model.map((entry) =>
								entry.id === item.id ? { ...entry, text: op.text } : entry,
							);
							break;
						}
						case 'remove': {
							if (model.length === 0) break;
							const item = model[op.index % model.length];
							if (item.sent) {
								await expect(h.service.removeQueuedMessage(THREAD_ID, item.id)).rejects.toThrow(
									UserError,
								);
								break;
							}
							await h.service.removeQueuedMessage(THREAD_ID, item.id);
							ledger.dropped.push(...item.text.split('\n'));
							model = model.filter((entry) => entry.id !== item.id);
							break;
						}
						case 'recall': {
							if (model.length === 0) break;
							const index = op.index % model.length;
							if (model[index].sent) {
								await expect(
									h.service.recallQueuedMessages(THREAD_ID, model[index].id),
								).rejects.toThrow(UserError);
								break;
							}
							const { text } = await h.service.recallQueuedMessages(THREAD_ID, model[index].id);
							// The item and everything after it, joined the way it would have gone.
							expect(text).toBe(joinTexts(model.slice(index)));
							ledger.dropped.push(...text.split('\n'));
							model = model.slice(0, index);
							break;
						}
						case 'setLive': {
							h.setLive(op.live);
							break;
						}
						case 'sendNow': {
							const before = model;
							const eventsBefore = h.observed.events.length;
							const runsBefore = h.observed.runs.length;
							const firedBefore = h.interruptFired();
							await h.service.sendQueueNow(USER, THREAD_ID);
							if (h.isLive()) {
								const merged = mergedTurn(before);
								model = merged ? [merged] : [];
								if (merged) {
									// Announced once; again only when parts were added since.
									const changed = before.length > 1 || !before[0].sent;
									expect(h.observed.events.length - eventsBefore).toBe(changed ? 1 : 0);
									if (changed) {
										expect(h.observed.events.at(-1)).toEqual({
											runId: 'run-live',
											messageId: merged.id,
											text: merged.text,
											source: 'steered',
										});
									}
									// The step in flight is cancelled; the run's own finish delivers.
									expect(h.interruptFired()).toBe(true);
									expect(h.observed.runs.length).toBe(runsBefore);
								} else {
									// Nothing to send: no bubble, and the interrupt is left as it was.
									expect(h.observed.events.length).toBe(eventsBefore);
									expect(h.interruptFired()).toBe(firedBefore);
								}
							} else {
								expectFlushed(h, before, runsBefore);
								model = [];
							}
							break;
						}
						case 'claim': {
							const before = model;
							const eventsBefore = h.observed.events.length;
							const stop = await h.service.claimQueuedTurn(THREAD_ID, 'run-live', 1);
							expect(stop).toBe(before.length > 0);
							const merged = mergedTurn(before);
							model = merged ? [merged] : [];
							if (merged) {
								const changed = before.length > 1 || !before[0].sent;
								expect(h.observed.events.length - eventsBefore).toBe(changed ? 1 : 0);
							}
							break;
						}
						case 'flush': {
							const before = model;
							const runsBefore = h.observed.runs.length;
							const started = await h.service.flushQueuedMessage(USER, THREAD_ID);
							if (h.isLive()) {
								expect(started).toBe(false);
								expect(h.observed.runs.length).toBe(runsBefore);
							} else {
								expect(started).toBe(before.length > 0);
								expectFlushed(h, before, runsBefore);
								model = [];
							}
							break;
						}
						case 'discard': {
							await h.service.discardQueuedMessages(THREAD_ID);
							ledger.dropped.push(...model.flatMap((item) => item.text.split('\n')));
							model = [];
							break;
						}
					}
					expectQueueMatches(h.queue(), model);
				}

				// Accounting: every queued line is exactly one of still queued, in one
				// started run, or dropped by the user. Runs are the only delivery that
				// leaves the queue; an announced turn still goes with its run.
				const delivered = h.observed.runs.flatMap((run) => run.text.split('\n'));
				const stillQueued = model.flatMap((item) => item.text.split('\n'));
				expect([...delivered, ...stillQueued, ...ledger.dropped].sort()).toEqual(
					[...ledger.queued].sort(),
				);
			}),
			{ numRuns: 300 },
		);
	});

	it('a run input is never split: two flushes never share a queued line', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(arbText, { minLength: 1, maxLength: INSTANCE_AI_MAX_QUEUED_MESSAGES }),
				fc.array(arbText, { maxLength: INSTANCE_AI_MAX_QUEUED_MESSAGES }),
				async (first, second) => {
					const h = createHarness();
					for (const text of first) await h.service.queueMessage(THREAD_ID, text);
					await h.service.flushQueuedMessage(USER, THREAD_ID);
					for (const text of second) await h.service.queueMessage(THREAD_ID, text);
					await h.service.flushQueuedMessage(USER, THREAD_ID);

					const inputs = h.observed.runs.map((run) => run.text);
					expect(inputs[0]).toBe(first.join('\n'));
					if (second.length > 0) expect(inputs[1]).toBe(second.join('\n'));
					expect(inputs).toHaveLength(second.length > 0 ? 2 : 1);
					expect(h.queue()).toEqual([]);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/** The queue went as one run with every line in order, and is empty now. */
function expectFlushed(
	h: ReturnType<typeof createHarness>,
	before: ModelItem[],
	runsBefore: number,
): void {
	if (before.length === 0) {
		expect(h.observed.runs.length).toBe(runsBefore);
		return;
	}
	expect(h.observed.runs.length).toBe(runsBefore + 1);
	const run = h.observed.runs.at(-1)!;
	expect(run.text).toBe(joinTexts(before));
	expect(h.observed.events.at(-1)).toEqual({
		runId: run.runId,
		messageId: before[0].id,
		text: run.text,
		source: 'queued',
	});
}
