import { DateTime } from 'luxon';

import { InvalidScheduleError } from '../../errors';
import type { CronSchedule, RecurringCronSchedule, Schedule } from '../../types';
import { computeFirstRunAt, computeNextRunAt, occurrencesFrom } from '../next-run';

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
			const compute = () => computeNextRunAt(schedule, new Date('2026-01-10T12:00:00Z'));
			expect(compute).toThrow(InvalidScheduleError);
			expect(compute).toThrow(/timezone must be resolved to a concrete zone/);
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

		// validateSchedule only checks the expression's own syntax; it never sees `after`,
		// so a corrupt `after` (e.g. from a damaged nextRunAt column) reaches cron-parser's
		// own evaluation and must still be wrapped as InvalidScheduleError, not thrown raw.
		it('wraps a cron-parser failure caused by a corrupt `after` instant', () => {
			const schedule: CronSchedule = {
				kind: 'cron',
				cronExpression: '0 0 0 * * *',
				timezone: 'UTC',
			};
			const compute = () => computeNextRunAt(schedule, new Date('nope'));
			expect(compute).toThrow(InvalidScheduleError);
			expect(compute).toThrow(/Failed to evaluate cron expression/);
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

	// The every-Nth-period gate: `after` is the previous fire, and candidate
	// anchor fires are skipped until one lands on cadence, so an off-cadence
	// instant is never produced at all.
	describe('recurring_cron', () => {
		it('every 3 weeks: skips the two in-between weekly fires', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			// Previous fire Mon 2026-01-05; Mon 01-12 and 01-19 are off cadence.
			expect(nextOf(schedule, new Date('2026-01-05T09:00:00Z')).toISOString()).toBe(
				'2026-01-26T09:00:00.000Z',
			);
		});

		it('every 3 weeks on Mon+Wed: still fires the Wednesday of an on-cadence week', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				// Day lists are valid cron but outside the branded template type.
				cronExpression: '0 0 9 * * 1,3' as RecurringCronSchedule['cronExpression'],
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			// Mon 2026-01-05 fired; Wed of the same week passes the gate...
			const wednesday = nextOf(schedule, new Date('2026-01-05T09:00:00Z'));
			expect(wednesday.toISOString()).toBe('2026-01-07T09:00:00.000Z');
			// ...and the chain then jumps to the Monday three weeks after that week.
			expect(nextOf(schedule, wednesday).toISOString()).toBe('2026-01-26T09:00:00.000Z');
		});

		it('every 5 months: fires on the 15th, five calendar months apart', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 15 * *',
				timezone: 'UTC',
				recurrenceUnit: 'months',
				recurrenceSize: 5,
			};
			expect(nextOf(schedule, new Date('2026-01-15T09:00:00Z')).toISOString()).toBe(
				'2026-06-15T09:00:00.000Z',
			);
			expect(nextOf(schedule, new Date('2026-06-15T09:00:00Z')).toISOString()).toBe(
				'2026-11-15T09:00:00.000Z',
			);
		});

		it('every 5 hours on an hourly expression: five clock hours apart', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 * * * *',
				timezone: 'UTC',
				recurrenceUnit: 'hours',
				recurrenceSize: 5,
			};
			expect(nextOf(schedule, new Date('2026-01-01T00:00:00Z')).toISOString()).toBe(
				'2026-01-01T05:00:00.000Z',
			);
		});

		it('every 2 days across spring-forward: the 23-hour day still counts as a day', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 30 8 * * *',
				timezone: 'America/New_York',
				recurrenceUnit: 'days',
				recurrenceSize: 2,
			};
			// Previous fire Sat 2026-03-07 08:30 EST; DST starts on the skipped 03-08.
			const next = nextOf(schedule, new Date('2026-03-07T08:30:00-05:00'));
			expect(localOf(next, 'America/New_York')).toBe('2026-03-09T08:30:00-04:00');
		});

		// The node keeps a step cron AND the gate when the stride divides the
		// field range (six-hourly hours, quarterly months); the gate must then
		// pass every candidate, DST included.
		it('redundant divisible hours: a six-hourly anchor with a size-6 gate keeps firing across spring-forward', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 30 */6 * * *' as RecurringCronSchedule['cronExpression'],
				timezone: 'America/New_York',
				recurrenceUnit: 'hours',
				recurrenceSize: 6,
			};
			// Previous fire 00:30 EST on the spring-forward day: the next anchor
			// fire 06:30 EDT is only 5 real hours later, but 6 on the clock.
			const next = nextOf(schedule, new Date('2026-03-08T00:30:00-05:00'));
			expect(localOf(next, 'America/New_York')).toBe('2026-03-08T06:30:00-04:00');
		});

		it('redundant divisible hours: a six-hourly anchor with a size-6 gate keeps firing across fall-back', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 30 */6 * * *' as RecurringCronSchedule['cronExpression'],
				timezone: 'America/New_York',
				recurrenceUnit: 'hours',
				recurrenceSize: 6,
			};
			// Previous fire 00:30 EDT on the fall-back day: 06:30 EST is 7 real
			// hours later but 6 on the clock — passes without skipping ahead.
			const next = nextOf(schedule, new Date('2026-11-01T00:30:00-04:00'));
			expect(localOf(next, 'America/New_York')).toBe('2026-11-01T06:30:00-05:00');
		});

		it('redundant divisible months: a quarterly anchor with a size-3 gate keeps every fire', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 15 */3 *' as RecurringCronSchedule['cronExpression'],
				timezone: 'UTC',
				recurrenceUnit: 'months',
				recurrenceSize: 3,
			};
			expect(nextOf(schedule, new Date('2026-01-15T09:00:00Z')).toISOString()).toBe(
				'2026-04-15T09:00:00.000Z',
			);
		});

		it('a sparse anchor overshooting the cadence still fires (elapsed >= size, not ===)', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				// Fires on the 1st of each month, gated to every 3 weeks: no fire
				// lands exactly 3 weeks after another, so an equality gate would
				// never fire again.
				cronExpression: '0 0 9 1 * *',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			expect(nextOf(schedule, new Date('2026-01-01T09:00:00Z')).toISOString()).toBe(
				'2026-02-01T09:00:00.000Z',
			);
		});

		it('replays deterministically from an old previous fire (no permanent skip after downtime)', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			// However stale the previous fire is, the chain resumes on cadence
			// from it — never stalls waiting for state that downtime lost.
			expect(nextOf(schedule, new Date('2025-11-03T09:00:00Z')).toISOString()).toBe(
				'2025-11-24T09:00:00.000Z',
			);
		});

		it('gates from a nonexistent local anchor time (spring-forward shifts, then counts normally)', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 30 2 * * *',
				timezone: 'America/New_York',
				recurrenceUnit: 'days',
				recurrenceSize: 2,
			};
			// Previous fire Fri 03-06 02:30 EST. Sat 03-07 is 1 day (gated out);
			// Sun 03-08 has no 02:30 local, shifts to 03:30 EDT, still 2 days.
			const next = nextOf(schedule, new Date('2026-03-06T02:30:00-05:00'));
			expect(localOf(next, 'America/New_York')).toBe('2026-03-08T03:30:00-04:00');
		});

		it('throws when no candidate lands on cadence within the scan bound', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				// An every-second anchor produces ~1.8M candidates per 3-week
				// stride — far past the bound.
				cronExpression: '* * * * * *' as RecurringCronSchedule['cronExpression'],
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			// Previous fire at the end of a Sunday-week, so every scanned
			// candidate sits one gated week later and none passes.
			expect(() => computeNextRunAt(schedule, new Date('2026-01-10T23:59:59Z'))).toThrow(
				InvalidScheduleError,
			);
		});

		it('throws when the timezone is unresolved (null)', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: null,
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			expect(() => computeNextRunAt(schedule, new Date('2026-01-05T09:00:00Z'))).toThrow(
				InvalidScheduleError,
			);
		});
	});

	describe('computeFirstRunAt', () => {
		it('seeds a recurring_cron at its next anchor fire, ignoring the gate', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 3,
			};
			// Registered Sat 2026-01-03: fires this Monday, not three weeks out —
			// the registration instant is not a fire, so nothing is elapsed-gated.
			const first = computeFirstRunAt(schedule, new Date('2026-01-03T00:00:00Z'));
			expect(first?.toISOString()).toBe('2026-01-05T09:00:00.000Z');
		});

		it('still validates the schedule', () => {
			const schedule: RecurringCronSchedule = {
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * 1',
				timezone: 'UTC',
				recurrenceUnit: 'weeks',
				recurrenceSize: 1,
			};
			expect(() => computeFirstRunAt(schedule, new Date('2026-01-03T00:00:00Z'))).toThrow(
				InvalidScheduleError,
			);
		});

		it('coincides with computeNextRunAt for the other kinds', () => {
			const from = new Date('2026-01-03T00:00:00Z');
			const cron: CronSchedule = { kind: 'cron', cronExpression: '0 0 9 * * 1', timezone: 'UTC' };
			expect(computeFirstRunAt(cron, from)).toEqual(computeNextRunAt(cron, from));

			const interval: Schedule = { kind: 'interval', intervalSeconds: 3600 };
			expect(computeFirstRunAt(interval, from)).toEqual(computeNextRunAt(interval, from));

			const exhausted: Schedule = { kind: 'one_off', fireAt: new Date('2026-01-01T00:00:00Z') };
			expect(computeFirstRunAt(exhausted, from)).toBeNull();
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

// The generator the materializer walks (planOccurrences); its recurring_cron
// arm chains each fire off the previous one, so it is pinned directly here.
describe('occurrencesFrom', () => {
	const take = (generator: Generator<Date>, count: number): string[] =>
		Array.from({ length: count }, () => (generator.next().value as Date).toISOString());

	it('yields the seed fire verbatim, then walks the gated recurring_cron chain', () => {
		const schedule: RecurringCronSchedule = {
			kind: 'recurring_cron',
			cronExpression: '0 0 9 * * 1,3' as RecurringCronSchedule['cronExpression'],
			timezone: 'UTC',
			recurrenceUnit: 'weeks',
			recurrenceSize: 3,
		};
		expect(take(occurrencesFrom(schedule, new Date('2026-01-05T09:00:00Z')), 5)).toEqual([
			'2026-01-05T09:00:00.000Z', // the seed (an already-due fire), ungated
			'2026-01-07T09:00:00.000Z', // Wednesday of the same on-cadence week
			'2026-01-26T09:00:00.000Z', // Monday three weeks on
			'2026-01-28T09:00:00.000Z', // its Wednesday
			'2026-02-16T09:00:00.000Z', // Monday three weeks on again
		]);
	});

	it('surfaces the scan-bound throw mid-iteration (the path planOccurrences walks)', () => {
		const schedule: RecurringCronSchedule = {
			kind: 'recurring_cron',
			// An every-second anchor gated to every 3 weeks: no candidate within
			// the scan bound passes (same setup as the computeNextRunAt case).
			cronExpression: '* * * * * *' as RecurringCronSchedule['cronExpression'],
			timezone: 'UTC',
			recurrenceUnit: 'weeks',
			recurrenceSize: 3,
		};
		const fires = occurrencesFrom(schedule, new Date('2026-01-10T23:59:59Z'));
		// The seed itself still comes out; the throw happens advancing past it.
		expect((fires.next().value as Date).toISOString()).toBe('2026-01-10T23:59:59.000Z');
		expect(() => fires.next()).toThrow(InvalidScheduleError);
	});

	it('validates the schedule on first pull', () => {
		const schedule: RecurringCronSchedule = {
			kind: 'recurring_cron',
			cronExpression: '0 0 9 * * 1',
			timezone: 'UTC',
			recurrenceUnit: 'weeks',
			recurrenceSize: 1,
		};
		const fires = occurrencesFrom(schedule, new Date('2026-01-05T09:00:00Z'));
		expect(() => fires.next()).toThrow(InvalidScheduleError);
	});
});
