import { describe, expect, it } from 'vitest';

import { buildCron, parseCron, type ScheduleParts } from '../utils/scheduleBuilder';

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

		it('accepts cron 7 for Sunday and normalizes it to 0', () => {
			expect(parseCron('0 9 * * 7')).toMatchObject({
				frequency: 'weekly',
				dayOfWeek: 0,
				hour: 9,
				minute: 0,
			});
			expect(parseCron('0 9 * * 0')).toMatchObject({ frequency: 'weekly', dayOfWeek: 0 });
		});

		it('returns null for crons the builder cannot represent', () => {
			expect(parseCron('*/5 * * * *')).toBeNull();
			expect(parseCron('0 9 * 1 *')).toBeNull(); // specific month
			expect(parseCron('0 9 1-5 * *')).toBeNull(); // range day-of-month
			expect(parseCron('not a cron')).toBeNull();
			expect(parseCron('0 9 1 * 1')).toBeNull(); // both dom and dow set
		});
	});
});
