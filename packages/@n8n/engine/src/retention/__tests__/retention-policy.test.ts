import { describe, expect, it } from 'vitest';

import { retentionPolicyFromHours } from '../retention-policy';

describe('retentionPolicyFromHours', () => {
	it('gives no policy when retention is off', () => {
		expect(retentionPolicyFromHours({ enabled: false, maxAgeHours: 336 })).toBeUndefined();
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
		expect(retentionPolicyFromHours({ enabled: true, maxAgeHours })).toEqual({ maxAgeMs });
	});
});
