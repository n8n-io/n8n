import type { Cron, CronExpression } from 'n8n-workflow';

import { cronToSchedule } from '../schedule-from-cron';

const cron = (over: Partial<Cron> = {}): Cron => ({
	expression: '0 0 9 * * *' as CronExpression,
	...over,
});

describe('cronToSchedule', () => {
	describe('interval', () => {
		it('maps a minute cadence to an interval in `new` mode', () => {
			expect(cronToSchedule(cron({ source: { field: 'minutes', size: 5 } }), 'UTC', 'new')).toEqual(
				{ kind: 'interval', intervalSeconds: 300 },
			);
		});

		it('maps a second cadence to an interval in `new` mode', () => {
			expect(
				cronToSchedule(cron({ source: { field: 'seconds', size: 30 } }), 'UTC', 'new'),
			).toEqual({ kind: 'interval', intervalSeconds: 30 });
		});

		it('keeps a minute cadence as a clock-aligned cron in `legacy` mode', () => {
			expect(
				cronToSchedule(cron({ source: { field: 'minutes', size: 5 } }), 'UTC', 'legacy'),
			).toEqual({ kind: 'cron', cronExpression: '0 0 9 * * *', timezone: 'UTC' });
		});

		it('does not use interval for an hours cadence, even in `new` mode', () => {
			expect(
				cronToSchedule(cron({ source: { field: 'hours', size: 3 } }), 'UTC', 'new'),
			).toMatchObject({ kind: 'cron' });
		});
	});

	describe('recurring_cron', () => {
		it('maps an activated recurrence of N >= 2 to a recurring_cron', () => {
			expect(
				cronToSchedule(
					cron({
						recurrence: { activated: true, index: 0, intervalSize: 3, typeInterval: 'hours' },
					}),
					'UTC',
					'legacy',
				),
			).toEqual({
				kind: 'recurring_cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'UTC',
				recurrenceUnit: 'hours',
				recurrenceSize: 3,
			});
		});

		it('treats a recurrence of 1 as a plain cron', () => {
			expect(
				cronToSchedule(
					cron({
						recurrence: { activated: true, index: 0, intervalSize: 1, typeInterval: 'days' },
					}),
					'UTC',
					'legacy',
				),
			).toMatchObject({ kind: 'cron' });
		});
	});

	describe('cron', () => {
		it('maps a raw cron with no source or recurrence to a plain cron', () => {
			expect(cronToSchedule(cron(), null, 'new')).toEqual({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: null,
			});
		});
	});
});
