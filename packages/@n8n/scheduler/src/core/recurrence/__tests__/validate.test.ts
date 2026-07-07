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
