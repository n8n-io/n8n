import { describe, expect, it } from 'vitest';

import {
	buildCron,
	describeSchedule,
	expandCronField,
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

	describe('expandCronField', () => {
		it('expands single values, lists, ranges, and steps', () => {
			expect(expandCronField('3', 0, 59)).toEqual([3]);
			expect(expandCronField('1,3,5', 0, 6)).toEqual([1, 3, 5]);
			expect(expandCronField('1-5', 0, 6)).toEqual([1, 2, 3, 4, 5]);
			expect(expandCronField('*/15', 0, 59)).toEqual([0, 15, 30, 45]);
			expect(expandCronField('1-5/2', 0, 6)).toEqual([1, 3, 5]);
			expect(expandCronField('5,1-3', 0, 6)).toEqual([1, 2, 3, 5]);
		});

		it('returns null for a bare star, out-of-range, or invalid tokens', () => {
			expect(expandCronField('*', 0, 6)).toBeNull();
			expect(expandCronField('7', 0, 6)).toBeNull();
			expect(expandCronField('5-1', 0, 6)).toBeNull();
			expect(expandCronField('abc', 0, 6)).toBeNull();
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
		});
	});
});
