import {
	THREAD_STATE_ORDER,
	classifyThreadState,
	compareThreadsForList,
	type ThreadFacts,
	type ThreadListEntry,
	type ThreadState,
} from '../thread-state';

const EARLIER = new Date('2026-10-01T09:00:00.000Z');
const LATER = new Date('2026-10-01T10:00:00.000Z');
const INVALID = new Date('not a date');

function facts(overrides: Partial<ThreadFacts> = {}): ThreadFacts {
	return {
		pendingCount: 0,
		running: false,
		lastRunFailed: false,
		lastActivityAt: EARLIER,
		lastViewedAt: LATER,
		...overrides,
	};
}

function entry(
	state: ThreadState,
	lastActivityAt: Date,
	id: string = state,
): ThreadListEntry & { id: string } {
	return { id, state, lastActivityAt };
}

describe('classifyThreadState', () => {
	describe('each branch', () => {
		it('returns needs-you when the thread has an open approval or question', () => {
			expect(classifyThreadState(facts({ pendingCount: 1 }))).toBe('needs-you');
			expect(classifyThreadState(facts({ pendingCount: 3 }))).toBe('needs-you');
		});

		it('returns working when a turn is running or queued', () => {
			expect(classifyThreadState(facts({ running: true }))).toBe('working');
		});

		it('returns failed when the last finished turn ended with an error', () => {
			expect(classifyThreadState(facts({ lastRunFailed: true }))).toBe('failed');
		});

		it('returns ready when the owner never opened the thread', () => {
			expect(classifyThreadState(facts({ lastViewedAt: undefined }))).toBe('ready');
		});

		it('returns ready when there is activity after the last view', () => {
			expect(classifyThreadState(facts({ lastActivityAt: LATER, lastViewedAt: EARLIER }))).toBe(
				'ready',
			);
		});

		it('returns done when the owner viewed the thread after its last activity', () => {
			expect(classifyThreadState(facts({ lastActivityAt: EARLIER, lastViewedAt: LATER }))).toBe(
				'done',
			);
		});

		it('returns done when the view time equals the activity time', () => {
			const sameTime = new Date(EARLIER.getTime());
			expect(classifyThreadState(facts({ lastActivityAt: EARLIER, lastViewedAt: sameTime }))).toBe(
				'done',
			);
		});

		it('returns ready when the activity is one millisecond after the view', () => {
			const justAfter = new Date(EARLIER.getTime() + 1);
			expect(classifyThreadState(facts({ lastActivityAt: justAfter, lastViewedAt: EARLIER }))).toBe(
				'ready',
			);
		});
	});

	describe('precedence', () => {
		it('returns needs-you when the thread is failed and also has pending items', () => {
			expect(classifyThreadState(facts({ pendingCount: 2, lastRunFailed: true }))).toBe(
				'needs-you',
			);
		});

		it('returns needs-you when the thread is running and also has pending items', () => {
			expect(
				classifyThreadState(facts({ pendingCount: 1, running: true, lastRunFailed: true })),
			).toBe('needs-you');
		});

		it('returns working when a new turn runs after a failed turn', () => {
			expect(classifyThreadState(facts({ running: true, lastRunFailed: true }))).toBe('working');
		});

		it('returns failed even when the owner already viewed the failure', () => {
			expect(
				classifyThreadState(
					facts({ lastRunFailed: true, lastActivityAt: EARLIER, lastViewedAt: LATER }),
				),
			).toBe('failed');
		});

		it('returns working for a never-viewed running thread', () => {
			expect(classifyThreadState(facts({ running: true, lastViewedAt: undefined }))).toBe(
				'working',
			);
		});
	});

	describe('bad input', () => {
		it('treats a negative pending count as zero', () => {
			expect(classifyThreadState(facts({ pendingCount: -2 }))).toBe('done');
			expect(classifyThreadState(facts({ pendingCount: -1, running: true }))).toBe('working');
		});

		it('treats a NaN pending count as zero', () => {
			expect(classifyThreadState(facts({ pendingCount: Number.NaN }))).toBe('done');
		});

		it('treats an invalid view date as never viewed', () => {
			expect(classifyThreadState(facts({ lastViewedAt: INVALID }))).toBe('ready');
		});

		it('treats an invalid activity date as unseen', () => {
			expect(classifyThreadState(facts({ lastActivityAt: INVALID, lastViewedAt: LATER }))).toBe(
				'ready',
			);
		});

		it('does not throw when both dates are invalid', () => {
			expect(classifyThreadState(facts({ lastActivityAt: INVALID, lastViewedAt: INVALID }))).toBe(
				'ready',
			);
		});
	});
});

