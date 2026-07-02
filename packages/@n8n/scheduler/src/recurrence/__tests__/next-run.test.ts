import { DateTime } from 'luxon';

import { InvalidScheduleError } from '../../errors';
import type { CronSchedule, Schedule } from '../../types';
import { computeNextRunAt } from '../next-run';

/** computeNextRunAt asserting a non-null result, for the unbounded (cron/interval) cases. */
const nextOf = (schedule: Schedule, after: Date): Date => {
	const next = computeNextRunAt(schedule, after);
	if (next === null) throw new Error('expected a next run, got null');
	return next;
};

/** Local wall-clock ISO (with offset) of an absolute instant, in a given zone. */
const localOf = (d: Date, zone: string) =>
	DateTime.fromJSDate(d).setZone(zone).toISO({ suppressMilliseconds: true });

describe('computeNextRunAt', () => {
	describe('cron', () => {
		const utcDaily: CronSchedule = { kind: 'cron', cronExpression: '0 0 0 * * *', timezone: 'UTC' };

		it('computes the next daily fire strictly after the base', () => {
			expect(nextOf(utcDaily, new Date('2026-01-10T12:00:00Z')).toISOString()).toBe(
				'2026-01-11T00:00:00.000Z',
			);
		});

		it('skips the base instant when it lands exactly on a fire (strictly-after)', () => {
			expect(nextOf(utcDaily, new Date('2026-01-10T00:00:00Z')).toISOString()).toBe(
				'2026-01-11T00:00:00.000Z',
			);
		});

		it('honours the seconds field (6-field)', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '30 * * * * *',
				timezone: 'UTC',
			};
			expect(nextOf(schedule, new Date('2026-01-10T00:00:00Z')).toISOString()).toBe(
				'2026-01-10T00:00:30.000Z',
			);
		});

		it('throws when the timezone is unresolved (null)', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '0 0 0 * * *',
				timezone: null,
			};
			expect(() => computeNextRunAt(schedule, new Date('2026-01-10T12:00:00Z'))).toThrow(
				InvalidScheduleError,
			);
		});

		it('throws InvalidScheduleError on an out-of-range expression', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '99 0 0 * * *',
				timezone: 'UTC',
			};
			expect(() => computeNextRunAt(schedule, new Date('2026-01-10T00:00:00Z'))).toThrow(
				InvalidScheduleError,
			);
		});
	});

	describe('interval', () => {
		it('advances by intervalSeconds from after', () => {
			expect(
				nextOf(
					{ kind: 'interval', intervalSeconds: 3600 },
					new Date('2026-01-01T00:00:00Z'),
				).toISOString(),
			).toBe('2026-01-01T01:00:00.000Z');
		});

		it('advances from an arbitrary prior occurrence (deterministic, strictly after)', () => {
			expect(
				nextOf(
					{ kind: 'interval', intervalSeconds: 3600 },
					new Date('2026-01-01T02:30:00Z'),
				).toISOString(),
			).toBe('2026-01-01T03:30:00.000Z');
		});
	});

	describe('one_off', () => {
		const fireAt = new Date('2026-01-10T00:00:00.000Z');

		it('returns fireAt when after is before it', () => {
			expect(
				computeNextRunAt({ kind: 'one_off', fireAt }, new Date('2026-01-09T23:59:59.999Z')),
			).toEqual(fireAt);
		});

		it('returns null when after is at or past fireAt (strictly-after, exhausted)', () => {
			expect(computeNextRunAt({ kind: 'one_off', fireAt }, new Date(fireAt))).toBeNull();
			expect(
				computeNextRunAt({ kind: 'one_off', fireAt }, new Date('2026-02-01T00:00:00Z')),
			).toBeNull();
		});
	});

	// computeNextRunAt validates first, so corrupt input throws rather than
	// returning a wrong, past, or Invalid instant.
	describe('rejects malformed input', () => {
		const after = new Date('2026-01-01T00:00:00Z');

		it('throws on a zero interval (would not advance)', () => {
			expect(() => computeNextRunAt({ kind: 'interval', intervalSeconds: 0 }, after)).toThrow(
				InvalidScheduleError,
			);
		});

		it('throws on a negative interval (would go backwards)', () => {
			expect(() => computeNextRunAt({ kind: 'interval', intervalSeconds: -60 }, after)).toThrow(
				InvalidScheduleError,
			);
		});

		it('throws on a non-finite interval', () => {
			expect(() => computeNextRunAt({ kind: 'interval', intervalSeconds: NaN }, after)).toThrow(
				InvalidScheduleError,
			);
		});

		it('throws on an invalid one-off instant', () => {
			expect(() => computeNextRunAt({ kind: 'one_off', fireAt: new Date('nope') }, after)).toThrow(
				InvalidScheduleError,
			);
		});
	});

	describe('DST', () => {
		// America/New_York springs forward 2026-03-08: 02:00 -> 03:00 (02:xx local does not exist).
		it('cron spring-forward: shifts a nonexistent 02:30 local fire to 03:30 local', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '0 30 2 * * *',
				timezone: 'America/New_York',
			};
			const next = nextOf(schedule, new Date('2026-03-08T00:00:00-05:00'));
			expect(next.toISOString()).toBe('2026-03-08T07:30:00.000Z');
			expect(localOf(next, 'America/New_York')).toBe('2026-03-08T03:30:00-04:00');
		});

		// America/New_York falls back 2026-11-01: 02:00 -> 01:00 (01:xx local happens twice).
		it('cron fall-back: fires the daily 01:30 once, then the next day (no double-fire)', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '0 30 1 * * *',
				timezone: 'America/New_York',
			};
			const first = nextOf(schedule, new Date('2026-11-01T00:00:00-04:00'));
			expect(localOf(first, 'America/New_York')).toBe('2026-11-01T01:30:00-04:00');

			const second = nextOf(schedule, first);
			expect(localOf(second, 'America/New_York')).toBe('2026-11-02T01:30:00-05:00');
		});

		it('interval across spring-forward stays 3600s apart (real elapsed, skips the wall hour)', () => {
			// Prior occurrence 01:30 EST (06:30Z). +1h real -> 07:30Z = 03:30 EDT.
			const next = nextOf(
				{ kind: 'interval', intervalSeconds: 3600 },
				new Date('2026-03-08T06:30:00Z'),
			);
			expect(next.toISOString()).toBe('2026-03-08T07:30:00.000Z');
			expect(localOf(next, 'America/New_York')).toBe('2026-03-08T03:30:00-04:00');
		});

		it('UTC control: a daily UTC cron is unaffected by any DST transition', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '0 0 12 * * *',
				timezone: 'UTC',
			};
			expect(nextOf(schedule, new Date('2026-03-08T00:00:00Z')).toISOString()).toBe(
				'2026-03-08T12:00:00.000Z',
			);
		});
	});
});
