import { describe, expect, it } from 'vitest';

import { retentionPolicyFromHours } from '../retention-policy';

describe('retentionPolicyFromHours', () => {
	it('gives no policy when retention is off', () => {
		expect(
			retentionPolicyFromHours({ enabled: false, maxAgeHours: 336, maxCount: 10_000 }),
		).toBeUndefined();
	});

	it.each([
		{ maxAgeHours: 336, maxAgeMs: 1_209_600_000 },
		{ maxAgeHours: 0, maxAgeMs: 0 },
		{ maxAgeHours: -1, maxAgeMs: 0 },
		{ maxAgeHours: 0.5, maxAgeMs: 1_800_000 },
		{ maxAgeHours: 2.3, maxAgeMs: 8_280_000 },
		{ maxAgeHours: 1e12, maxAgeMs: 31_536_000_000_000 },
		{ maxAgeHours: Infinity, maxAgeMs: 31_536_000_000_000 },
	])('keeps an execution for $maxAgeHours hours as $maxAgeMs ms', ({ maxAgeHours, maxAgeMs }) => {
		expect(retentionPolicyFromHours({ enabled: true, maxAgeHours, maxCount: 0 })).toEqual({
			maxAgeMs,
			maxCount: 0,
		});
	});

	it.each([
		{ maxCount: 10_000, kept: 10_000 },
		{ maxCount: 0, kept: 0 },
		{ maxCount: -1, kept: 0 },
		{ maxCount: 2.7, kept: 2 },
		{ maxCount: 0.5, kept: 0 },
		{ maxCount: Number.NaN, kept: 0 },
		{ maxCount: Infinity, kept: 0 },
		{ maxCount: 1e300, kept: 0 },
	])(
		'turns a count of $maxCount into a count limit of $kept, where 0 means no limit',
		({ maxCount, kept }) => {
			expect(retentionPolicyFromHours({ enabled: true, maxAgeHours: 1, maxCount })).toEqual({
				maxAgeMs: 3_600_000,
				maxCount: kept,
			});
		},
	);
});
