import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	INSTANCE_AI_THREAD_SERVER_STATES,
	type InstanceAiThreadServerState,
	type InstanceAiThreadSummary,
} from '@n8n/api-types';
import {
	groupThreads,
	threadGroup,
	THREAD_GROUPS,
	type GroupThreadsOptions,
	type ThreadGroup,
	type ThreadGroupEntry,
} from '../groupThreads';
import { threadDisplayState, toTime } from '../threadDisplayState';

const BASE_TIME = Date.parse('2026-03-01T10:00:00.000Z');
const at = (seconds: number) => new Date(BASE_TIME + seconds * 1000).toISOString();

function chat(
	id: string,
	overview: Partial<InstanceAiThreadSummary> = {},
): InstanceAiThreadSummary {
	return { id, title: `Chat ${id}`, createdAt: at(0), updatedAt: at(0), ...overview };
}

const neverViewed = () => undefined;

function group(entries: ThreadGroupEntry[], name: ThreadGroup) {
	return entries.find((entry) => entry.group === name);
}

function shownIds(entries: ThreadGroupEntry[], name: ThreadGroup) {
	return group(entries, name)?.threads.map((thread) => thread.id);
}

// A small time range, so that equal times happen often.
const timeArb = fc.integer({ min: 0, max: 8 }).map(at);
const optionalTimeArb = fc.option(fc.oneof(timeArb, fc.constant('not a date')), {
	nil: undefined,
});
const stateArb = fc.option(fc.constantFrom(...INSTANCE_AI_THREAD_SERVER_STATES), {
	nil: undefined,
});
const threadValuesArb = fc.record({
	state: stateArb,
	needsInput: fc.option(fc.boolean(), { nil: undefined }),
	lastActivityAt: optionalTimeArb,
	updatedAt: timeArb,
	lastViewedAt: optionalTimeArb,
});
const threadsArb = fc
	.uniqueArray(fc.tuple(fc.integer({ min: 0, max: 60 }), threadValuesArb), {
		selector: ([id]) => id,
		maxLength: 30,
	})
	.map((rows) =>
		rows.map(([id, { lastViewedAt, ...overview }]) => ({
			thread: chat(`t${id}`, overview),
			lastViewedAt,
		})),
	);

/** Threads, the options to group them with, and the group of each thread. */
const inputArb = fc
	.record({
		rows: threadsArb,
		perGroup: fc.integer({ min: 0, max: 7 }),
		openIndex: fc.option(fc.nat(), { nil: undefined }),
		expanded: fc.subarray([...THREAD_GROUPS]),
	})
	.map(({ rows, perGroup, openIndex, expanded }) => {
		const views = new Map(rows.map((row) => [row.thread.id, row.lastViewedAt]));
		const lastViewedAt = (threadId: string) => views.get(threadId);
		const threads = rows.map((row) => row.thread);
		const openThreadId =
			openIndex === undefined || threads.length === 0
				? undefined
				: threads[openIndex % threads.length].id;
		const options: GroupThreadsOptions = {
			lastViewedAt,
			perGroup,
			openThreadId,
			expanded: new Set(expanded),
		};
		const groupOf = new Map(
			threads.map((t) => [t.id, threadGroup(threadDisplayState(t, lastViewedAt(t.id)))]),
		);
		return { threads, options, groupOf, perGroup, openThreadId };
	});

const activity = (thread: InstanceAiThreadSummary) =>
	toTime(thread.lastActivityAt) ?? toTime(thread.updatedAt) ?? Number.NEGATIVE_INFINITY;

