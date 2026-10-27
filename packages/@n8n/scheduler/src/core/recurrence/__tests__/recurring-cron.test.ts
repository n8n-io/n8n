import type { RecurringCronUnit } from '@n8n/constants';

import type { RecurringCronSchedule } from '../../types';
import { isOnCadence } from '../kinds/recurring-cron';

const gate = (unit: RecurringCronUnit, size: number): RecurringCronSchedule => ({
	kind: 'recurring_cron',
	cronExpression: '0 0 9 * * 1',
	timezone: 'UTC',
	recurrenceUnit: unit,
	recurrenceSize: size,
});

describe('isOnCadence', () => {
	const everyThreeWeeks = gate('weeks', 3);

	it("passes a fire in the previous fire's own period (multi-weekday weeks)", () => {
		// Mon and Wed of the same week.
		expect(
			isOnCadence(
				new Date('2026-01-05T09:00:00Z'),
				new Date('2026-01-07T09:00:00Z'),
				everyThreeWeeks,
				'UTC',
			),
		).toBe(true);
	});

	it('rejects a fire in a between-cadence period', () => {
		expect(
			isOnCadence(
				new Date('2026-01-05T09:00:00Z'),
				new Date('2026-01-12T09:00:00Z'),
				everyThreeWeeks,
				'UTC',
			),
		).toBe(false);
	});

	it('passes a fire exactly one cadence later', () => {
		expect(
			isOnCadence(
				new Date('2026-01-05T09:00:00Z'),
				new Date('2026-01-26T09:00:00Z'),
				everyThreeWeeks,
				'UTC',
			),
		).toBe(true);
	});

	it('passes a late fire beyond the cadence (catch-up after downtime)', () => {
		expect(
			isOnCadence(
				new Date('2026-01-05T09:00:00Z'),
				new Date('2026-03-09T09:00:00Z'),
				everyThreeWeeks,
				'UTC',
			),
		).toBe(true);
	});
});
