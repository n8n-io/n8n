import { DateTime } from 'luxon';

import { keyRangeToDays } from '../insights.constants';
import { buildInsightsPresetAvailability } from '../insights-data-availability.util';

describe('buildInsightsPresetAvailability', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-05-04T12:00:00Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns oneYearRange true when oldest is null', () => {
		expect(buildInsightsPresetAvailability(null)).toEqual({ oneYearRange: true });
	});

	it('oneYearRange false when oldest is one day after the 365-day threshold', () => {
		const threshold = DateTime.utc().startOf('day').minus({ days: keyRangeToDays.year });
		const oldest = threshold.plus({ days: 1 }).toJSDate();
		expect(buildInsightsPresetAvailability(oldest)).toEqual({ oneYearRange: false });
	});

	it('oneYearRange true when oldest is exactly on the 365-day threshold', () => {
		const oldest = DateTime.utc().startOf('day').minus({ days: keyRangeToDays.year }).toJSDate();
		expect(buildInsightsPresetAvailability(oldest)).toEqual({ oneYearRange: true });
	});

	it('oneYearRange false when data spans less than a year', () => {
		const oldest = DateTime.utc().startOf('day').minus({ days: 100 }).toJSDate();
		expect(buildInsightsPresetAvailability(oldest)).toEqual({ oneYearRange: false });
	});
});
