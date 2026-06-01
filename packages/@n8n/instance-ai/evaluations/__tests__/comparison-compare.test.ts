import { compareBuckets, type ExperimentBucket, type ScenarioCounts } from '../comparison/compare';

function bucket(
	name: string,
	scenarios: ScenarioCounts[],
	categories?: { totals: Record<string, number>; trialTotal: number },
): ExperimentBucket {
	return {
		experimentName: name,
		scenarios: new Map(scenarios.map((s) => [`${s.testCaseFile}/${s.scenarioName}`, s])),
		failureCategoryTotals: categories?.totals,
		trialTotal: categories?.trialTotal,
	};
}

function s(file: string, scenario: string, passed: number, total: number): ScenarioCounts {
	return { testCaseFile: file, scenarioName: scenario, passed, total };
}

describe('compareBuckets', () => {
	it('produces a clean intersection when both sides have the same scenarios', () => {
		const pr = bucket('pr', [s('contact', 'happy', 8, 10), s('weather', 'happy', 1, 10)]);
		const base = bucket('master', [s('contact', 'happy', 9, 10), s('weather', 'happy', 0, 10)]);

		const result = compareBuckets(pr, base);

		expect(result.scenarios).toHaveLength(2);
		expect(result.prOnly).toEqual([]);
		expect(result.baselineOnly).toEqual([]);
		expect(result.aggregate.intersectionSize).toBe(2);
	});

	it('flags scenarios only present on one side', () => {
		const pr = bucket('pr', [s('contact', 'happy', 5, 10)]);
		const base = bucket('master', [s('contact', 'happy', 8, 10), s('weather', 'happy', 5, 10)]);

		const result = compareBuckets(pr, base);

		expect(result.scenarios).toHaveLength(1);
		expect(result.scenarios[0].testCaseFile).toBe('contact');
		expect(result.baselineOnly).toEqual([{ testCaseFile: 'weather', scenarioName: 'happy' }]);
		expect(result.prOnly).toEqual([]);
	});

	it('aggregates only over the intersection, not over baseline-only or pr-only', () => {
		const pr = bucket('pr', [s('contact', 'happy', 10, 10)]);
		const base = bucket('master', [s('contact', 'happy', 5, 10), s('other', 'happy', 0, 10)]);

		const result = compareBuckets(pr, base);

		expect(result.aggregate.prAggregatePassRate).toBe(1);
		expect(result.aggregate.baselineAggregatePassRate).toBe(0.5);
		expect(result.aggregate.intersectionSize).toBe(1);
	});

	it('sorts scenarios with regressions first, then improvements, then stable', () => {
		const pr = bucket('pr', [
			s('a', 'stable', 10, 10),
			s('b', 'regression', 0, 10),
			s('c', 'improvement', 10, 10),
		]);
		const base = bucket('master', [
			s('a', 'stable', 10, 10),
			s('b', 'regression', 10, 10),
			s('c', 'improvement', 0, 10),
		]);

		const result = compareBuckets(pr, base);
		expect(result.scenarios.map((sc) => sc.scenarioName)).toEqual([
			'regression',
			'improvement',
			'stable',
		]);
	});

	it('returns insufficient_data when one side has zero trials for a scenario', () => {
		const pr = bucket('pr', [s('contact', 'happy', 0, 0)]);
		const base = bucket('master', [s('contact', 'happy', 10, 10)]);

		const result = compareBuckets(pr, base);
		expect(result.scenarios[0].verdict).toBe('insufficient_data');
	});

	it('returns no failure-category drift when either side lacks category totals', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		expect(compareBuckets(pr, base).failureCategories).toEqual([]);
	});

	it('flags a category as notable when both rate and trial-count gaps clear the bars', () => {
		// Haiku-style shift: framework_issue 0/290 → 9/145.
		// Rate gap: 6.2pp ≥ 5pp ✓.  Expected PR count given baseline = 0 × (145/290) = 0; |9 − 0| = 9 ≥ 3 ✓.
		const pr = bucket('pr', [s('a', 'happy', 50, 145)], {
			totals: { framework_issue: 9 },
			trialTotal: 145,
		});
		const base = bucket('master', [s('a', 'happy', 200, 290)], {
			totals: { framework_issue: 0 },
			trialTotal: 290,
		});
		const cats = compareBuckets(pr, base).failureCategories;
		const fw = cats.find((c) => c.category === 'framework_issue');
		expect(fw?.notable).toBe(true);
	});

	it('does not flag when the rate gap is below the 5pp bar', () => {
		// 3/100 vs 2/100 = 1pp gap, count gap = 1 — neither bar cleared.
		const pr = bucket('pr', [s('a', 'happy', 50, 100)], {
			totals: { mock_issue: 3 },
			trialTotal: 100,
		});
		const base = bucket('master', [s('a', 'happy', 50, 100)], {
			totals: { mock_issue: 2 },
			trialTotal: 100,
		});
		const cats = compareBuckets(pr, base).failureCategories;
		expect(cats.find((c) => c.category === 'mock_issue')?.notable).toBe(false);
	});

	it('does not flag when the rate gap is large but the count gap is tiny (small N guard)', () => {
		// PR 1/3 vs baseline 0/270 — rate gap = 33pp ≥ 5pp, but expected PR count = 0
		// and observed = 1, count gap = 1 < 3. Should NOT flag — single trial on small N.
		const pr = bucket('pr', [s('a', 'happy', 0, 3)], {
			totals: { builder_issue: 1 },
			trialTotal: 3,
		});
		const base = bucket('master', [s('a', 'happy', 270, 270)], {
			totals: { builder_issue: 0 },
			trialTotal: 270,
		});
		const cats = compareBuckets(pr, base).failureCategories;
		expect(cats.find((c) => c.category === 'builder_issue')?.notable).toBe(false);
	});

	it('drops unknown categories with a console warning, keeps all known categories', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const pr = bucket('pr', [s('a', 'happy', 8, 10)], {
			totals: { '-': 5, builder_issue: 2 },
			trialTotal: 10,
		});
		const base = bucket('master', [s('a', 'happy', 8, 10)], {
			totals: { builder_issue: 1 },
			trialTotal: 10,
		});
		const cats = compareBuckets(pr, base).failureCategories;
		// All five known categories are always present (some at 0/0 — renderer
		// drops those). The unknown `-` category is dropped here with a warning.
		expect(cats.map((c) => c.category).sort()).toEqual([
			'build_failure',
			'builder_issue',
			'framework_issue',
			'mock_issue',
			'verification_failure',
		]);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"-"'));
		warn.mockRestore();
	});

	it('sorts notable categories before non-notable, then by absolute delta', () => {
		const pr = bucket('pr', [s('a', 'happy', 50, 100)], {
			totals: { framework_issue: 10, mock_issue: 4, builder_issue: 25 },
			trialTotal: 100,
		});
		const base = bucket('master', [s('a', 'happy', 50, 100)], {
			totals: { framework_issue: 0, mock_issue: 3, builder_issue: 22 },
			trialTotal: 100,
		});
		const cats = compareBuckets(pr, base).failureCategories;
		// framework_issue is the only notable one (rate gap 10pp, count gap 10).
		expect(cats[0].category).toBe('framework_issue');
		expect(cats[0].notable).toBe(true);
		expect(cats.slice(1).every((c) => !c.notable)).toBe(true);
	});

	it('accepts custom tiered thresholds for tests', () => {
		const pr = bucket('pr', [s('a', 'happy', 5, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);

		// Defaults: 5/10 vs 8/10 = -30pp drop, p ≈ 0.18 → soft_regression
		// (passes soft maxPValue=0.20, soft minDelta=0.15, baseline 80% above soft 50%).
		const defaults = compareBuckets(pr, base);
		expect(defaults.scenarios[0].verdict).toBe('soft_regression');

		// Stricter soft p-value cutoff excludes this case.
		const stricter = compareBuckets(pr, base, {
			soft: { maxPValue: 0.1, minDelta: 0.15, minBaselinePassRate: 0.5 },
		});
		expect(['stable', 'watch']).toContain(stricter.scenarios[0].verdict);
	});
});
