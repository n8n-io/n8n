import { DateTime } from 'luxon';

import { keyRangeToDays } from './insights.constants';

export type InsightsPresetAvailabilityPayload = {
	oneYearRange: boolean;
};

export function buildInsightsPresetAvailability(
	oldestPeriodStart: Date | null,
): InsightsPresetAvailabilityPayload {
	if (!oldestPeriodStart) {
		return { oneYearRange: true };
	}

	const today = DateTime.utc().startOf('day');
	const oldest = DateTime.fromJSDate(oldestPeriodStart, { zone: 'utc' }).startOf('day');

	return {
		oneYearRange: oldest <= today.minus({ days: keyRangeToDays.year }),
	};
}