describe('groupThreads', () => {
	describe('properties', () => {
		it('counts every chat in exactly one group and shows no chat twice', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options, groupOf }) => {
					const entries = groupThreads(threads, options);

					const total = entries.reduce((sum, entry) => sum + entry.total, 0);
					expect(total).toBe(threads.length);
					for (const entry of entries) {
						const members = threads.filter((t) => groupOf.get(t.id) === entry.group);
						expect(entry.total).toBe(members.length);
						for (const shown of entry.threads) expect(groupOf.get(shown.id)).toBe(entry.group);
					}
					const shown = entries.flatMap((entry) => entry.threads.map((t) => t.id));
					expect(new Set(shown).size).toBe(shown.length);
				}),
			);
		});

		it('shows at most perGroup chats plus the open chat, and never fewer than it can', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options, perGroup, openThreadId }) => {
					for (const entry of groupThreads(threads, options)) {
						const hasOpen = entry.threads.some((t) => t.id === openThreadId);
						if (options.expanded?.has(entry.group)) {
							expect(entry.threads).toHaveLength(entry.total);
						} else {
							expect(entry.threads.length).toBeLessThanOrEqual(perGroup + (hasOpen ? 1 : 0));
							expect(entry.threads.length).toBeGreaterThanOrEqual(Math.min(entry.total, perGroup));
						}
					}
				}),
			);
		});

		it('returns only groups with chats, in the fixed order', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options }) => {
					const order = groupThreads(threads, options).map((entry) => entry.group);
					const expected = THREAD_GROUPS.filter((name) => order.includes(name));
					expect(order).toEqual(expected);
					for (const entry of groupThreads(threads, options)) {
						expect(entry.total).toBeGreaterThan(0);
					}
				}),
			);
		});

		it('always shows the open chat in its group', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options, groupOf, openThreadId }) => {
					fc.pre(openThreadId !== undefined);
					const entries = groupThreads(threads, options);
					const openGroup = groupOf.get(openThreadId ?? '');
					expect(openGroup).toBeDefined();
					expect(shownIds(entries, openGroup ?? 'done')).toContain(openThreadId);
				}),
			);
		});

		it('shows the newest activity first, and keeps the newest chats', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options, groupOf, openThreadId }) => {
					for (const entry of groupThreads(threads, options)) {
						const times = entry.threads.map(activity);
						expect(times).toEqual(times.toSorted((a, b) => b - a));
						// Every chat that is not shown is not newer than the shown chats other than
						// the open chat, which can take the last place.
						const shown = new Set(entry.threads.map((t) => t.id));
						const others = entry.threads.filter((t) => t.id !== openThreadId).map(activity);
						const oldestShown = Math.min(...others);
						const hidden = threads.filter(
							(t) => groupOf.get(t.id) === entry.group && !shown.has(t.id),
						);
						for (const thread of hidden) expect(activity(thread)).toBeLessThanOrEqual(oldestShown);
					}
				}),
			);
		});

		it('puts every failed chat that does not wait for input in "Needs you"', () => {
			fc.assert(
				fc.property(inputArb, ({ threads, options }) => {
					const entries = groupThreads(threads, { ...options, expanded: new Set(THREAD_GROUPS) });
					const needsYou = new Set(shownIds(entries, 'needs-you'));
					for (const thread of threads.filter((t) => t.state === 'failed')) {
						expect(needsYou.has(thread.id)).toBe(true);
					}
				}),
			);
		});
	});

	describe('groups', () => {
		it.each<[InstanceAiThreadServerState | undefined, string | undefined, ThreadGroup]>([
			['needs-you', undefined, 'needs-you'],
			['failed', undefined, 'needs-you'],
			['working', undefined, 'working'],
			['idle', undefined, 'ready'],
			['idle', at(9), 'done'],
			[undefined, undefined, 'done'],
		])('puts a chat with the state %s (last viewed %s) in %s', (state, viewed, expected) => {
			const entries = groupThreads([chat('a', { state, lastActivityAt: at(5) })], {
				lastViewedAt: () => viewed,
			});

			expect(entries).toEqual([
				{ group: expected, threads: [expect.objectContaining({ id: 'a' })], total: 1 },
			]);
		});

		it('puts a chat that waits for input in "Needs you", whatever its state', () => {
			const entries = groupThreads([chat('a', { state: 'working', needsInput: true })], {
				lastViewedAt: neverViewed,
			});

			expect(entries.map((entry) => entry.group)).toEqual(['needs-you']);
		});

		it('puts chats after the first 50, which have no state, in "Done"', () => {
			const threads = [
				chat('busy', { state: 'working', lastActivityAt: at(5) }),
				chat('older-1'),
				chat('older-2'),
			];

			const entries = groupThreads(threads, { lastViewedAt: neverViewed });

			expect(entries.map((entry) => entry.group)).toEqual(['working', 'done']);
			expect(shownIds(entries, 'done')).toEqual(['older-1', 'older-2']);
		});

		it('returns no group for no chats', () => {
			expect(groupThreads([], { lastViewedAt: neverViewed })).toEqual([]);
		});

		it('uses the viewer last-viewed time of each chat', () => {
			const views: Record<string, string> = { seen: at(6) };
			const threads = [
				chat('seen', { state: 'idle', lastActivityAt: at(5) }),
				chat('unseen', { state: 'idle', lastActivityAt: at(5) }),
			];

			const entries = groupThreads(threads, { lastViewedAt: (id) => views[id] });

			expect(shownIds(entries, 'ready')).toEqual(['unseen']);
			expect(shownIds(entries, 'done')).toEqual(['seen']);
		});
	});

	describe('order and size', () => {
		const sevenDoneChats = Array.from({ length: 7 }, (_, index) =>
			chat(`c${index}`, { state: 'idle', lastActivityAt: at(index) }),
		);
		const seenAll = () => at(100);

		it('shows the five chats with the newest activity first, and counts all of them', () => {
			const [entry] = groupThreads(sevenDoneChats, { lastViewedAt: seenAll });

			expect(entry.threads.map((t) => t.id)).toEqual(['c6', 'c5', 'c4', 'c3', 'c2']);
			expect(entry.total).toBe(7);
		});

		it('sorts by the last update when a chat has no activity time', () => {
			const threads = [
				chat('old', { updatedAt: at(1) }),
				chat('new', { updatedAt: at(9) }),
				chat('active', { state: 'idle', lastActivityAt: at(5), updatedAt: at(0) }),
				chat('no-time', { updatedAt: 'not a date' }),
			];

			const entries = groupThreads(threads, { lastViewedAt: seenAll });

			expect(shownIds(entries, 'done')).toEqual(['new', 'active', 'old', 'no-time']);
		});

		it('keeps the order of the list for equal times', () => {
			const threads = ['b', 'a', 'c'].map((id) => chat(id, { updatedAt: at(3) }));

			const entries = groupThreads(threads, { lastViewedAt: seenAll });

			expect(shownIds(entries, 'done')).toEqual(['b', 'a', 'c']);
		});

		it('shows the open chat in the last place when it is older than the shown chats', () => {
			const [entry] = groupThreads(sevenDoneChats, { lastViewedAt: seenAll, openThreadId: 'c0' });

			expect(entry.threads.map((t) => t.id)).toEqual(['c6', 'c5', 'c4', 'c3', 'c0']);
			expect(entry.total).toBe(7);
		});

		it('changes nothing when the open chat is already shown', () => {
			const [entry] = groupThreads(sevenDoneChats, { lastViewedAt: seenAll, openThreadId: 'c4' });

			expect(entry.threads.map((t) => t.id)).toEqual(['c6', 'c5', 'c4', 'c3', 'c2']);
		});

		it('changes nothing for an open chat that is in another group or not in the list', () => {
			const threads = [...sevenDoneChats, chat('busy', { state: 'working' })];

			for (const openThreadId of ['busy', 'unknown']) {
				const entries = groupThreads(threads, { lastViewedAt: seenAll, openThreadId });
				expect(shownIds(entries, 'done')).toEqual(['c6', 'c5', 'c4', 'c3', 'c2']);
			}
		});

		it('shows every chat of an expanded group, and limits the others', () => {
			const threads = [
				...sevenDoneChats,
				...Array.from({ length: 6 }, (_, index) => chat(`w${index}`, { state: 'working' })),
			];

			const entries = groupThreads(threads, {
				lastViewedAt: seenAll,
				expanded: new Set<ThreadGroup>(['done']),
			});

			expect(group(entries, 'done')?.threads).toHaveLength(7);
			expect(group(entries, 'working')?.threads).toHaveLength(5);
		});

		it('takes the number of chats for each group from perGroup', () => {
			const [entry] = groupThreads(sevenDoneChats, { lastViewedAt: seenAll, perGroup: 2 });

			expect(entry.threads.map((t) => t.id)).toEqual(['c6', 'c5']);
		});

		it('shows only the open chat when perGroup is 0', () => {
			const [entry] = groupThreads(sevenDoneChats, {
				lastViewedAt: seenAll,
				perGroup: 0,
				openThreadId: 'c3',
			});

			expect(entry.threads.map((t) => t.id)).toEqual(['c3']);
			expect(entry.total).toBe(7);
		});

		it('shows no chat for a negative perGroup', () => {
			const [entry] = groupThreads(sevenDoneChats, { lastViewedAt: seenAll, perGroup: -2 });

			expect(entry.threads).toEqual([]);
			expect(entry.total).toBe(7);
		});

		it('does not change the list it gets', () => {
			const threads = [...sevenDoneChats];

			groupThreads(threads, { lastViewedAt: seenAll, openThreadId: 'c0' });

			expect(threads).toEqual(sevenDoneChats);
		});
	});
});
