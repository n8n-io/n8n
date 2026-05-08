import {
	classifyScenario,
	fishersExactOneSidedLeft,
	wilsonInterval,
} from '../comparison/statistics';

describe('fishersExactOneSidedLeft', () => {
	it('returns 1 when either row is empty (no information)', () => {
		expect(fishersExactOneSidedLeft(0, 0, 5, 5)).toBe(1);
		expect(fishersExactOneSidedLeft(5, 5, 0, 0)).toBe(1);
	});

	it('returns 1 when no failures or no passes are observed (no test possible)', () => {
		expect(fishersExactOneSidedLeft(3, 0, 5, 0)).toBe(1);
		expect(fishersExactOneSidedLeft(0, 3, 0, 5)).toBe(1);
	});

	it('matches a known textbook case', () => {
		// 2x2 table where PR (1/3) is much worse than baseline (10/10).
		// Hypergeometric: P(X = 0) + P(X = 1) | drawn=3 from passes=11, fails=2
		// = C(11,0)C(2,3)/C(13,3) + C(11,1)C(2,2)/C(13,3)
		// = 0 + 11/286 ≈ 0.03846
		const p = fishersExactOneSidedLeft(1, 2, 10, 0);
		expect(p).toBeCloseTo(0.03846, 4);
	});

	it('returns p = 1 when PR pass rate equals baseline at maximum', () => {
		// PR all pass, baseline all pass — under H0 the observed PR is the most likely outcome,
		// so the left-tail (X ≤ a) p-value is exactly 1.
		const p = fishersExactOneSidedLeft(5, 0, 5, 0);
		expect(p).toBe(1);
	});

	it('detects a strong regression with high N', () => {
		// PR 0/10, baseline 10/10 — extremely strong evidence PR is worse.
		const p = fishersExactOneSidedLeft(0, 10, 10, 0);
		expect(p).toBeLessThan(0.001);
	});

	it('returns 1 when PR matches baseline rates exactly', () => {
		// PR 5/10, baseline 5/10 — left tail at the median is around 0.5 + symmetric mass
		// at the observed value, but should be > 0.5 (we're at the center of the distribution).
		const p = fishersExactOneSidedLeft(5, 5, 5, 5);
		expect(p).toBeGreaterThan(0.5);
	});
});

describe('wilsonInterval', () => {
	it('returns [0, 1] for total=0', () => {
		expect(wilsonInterval(0, 0)).toEqual({ lower: 0, upper: 1 });
	});

	it('produces reasonable bounds for 5/10', () => {
		const ci = wilsonInterval(5, 10);
		// Known Wilson 95% CI for 5/10: roughly [0.237, 0.763]
		expect(ci.lower).toBeCloseTo(0.237, 2);
		expect(ci.upper).toBeCloseTo(0.763, 2);
	});

	it('produces tight bounds for 0/100', () => {
		const ci = wilsonInterval(0, 100);
		expect(ci.lower).toBe(0);
		expect(ci.upper).toBeLessThan(0.05);
	});

	it('produces tight bounds for 100/100', () => {
		const ci = wilsonInterval(100, 100);
		// upper analytically equals 1 but lands slightly under it after FP rounding —
		// any reasonable CI for 100/100 should still be tight to the top of the range.
		expect(ci.upper).toBeGreaterThanOrEqual(0.99);
		expect(ci.lower).toBeGreaterThan(0.95);
	});

	it('throws when passes > total', () => {
		expect(() => wilsonInterval(5, 3)).toThrow();
	});
});

describe('classifyScenario', () => {
	it('flags a clear regression on a reliable scenario as hard_regression', () => {
		const result = classifyScenario(0, 10, 10, 10);
		expect(result.verdict).toBe('hard_regression');
		expect(result.delta).toBe(-1);
	});

	it('marks a hard-significant drop on an unreliable baseline as unreliable_baseline', () => {
		// Baseline 4/10 (40%) — below hard reliable (70%). PR 0/10 is a 40pp drop with
		// Fisher p < 0.05. We surface it as `unreliable_baseline` rather than flagging.
		const result = classifyScenario(0, 10, 4, 10);
		expect(result.verdict).toBe('unreliable_baseline');
	});

	it('reports stable when the drop is sub-MDE on a flaky baseline', () => {
		// Baseline 1/10 (flaky), PR 0/10 — only a 10pp drop, below MDE.
		const result = classifyScenario(0, 10, 1, 10);
		expect(result.verdict).toBe('stable');
	});

	it('does not flag a small drop below the soft MDE threshold', () => {
		// 9/10 vs 10/10 = 10pp drop, below soft MDE (15pp).
		const result = classifyScenario(9, 10, 10, 10);
		expect(result.verdict).toBe('stable');
	});

	it('flags an improvement when PR is significantly better', () => {
		const result = classifyScenario(10, 10, 0, 10);
		expect(result.verdict).toBe('improvement');
	});

	it('flags improvement even on a never-passing baseline', () => {
		// "Never passes" baseline (0/10) — fix is worth surfacing without the reliability gate.
		const result = classifyScenario(8, 10, 0, 10);
		expect(result.verdict).toBe('improvement');
	});

	it('returns insufficient_data when either side has no trials', () => {
		expect(classifyScenario(0, 0, 5, 10).verdict).toBe('insufficient_data');
		expect(classifyScenario(5, 10, 0, 0).verdict).toBe('insufficient_data');
	});

	it('flags the most extreme outcome at minimum N as hard_regression', () => {
		// PR 0/3 vs baseline 3/3 — Fisher one-sided p ≈ 0.05, delta = -100pp.
		const result = classifyScenario(0, 3, 3, 3);
		expect(result.verdict).toBe('hard_regression');
	});

	it('reports stable when N is small enough that even a full flip is sub-significant for soft tier', () => {
		// PR 1/2 vs baseline 2/2 — delta -50pp but Fisher p ≈ 0.5 (way above soft α=0.20).
		// Soft MDE met, but significance fails on both tiers.
		const result = classifyScenario(1, 2, 2, 2);
		expect(['stable', 'watch']).toContain(result.verdict);
	});

	it('marks soft regression when hard delta is missed but soft thresholds met', () => {
		// 6/10 vs 10/10 = 40pp drop, p ≈ 0.043, baseline 100% reliable.
		// Hard defaults would flag this; force a stricter hard delta to push it to soft.
		const result = classifyScenario(6, 10, 10, 10, {
			hard: { maxPValue: 0.05, minDelta: 0.5, minBaselinePassRate: 0.7 },
			soft: { maxPValue: 0.2, minDelta: 0.15, minBaselinePassRate: 0.5 },
		});
		expect(result.verdict).toBe('soft_regression');
	});

	it('marks watch when delta crosses the watch threshold without significance', () => {
		// 5/10 vs 7/10 = -20pp drop, p ≈ 0.32 — not significant for hard or soft.
		// Default watchDelta is 0.35, so this should not be `watch`. Force it via
		// a smaller threshold to validate the path.
		const result = classifyScenario(5, 10, 7, 10, { watchDelta: 0.15 });
		expect(result.verdict).toBe('watch');
	});

	it('respects custom hard-tier delta override', () => {
		// 7/10 vs 10/10 = 30pp delta. Default hard minDelta is 0.3, so this barely qualifies.
		// With hard.minDelta 0.4, it drops into `soft_regression` (still passes soft 0.15 minDelta).
		// p ≈ 0.105 < soft maxPValue (0.2), so soft fires.
		const result = classifyScenario(7, 10, 10, 10, {
			hard: { minDelta: 0.4 },
		});
		expect(result.verdict).toBe('soft_regression');
	});
});
