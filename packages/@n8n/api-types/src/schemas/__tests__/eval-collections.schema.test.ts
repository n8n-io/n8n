import { normalizeMetricScore, RESERVED_METRIC_KEYS } from '../eval-collections.schema';

describe('normalizeMetricScore', () => {
	it('excludes reserved operational metrics', () => {
		for (const key of RESERVED_METRIC_KEYS) {
			// Even a value that happens to land in [0, 1] is not a score.
			expect(normalizeMetricScore(key, 0.5)).toBeNull();
			expect(normalizeMetricScore(key, 1719)).toBeNull();
		}
	});

	it('normalizes 1–5 AI-judge metrics onto [0, 1]', () => {
		expect(normalizeMetricScore('correctness', 5)).toBe(1);
		expect(normalizeMetricScore('correctness', 4)).toBe(0.8);
		expect(normalizeMetricScore('correctness', 1)).toBe(0.2);
		expect(normalizeMetricScore('helpfulness', 2.5)).toBe(0.5);
	});

	it('drops AI-judge values that fall outside the 1–5 range once scaled', () => {
		// 6 / 5 = 1.2 → out of [0, 1]
		expect(normalizeMetricScore('correctness', 6)).toBeNull();
		expect(normalizeMetricScore('helpfulness', -1)).toBeNull();
	});

	it('passes through other metrics only when already in [0, 1]', () => {
		expect(normalizeMetricScore('accuracy', 0.9)).toBe(0.9);
		expect(normalizeMetricScore('accuracy', 0)).toBe(0);
		expect(normalizeMetricScore('accuracy', 1)).toBe(1);
		// Unknown-scale values outside [0, 1] can't be scaled → excluded.
		expect(normalizeMetricScore('accuracy', 1.5)).toBeNull();
		expect(normalizeMetricScore('accuracy', -0.2)).toBeNull();
	});

	it('returns null for NaN', () => {
		expect(normalizeMetricScore('accuracy', Number.NaN)).toBeNull();
		expect(normalizeMetricScore('correctness', Number.NaN)).toBeNull();
	});
});
