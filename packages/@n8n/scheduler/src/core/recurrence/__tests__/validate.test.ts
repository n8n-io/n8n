import type { CronExpression } from 'n8n-workflow';

import { InvalidScheduleError } from '../../errors';
import { validateSchedule } from '../validate';

describe('validateSchedule', () => {
	describe('cron', () => {
		it('accepts a valid 6-field expression in a real timezone', () => {
			expect(() =>
				validateSchedule({
					kind: 'cron',
					cronExpression: '0 0 12 * * *',
					timezone: 'Europe/London',
				}),
			).not.toThrow();
		});

		it('accepts a null timezone (instance default)', () => {
			expect(() =>
				validateSchedule({ kind: 'cron', cronExpression: '0 0 12 * * *', timezone: null }),
			).not.toThrow();
		});

		it('rejects a 5-field expression (seconds field required)', () => {
			expect(() =>
				validateSchedule({
					kind: 'cron',
					cronExpression: '0 12 * * *' as unknown as CronExpression,
					timezone: 'UTC',
				}),
			).toThrow(InvalidScheduleError);
		});

		it('rejects an unknown timezone', () => {
			expect(() =>
				validateSchedule({ kind: 'cron', cronExpression: '0 0 12 * * *', timezone: 'Mars/Phobos' }),
			).toThrow(/timezone/);
		});

		it('rejects an out-of-range expression', () => {
			expect(() =>
				validateSchedule({ kind: 'cron', cronExpression: '99 0 0 * * *', timezone: 'UTC' }),
			).toThrow(InvalidScheduleError);
		});

		it('rejects a non-string cron expression (raw input) with InvalidScheduleError', () => {
			expect(() =>
				validateSchedule({
					kind: 'cron',
					cronExpression: null as unknown as CronExpression,
					timezone: 'UTC',
				}),
			).toThrow(InvalidScheduleError);
		});
	});

	describe('recurring_cron', () => {
		const valid = {
			kind: 'recurring_cron',
			cronExpression: '0 0 9 * * 1',
			timezone: 'UTC',
			recurrenceUnit: 'weeks',
			recurrenceSize: 3,
		} as const;

		it('accepts a valid anchor with a gate', () => {
			expect(() => validateSchedule(valid)).not.toThrow();
		});

		it('accepts the node rule ranges (23 hours, 31 days, 13+ months)', () => {
			expect(() =>
				validateSchedule({ ...valid, recurrenceUnit: 'hours', recurrenceSize: 23 }),
			).not.toThrow();
			expect(() =>
				validateSchedule({ ...valid, recurrenceUnit: 'days', recurrenceSize: 31 }),
			).not.toThrow();
			expect(() =>
				validateSchedule({ ...valid, recurrenceUnit: 'months', recurrenceSize: 13 }),
			).not.toThrow();
		});

		it('rejects a stride of 1 (that is a plain cron) and other non-strides', () => {
			expect(() => validateSchedule({ ...valid, recurrenceSize: 1 })).toThrow(/recurrenceSize/);
			expect(() => validateSchedule({ ...valid, recurrenceSize: 0 })).toThrow(InvalidScheduleError);
			expect(() => validateSchedule({ ...valid, recurrenceSize: -3 })).toThrow(
				InvalidScheduleError,
			);
			expect(() => validateSchedule({ ...valid, recurrenceSize: 2.5 })).toThrow(
				InvalidScheduleError,
			);
		});

		it('rejects an unknown recurrence unit', () => {
			expect(() =>
				validateSchedule({
					...valid,
					recurrenceUnit: 'fortnights' as unknown as (typeof valid)['recurrenceUnit'],
				}),
			).toThrow(/recurrenceUnit/);
		});

		it('applies the cron anchor checks (field count, timezone, range)', () => {
			expect(() =>
				validateSchedule({
					...valid,
					cronExpression: '0 9 * * 1' as unknown as CronExpression,
				}),
			).toThrow(InvalidScheduleError);
			expect(() => validateSchedule({ ...valid, timezone: 'Mars/Phobos' })).toThrow(/timezone/);
			expect(() =>
				validateSchedule({ ...valid, cronExpression: '99 0 9 * * 1' as CronExpression }),
			).toThrow(InvalidScheduleError);
		});

		it('accepts a null timezone (instance default)', () => {
			expect(() => validateSchedule({ ...valid, timezone: null })).not.toThrow();
		});
	});

	describe('interval', () => {
		it('accepts a positive intervalSeconds', () => {
			expect(() => validateSchedule({ kind: 'interval', intervalSeconds: 60 })).not.toThrow();
		});

		it('rejects a non-positive intervalSeconds', () => {
			expect(() => validateSchedule({ kind: 'interval', intervalSeconds: 0 })).toThrow(
				/intervalSeconds/,
			);
		});

		it('rejects a non-integer intervalSeconds', () => {
			expect(() => validateSchedule({ kind: 'interval', intervalSeconds: 1.5 })).toThrow(
				InvalidScheduleError,
			);
		});
	});

	describe('one_off', () => {
		it('accepts a valid fireAt', () => {
			expect(() =>
				validateSchedule({ kind: 'one_off', fireAt: new Date('2026-01-01T00:00:00Z') }),
			).not.toThrow();
		});

		it('rejects an invalid fireAt', () => {
			expect(() => validateSchedule({ kind: 'one_off', fireAt: new Date('nope') })).toThrow(
				InvalidScheduleError,
			);
		});

		it('rejects a non-Date fireAt (raw input) with InvalidScheduleError', () => {
			expect(() =>
				validateSchedule({ kind: 'one_off', fireAt: '2026-01-01T00:00:00Z' as unknown as Date }),
			).toThrow(InvalidScheduleError);
		});
	});
});