describe('THREAD_STATE_ORDER', () => {
	it('puts failed threads next to needs-you and done threads last', () => {
		expect(THREAD_STATE_ORDER).toEqual(['needs-you', 'failed', 'working', 'ready', 'done']);
	});

	it('cannot be changed at runtime', () => {
		expect(Object.isFrozen(THREAD_STATE_ORDER)).toBe(true);
	});
});

describe('compareThreadsForList', () => {
	it('sorts threads by state order before activity time', () => {
		const oldNeedsYou = entry('needs-you', EARLIER);
		const newDone = entry('done', LATER);

		expect(compareThreadsForList(oldNeedsYou, newDone)).toBeLessThan(0);
		expect(compareThreadsForList(newDone, oldNeedsYou)).toBeGreaterThan(0);
	});

	it('sorts the newest activity first inside one state', () => {
		const older = entry('ready', EARLIER);
		const newer = entry('ready', LATER);

		expect(compareThreadsForList(newer, older)).toBeLessThan(0);
		expect(compareThreadsForList(older, newer)).toBeGreaterThan(0);
	});

	it('returns 0 for the same state and the same activity time', () => {
		const a = entry('working', EARLIER, 'a');
		const b = entry('working', new Date(EARLIER.getTime()), 'b');

		expect(compareThreadsForList(a, b)).toBe(0);
		expect(compareThreadsForList(b, a)).toBe(0);
	});

	it('keeps the input order for ties when it sorts a list', () => {
		const first = entry('done', EARLIER, 'first');
		const second = entry('done', new Date(EARLIER.getTime()), 'second');

		expect([first, second].sort(compareThreadsForList).map((t) => t.id)).toEqual([
			'first',
			'second',
		]);
	});

	it('sorts an invalid activity date last inside its state', () => {
		const invalid = entry('ready', INVALID, 'invalid');
		const valid = entry('ready', EARLIER, 'valid');
		const otherInvalid = entry('ready', new Date(Number.NaN), 'other-invalid');

		expect(compareThreadsForList(invalid, valid)).toBeGreaterThan(0);
		expect(compareThreadsForList(valid, invalid)).toBeLessThan(0);
		expect(compareThreadsForList(invalid, otherInvalid)).toBe(0);
	});

	it('does not let an invalid date override the state order', () => {
		const invalidNeedsYou = entry('needs-you', INVALID);
		const validDone = entry('done', LATER);

		expect(compareThreadsForList(invalidNeedsYou, validDone)).toBeLessThan(0);
	});

	it('sorts an unknown state after all known states', () => {
		const unknown = { state: 'archived' as ThreadState, lastActivityAt: LATER };
		const done = entry('done', EARLIER);

		expect(compareThreadsForList(unknown, done)).toBeGreaterThan(0);
		expect(compareThreadsForList(done, unknown)).toBeLessThan(0);
	});

	it('sorts a mixed list into the order of the grouped thread list', () => {
		const threads = [
			entry('done', LATER, 'done-new'),
			entry('ready', EARLIER, 'ready-old'),
			entry('working', EARLIER, 'working'),
			entry('failed', LATER, 'failed'),
			entry('ready', LATER, 'ready-new'),
			entry('needs-you', EARLIER, 'needs-you'),
			entry('done', EARLIER, 'done-old'),
		];

		expect(threads.sort(compareThreadsForList).map((t) => t.id)).toEqual([
			'needs-you',
			'failed',
			'working',
			'ready-new',
			'ready-old',
			'done-new',
			'done-old',
		]);
	});
});
