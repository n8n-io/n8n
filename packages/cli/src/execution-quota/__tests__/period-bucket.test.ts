import { DateTime } from 'luxon';

import { computePeriodBucket, computePeriodEnd } from '../period-bucket';

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

describe('computePeriodEnd', () => {
	const date = DateTime.utc(2026, 9, 1, 14, 30);

	it('resolves the end of a day period as the start of the next day', () => {
		expect(computePeriodEnd('day', date).toISO()).toBe('2026-09-02T00:00:00.000Z');
	});

	it('resolves the end of a week period as the start of the next ISO week (Monday)', () => {
		// 2026-09-01 is a Tuesday in ISO-week 2026-W36; the next ISO week
		// starts Monday 2026-09-07.
		expect(computePeriodEnd('week', date).toISO()).toBe('2026-09-07T00:00:00.000Z');
	});

	it('resolves the end of a month period as the start of the next month', () => {
		expect(computePeriodEnd('month', date).toISO()).toBe('2026-10-01T00:00:00.000Z');
	});
});
