import { periodsBetween } from '../periods';

describe('periodsBetween', () => {
	describe('hours', () => {
		it('counts wall-clock hour steps', () => {
			expect(
				periodsBetween(
					new Date('2026-01-01T00:00:00Z'),
					new Date('2026-01-01T05:00:00Z'),
					'hours',
					'UTC',
				),
			).toBe(5);
		});

		it('does not wrap at a day boundary (27 hours later reads 27, not 3)', () => {
			expect(
				periodsBetween(
					new Date('2026-01-01T05:00:00Z'),
					new Date('2026-01-02T08:00:00Z'),
					'hours',
					'UTC',
				),
			).toBe(27);
		});

		it('counts clock labels across spring-forward, not real elapsed time', () => {
			// America/New_York springs forward 2026-03-08 02:00 -> 03:00. From 00:30
			// EST to 06:30 EDT is 5 real hours, but the clock shows a 6-hour step —
			// which is what keeps a six-hourly step anchor on its size-6 gate.
			expect(
				periodsBetween(
					new Date('2026-03-08T00:30:00-05:00'),
					new Date('2026-03-08T06:30:00-04:00'),
					'hours',
					'America/New_York',
				),
			).toBe(6);
		});

		it('counts clock labels across fall-back, not real elapsed time', () => {
			// America/New_York falls back 2026-11-01 02:00 -> 01:00. From Sat 22:30
			// EDT to Sun 06:30 EST is 9 real hours but an 8-hour clock step.
			expect(
				periodsBetween(
					new Date('2026-10-31T22:30:00-04:00'),
					new Date('2026-11-01T06:30:00-05:00'),
					'hours',
					'America/New_York',
				),
			).toBe(8);
		});
	});

	describe('days', () => {
		it('counts calendar days, not 24h blocks', () => {
			// One minute apart across midnight is still a day apart.
			expect(
				periodsBetween(
					new Date('2026-01-01T23:59:00Z'),
					new Date('2026-01-02T00:00:00Z'),
					'days',
					'UTC',
				),
			).toBe(1);
		});

		it('is not shifted by a 23-hour spring-forward day', () => {
			// America/New_York springs forward 2026-03-08; that day is 23h long
			// but still exactly one calendar day.
			expect(
				periodsBetween(
					new Date('2026-03-07T08:30:00-05:00'),
					new Date('2026-03-08T08:30:00-04:00'),
					'days',
					'America/New_York',
				),
			).toBe(1);
		});

		it('counts correctly across a leap-year boundary', () => {
			// 2028 is a leap year: Dec 30 is day 365 of 366. A day-of-year modulus
			// with a hardcoded 365 (the legacy bookkeeping) reads this 3-day span
			// as 2; the calendar count does not care how long the year was.
			expect(
				periodsBetween(
					new Date('2028-12-30T09:00:00Z'),
					new Date('2029-01-02T09:00:00Z'),
					'days',
					'UTC',
				),
			).toBe(3);
		});
	});

	describe('weeks', () => {
		it('weeks start on Sunday: Saturday and the next day are in different weeks', () => {
			// Sat 2026-01-10 -> Sun 2026-01-11.
			expect(
				periodsBetween(
					new Date('2026-01-10T09:00:00Z'),
					new Date('2026-01-11T09:00:00Z'),
					'weeks',
					'UTC',
				),
			).toBe(1);
		});

		it('two fires in the same Sunday-started week are zero weeks apart', () => {
			// Mon 2026-01-05 and Sat 2026-01-10 share the week of Sun 2026-01-04.
			expect(
				periodsBetween(
					new Date('2026-01-05T09:00:00Z'),
					new Date('2026-01-10T09:00:00Z'),
					'weeks',
					'UTC',
				),
			).toBe(0);
		});

		it('counts week boundaries across a year boundary', () => {
			// Mon 2026-12-28 (week of Sun 2026-12-27) -> Mon 2027-01-18 (week of Sun 2027-01-17).
			expect(
				periodsBetween(
					new Date('2026-12-28T09:00:00Z'),
					new Date('2027-01-18T09:00:00Z'),
					'weeks',
					'UTC',
				),
			).toBe(3);
		});

		it('a week crossing spring-forward is still one week (not zero)', () => {
			// America/New_York springs forward 2026-03-08. Week starts Sun 03-08
			// 00:00 EST and Sun 03-15 00:00 EDT are only 6 days 23 hours apart;
			// without rounding, the raw diff would read 0.99 weeks.
			expect(
				periodsBetween(
					new Date('2026-03-11T09:00:00-04:00'),
					new Date('2026-03-18T09:00:00-04:00'),
					'weeks',
					'America/New_York',
				),
			).toBe(1);
		});

		it('a week crossing fall-back is still one week (not two)', () => {
			// America/New_York falls back 2026-11-01. Week starts Sun 11-01 00:00
			// EDT and Sun 11-08 00:00 EST are 7 days 1 hour apart.
			expect(
				periodsBetween(
					new Date('2026-11-04T09:00:00-05:00'),
					new Date('2026-11-11T09:00:00-05:00'),
					'weeks',
					'America/New_York',
				),
			).toBe(1);
		});
	});

	describe('months', () => {
		it('counts calendar months', () => {
			expect(
				periodsBetween(
					new Date('2026-01-15T09:00:00Z'),
					new Date('2026-06-15T09:00:00Z'),
					'months',
					'UTC',
				),
			).toBe(5);
		});

		it('counts absolutely across year boundaries, so sizes of 12 and beyond work', () => {
			expect(
				periodsBetween(
					new Date('2026-03-01T09:00:00Z'),
					new Date('2028-03-01T09:00:00Z'),
					'months',
					'UTC',
				),
			).toBe(24);
		});
	});
});
