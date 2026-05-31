import { describe, expect, it } from 'vitest';

import {
	buildCron,
	describeSchedule,
	parseCron,
	type ScheduleParts,
} from '../utils/scheduleBuilder';

const base: ScheduleParts = {
	frequency: 'daily',
	minute: 0,
	hour: 9,
	dayOfWeek: 1,
	dayOfMonth: 1,
};

describe('scheduleBuilder', () => {
	describe('buildCron', () => {
		it('builds hourly / daily / weekly / monthly crons', () => {
			expect(buildCron({ ...base, frequency: 'hourly', minute: 30 })).toBe('30 * * * *');
			expect(buildCron({ ...base, frequency: 'daily', hour: 9, minute: 0 })).toBe('0 9 * * *');
			expect(buildCron({ ...base, frequency: 'weekly', hour: 8, minute: 15, dayOfWeek: 1 })).toBe(
				'15 8 * * 1',
			);
			expect(buildCron({ ...base, frequency: 'monthly', hour: 6, minute: 0, dayOfMonth: 15 })).toBe(
				'0 6 15 * *',
			);
		});
	});

	describe('parseCron', () => {
		it('round-trips structured crons', () => {
			for (const parts of [
				{ ...base, frequency: 'hourly' as const, minute: 30 },
				{ ...base, frequency: 'daily' as const, hour: 9, minute: 0 },
				{ ...base, frequency: 'weekly' as const, hour: 8, minute: 15, dayOfWeek: 3 },
				{ ...base, frequency: 'monthly' as const, hour: 6, minute: 0, dayOfMonth: 15 },
			]) {
				expect(parseCron(buildCron(parts))).toMatchObject({
					frequency: parts.frequency,
					minute: parts.minute,
				});
			}
		});

		it('returns null for crons the builder cannot represent', () => {
			expect(parseCron('*/5 * * * *')).toBeNull();
			expect(parseCron('0 9 * 1 *')).toBeNull(); // specific month
			expect(parseCron('0 9 1-5 * *')).toBeNull(); // range day-of-month
			expect(parseCron('not a cron')).toBeNull();
			expect(parseCron('0 9 1 * 1')).toBeNull(); // both dom and dow set
		});
	});

	describe('describeSchedule', () => {
		it('labels weekday and weekend day-of-week sets', () => {
			expect(describeSchedule('0 8 * * 1-5')).toEqual({ kind: 'weekdays', minute: 0, hour: 8 });
			expect(describeSchedule('0 9 * * 0,6')).toEqual({ kind: 'weekends', minute: 0, hour: 9 });
			expect(describeSchedule('0 9 * * 6-7')).toEqual({ kind: 'weekends', minute: 0, hour: 9 });
		});

		it('describes arbitrary day-of-week lists', () => {
			expect(describeSchedule('30 7 * * 1,3,5')).toEqual({
				kind: 'daysOfWeek',
				minute: 30,
				hour: 7,
				days: [1, 3, 5],
			});
		});

		it('expands day-of-week ranges and steps when describing', () => {
			expect(describeSchedule('0 9 * * */2')).toEqual({
				kind: 'daysOfWeek',
				minute: 0,
				hour: 9,
				days: [0, 2, 4, 6],
			});
			expect(describeSchedule('30 7 * * 1-5/2')).toEqual({
				kind: 'daysOfWeek',
				minute: 30,
				hour: 7,
				days: [1, 3, 5],
			});
		});

		it('describes minute steps that divide the hour, and day-of-month lists', () => {
			expect(describeSchedule('*/30 * * * *')).toEqual({ kind: 'everyNMinutes', minutes: 30 });
			expect(describeSchedule('0 9 1,15 * *')).toEqual({
				kind: 'daysOfMonth',
				minute: 0,
				hour: 9,
				days: [1, 15],
			});
		});

		it('returns null for shapes it does not summarise', () => {
			expect(describeSchedule('*/45 * * * *')).toBeNull(); // step that does not divide the hour
			expect(describeSchedule('0 9 * 1 *')).toBeNull(); // specific month
			expect(describeSchedule('0 9 * * *')).toBeNull(); // plain daily — parseCron handles it
			expect(describeSchedule('not a cron')).toBeNull();
			expect(describeSchedule('0 9 * * 8')).toBeNull(); // day-of-week out of range
			expect(describeSchedule('0 9 * * abc')).toBeNull(); // invalid day-of-week token
		});
	});
});
