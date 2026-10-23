import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

import { dateExtensions } from '../date-extensions';

const extract = dateExtensions.functions.extract as (
	date: Date | DateTime,
	args: string[],
) => number;

describe('extract yearDayNumber', () => {
	it('should use the DateTime zone, not the system zone', () => {
		expect(
			extract(DateTime.fromISO('2024-01-01T00:30', { zone: 'Pacific/Kiritimati' }), [
				'yearDayNumber',
			]),
		).toBe(1);
		expect(
			extract(DateTime.fromISO('2024-12-31T23:30', { zone: 'Etc/GMT+12' }), ['yearDayNumber']),
		).toBe(366);
	});

	it('should keep the existing behavior for plain JS Dates', () => {
		expect(extract(new Date(2024, 2, 30), ['yearDayNumber'])).toBe(90);
	});
});
