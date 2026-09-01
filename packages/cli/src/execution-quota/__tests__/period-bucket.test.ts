import { DateTime } from 'luxon';

import { computePeriodBucket } from '../period-bucket';

describe('computePeriodBucket', () => {
	const date = DateTime.utc(2026, 9, 1, 14, 30);

	it('buckets a day period as yyyy-MM-dd', () => {
		expect(computePeriodBucket('day', date)).toBe('2026-09-01');
	});

	it('buckets a month period as yyyy-MM', () => {
		expect(computePeriodBucket('month', date)).toBe('2026-09');
	});

	it('buckets a week period consistently for two dates in the same ISO week', () => {
		const monday = DateTime.utc(2026, 8, 31);
		const wednesday = DateTime.utc(2026, 9, 2);

		expect(computePeriodBucket('week', monday)).toBe(computePeriodBucket('week', wednesday));
	});

	it('buckets a week period differently for two dates in different ISO weeks', () => {
		const week1 = DateTime.utc(2026, 8, 31);
		const week2 = DateTime.utc(2026, 9, 7);

		expect(computePeriodBucket('week', week1)).not.toBe(computePeriodBucket('week', week2));
	});
});
