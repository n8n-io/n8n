import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	INSTANCE_AI_THREAD_SERVER_STATES,
	type InstanceAiThreadOverview,
	type InstanceAiThreadServerState,
} from '@n8n/api-types';
import { threadDisplayState, type ThreadDisplayState } from '../threadDisplayState';

const BASE_TIME = Date.parse('2026-03-01T10:00:00.000Z');
const at = (seconds: number) => new Date(BASE_TIME + seconds * 1000).toISOString();

// A small range, so that equal times happen often.
const validTimeArb = fc.integer({ min: 0, max: 20 }).map(at);
const timeArb = fc.option(fc.oneof(validTimeArb, fc.constantFrom('', 'not a date', '2026-13-45')), {
	nil: undefined,
});
const serverStateArb = fc.constantFrom(...INSTANCE_AI_THREAD_SERVER_STATES);
// Valid states, near misses and values of other types, as a newer or older server could send them.
const anyStateArb = fc.oneof(
	serverStateArb,
	fc.constantFrom(undefined, '', 'Idle', 'ready', 'done', 'needs_you'),
	fc.anything(),
);
const summaryArb = fc.record({
	state: anyStateArb,
	needsInput: fc.option(fc.boolean(), { nil: undefined }),
	lastActivityAt: timeArb,
});

/** Builds a summary from untyped values, like a payload the editor did not validate yet. */
function summaryFrom(values: { state: unknown; needsInput?: boolean; lastActivityAt?: string }) {
	return values as InstanceAiThreadOverview;
}

