import fc from 'fast-check';

import {
	THREAD_STATE_ORDER,
	classifyThreadState,
	compareThreadsForList,
	type ThreadFacts,
	type ThreadListEntry,
	type ThreadState,
} from '../thread-state';

const ALL_STATES: ThreadState[] = ['needs-you', 'working', 'ready', 'failed', 'done'];

// A small time range makes equal times common, so ties and chains of equal entries occur often.
const dateArb = fc.oneof(
	fc.integer({ min: 0, max: 5 }).map((ms) => new Date(ms)),
	fc.date({ noInvalidDate: false }),
	fc.constant(new Date(Number.NaN)),
);

const pendingCountArb = fc.oneof(
	fc.integer({ min: -5, max: 5 }),
	fc.integer(),
	fc.double(),
	fc.constant(Number.NaN),
);

const factsArb: fc.Arbitrary<ThreadFacts> = fc.record(
	{
		pendingCount: pendingCountArb,
		running: fc.boolean(),
		lastRunFailed: fc.boolean(),
		lastActivityAt: dateArb,
		lastViewedAt: dateArb,
	},
	{ requiredKeys: ['pendingCount', 'running', 'lastRunFailed', 'lastActivityAt'] },
);

const entryArb: fc.Arbitrary<ThreadListEntry> = fc.record({
	state: fc.constantFrom(...THREAD_STATE_ORDER),
	lastActivityAt: dateArb,
});

const sign = (value: number) => (value > 0 ? 1 : value < 0 ? -1 : 0);
const rank = (state: ThreadState) => THREAD_STATE_ORDER.indexOf(state);

describe('classifyThreadState properties', () => {
	it('returns needs-you whenever something is pending', () => {
		fc.assert(
			fc.property(
				factsArb,
				fc.oneof(fc.integer({ min: 1 }), fc.double({ min: Number.MIN_VALUE, noNaN: true })),
				(facts, pendingCount) => {
					expect(classifyThreadState({ ...facts, pendingCount })).toBe('needs-you');
				},
			),
		);
	});

	it('always returns one of the five states and never throws', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				expect(ALL_STATES).toContain(classifyThreadState(facts));
			}),
		);
	});

	it('gives the same state for a negative or NaN count as for a zero count', () => {
		fc.assert(
			fc.property(
				factsArb,
				fc.oneof(fc.integer({ max: -1 }), fc.constant(Number.NaN)),
				(facts, badCount) => {
					expect(classifyThreadState({ ...facts, pendingCount: badCount })).toBe(
						classifyThreadState({ ...facts, pendingCount: 0 }),
					);
				},
			),
		);
	});

	it('returns working for a running thread with nothing pending', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				expect(classifyThreadState({ ...facts, pendingCount: 0, running: true })).toBe('working');
			}),
		);
	});

	it('returns ready for an idle thread that the owner never opened', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const idle = { ...facts, pendingCount: 0, running: false, lastRunFailed: false };
				expect(classifyThreadState({ ...idle, lastViewedAt: undefined })).toBe('ready');
			}),
		);
	});
});

describe('compareThreadsForList properties', () => {
	it('is reflexive and antisymmetric', () => {
		fc.assert(
			fc.property(entryArb, entryArb, (a, b) => {
				expect(compareThreadsForList(a, a)).toBe(0);
				expect(sign(compareThreadsForList(a, b))).toBe(-sign(compareThreadsForList(b, a)) || 0);
			}),
		);
	});

	it('is transitive on random triples', () => {
		fc.assert(
			fc.property(entryArb, entryArb, entryArb, (a, b, c) => {
				const ab = compareThreadsForList(a, b);
				const bc = compareThreadsForList(b, c);
				const ac = compareThreadsForList(a, c);
				if (ab <= 0 && bc <= 0) expect(ac).toBeLessThanOrEqual(0);
				if (ab < 0 && bc <= 0) expect(ac).toBeLessThan(0);
				if (ab === 0 && bc === 0) expect(ac).toBe(0);
			}),
			{ numRuns: 500 },
		);
	});

	it('orders threads in different states by THREAD_STATE_ORDER', () => {
		fc.assert(
			fc.property(entryArb, entryArb, (a, b) => {
				fc.pre(a.state !== b.state);
				expect(sign(compareThreadsForList(a, b))).toBe(sign(rank(a.state) - rank(b.state)));
			}),
		);
	});

	it('sorts every needs-you thread before any done thread, and newest first inside a state', () => {
		fc.assert(
			fc.property(fc.array(entryArb, { maxLength: 30 }), (entries) => {
				const sorted = [...entries].sort(compareThreadsForList);
				const lastNeedsYou = sorted.map((e) => e.state).lastIndexOf('needs-you');
				const firstDone = sorted.findIndex((e) => e.state === 'done');

				if (lastNeedsYou !== -1 && firstDone !== -1) expect(lastNeedsYou).toBeLessThan(firstDone);
				for (let i = 1; i < sorted.length; i++) {
					expect(compareThreadsForList(sorted[i - 1], sorted[i])).toBeLessThanOrEqual(0);
				}
				expect(sorted).toHaveLength(entries.length);
			}),
		);
	});
});