describe('threadDisplayState', () => {
	it.each<[InstanceAiThreadServerState, ThreadDisplayState]>([
		['needs-you', 'needs-you'],
		['working', 'working'],
		['failed', 'failed'],
	])('shows the server state %s as %s, whatever the viewer saw', (state, expected) => {
		expect(threadDisplayState({ state, lastActivityAt: at(10) }, at(20))).toBe(expected);
		expect(threadDisplayState({ state, lastActivityAt: at(20) }, at(10))).toBe(expected);
		expect(threadDisplayState({ state })).toBe(expected);
	});

	describe('an idle chat', () => {
		it('is ready when it had activity after the viewer last opened it', () => {
			expect(threadDisplayState({ state: 'idle', lastActivityAt: at(5) }, at(4))).toBe('ready');
		});

		it('is ready when the activity is one millisecond after the last view', () => {
			const viewed = '2026-03-01T10:00:00.000Z';
			const activity = '2026-03-01T10:00:00.001Z';
			expect(threadDisplayState({ state: 'idle', lastActivityAt: activity }, viewed)).toBe('ready');
		});

		it('is ready when the viewer never opened it', () => {
			expect(threadDisplayState({ state: 'idle', lastActivityAt: at(5) })).toBe('ready');
			expect(threadDisplayState({ state: 'idle', lastActivityAt: at(5) }, undefined)).toBe('ready');
		});

		it.each([
			['at the same time as', 5],
			['after', 6],
		])('is done when the viewer opened it %s the last activity', (_, viewedSecond) => {
			expect(threadDisplayState({ state: 'idle', lastActivityAt: at(5) }, at(viewedSecond))).toBe(
				'done',
			);
		});

		it('compares instants, not the text of the times', () => {
			const summary = { state: 'idle' as const, lastActivityAt: '2026-03-01T12:00:00+02:00' };
			expect(threadDisplayState(summary, '2026-03-01T10:00:00Z')).toBe('done');
			expect(threadDisplayState(summary, '2026-03-01T09:59:59.999Z')).toBe('ready');
		});

		it.each([
			['the activity time is missing', undefined, at(5)],
			['the activity time is not a date', 'yesterday', at(5)],
			['the activity time is empty', '', at(5)],
			['the last view is not a date', at(5), 'yesterday'],
			['the last view is empty', at(5), ''],
		])('is ready when %s', (_, lastActivityAt, lastViewedAt) => {
			expect(threadDisplayState({ state: 'idle', lastActivityAt }, lastViewedAt)).toBe('ready');
		});
	});

	describe('a summary without a valid state', () => {
		it.each([undefined, null, '', 'Idle', 'ready', 'done', 'needs_you', 1, {}])(
			'gives no state for %j',
			(state) => {
				expect(
					threadDisplayState(summaryFrom({ state, lastActivityAt: at(5) }), at(1)),
				).toBeUndefined();
			},
		);

		it('still shows needs-you when the chat waits for the viewer', () => {
			expect(threadDisplayState({ needsInput: true })).toBe('needs-you');
		});
	});

	it.each<InstanceAiThreadServerState>(['working', 'failed', 'idle'])(
		'shows needs-you when the chat waits for the viewer, even with the state %s',
		(state) => {
			expect(threadDisplayState({ state, needsInput: true, lastActivityAt: at(1) }, at(9))).toBe(
				'needs-you',
			);
		},
	);

	it('shows needs-you for the needs-you state without the needs-input flag', () => {
		expect(threadDisplayState({ state: 'needs-you', needsInput: false })).toBe('needs-you');
	});

	describe('properties', () => {
		it('always shows needs-you when the chat waits for the viewer', () => {
			fc.assert(
				fc.property(summaryArb, timeArb, (summary, lastViewedAt) => {
					const result = threadDisplayState(summaryFrom({ ...summary, needsInput: true }), lastViewedAt);
					expect(result).toBe('needs-you');
				}),
			);
		});

		it('always shows needs-you for the needs-you state', () => {
			fc.assert(
				fc.property(summaryArb, timeArb, (summary, lastViewedAt) => {
					const result = threadDisplayState(
						summaryFrom({ ...summary, state: 'needs-you' }),
						lastViewedAt,
					);
					expect(result).toBe('needs-you');
				}),
			);
		});

		it('is never ready when the viewer opened the chat at or after its last activity', () => {
			fc.assert(
				fc.property(
					serverStateArb,
					fc.option(fc.boolean(), { nil: undefined }),
					fc.integer({ min: 0, max: 20 }),
					fc.integer({ min: 0, max: 20 }),
					(state, needsInput, activitySecond, viewedOffset) => {
						const result = threadDisplayState(
							{ state, needsInput, lastActivityAt: at(activitySecond) },
							at(activitySecond + viewedOffset),
						);
						expect(result).not.toBe('ready');
					},
				),
			);
		});

		it('is ready for an idle chat with activity after the last view', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 20 }),
					fc.integer({ min: 1, max: 20 }),
					fc.constantFrom(undefined, false),
					(viewedSecond, gap, needsInput) => {
						const summary = { state: 'idle' as const, needsInput, lastActivityAt: at(viewedSecond + gap) };
						expect(threadDisplayState(summary, at(viewedSecond))).toBe('ready');
					},
				),
			);
		});

		it('gives a known state for each valid server state, and nothing for any other value', () => {
			fc.assert(
				fc.property(summaryArb, timeArb, (summary, lastViewedAt) => {
					const result = threadDisplayState(summaryFrom(summary), lastViewedAt);
					const hasValidState = INSTANCE_AI_THREAD_SERVER_STATES.some((s) => s === summary.state);
					if (summary.needsInput === true || hasValidState) {
						expect(['needs-you', 'working', 'failed', 'ready', 'done']).toContain(result);
					} else {
						expect(result).toBeUndefined();
					}
				}),
			);
		});

		it('keeps working and failed as they are when the chat does not wait for the viewer', () => {
			fc.assert(
				fc.property(
					fc.constantFrom<InstanceAiThreadServerState>('working', 'failed'),
					fc.constantFrom(undefined, false),
					timeArb,
					timeArb,
					(state, needsInput, lastActivityAt, lastViewedAt) => {
						expect(threadDisplayState({ state, needsInput, lastActivityAt }, lastViewedAt)).toBe(
							state,
						);
					},
				),
			);
		});
	});
});
