import { compareBuckets, type ExperimentBucket, type ScenarioCounts } from '../comparison/compare';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';

function bucket(name: string, scenarios: ScenarioCounts[]): ExperimentBucket {
	return {
		experimentName: name,
		scenarios: new Map(scenarios.map((s) => [`${s.testCaseFile}/${s.scenarioName}`, s])),
	};
}

function s(file: string, scenario: string, passed: number, total: number): ScenarioCounts {
	return { testCaseFile: file, scenarioName: scenario, passed, total };
}

describe('formatComparisonMarkdown', () => {
	it('renders aggregate header and scenario tables for a regression', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 10)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(compareBuckets(pr, base));
		expect(md).toMatch(/### vs Baseline `master-abc`/);
		expect(md).toMatch(/PR 0\.0% vs baseline 100\.0%/);
		expect(md).toMatch(/#### Regressions/);
		expect(md).toMatch(/a \/ happy/);
	});

	it('renders the no-movement message when nothing crossed the noise floor', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(compareBuckets(pr, base));
		expect(md).toMatch(/No scenarios moved beyond the noise floor/);
	});

	it('shows a partial-comparison banner when scenarios are missing on one side', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10), s('b', 'happy', 5, 10)]);
		const md = formatComparisonMarkdown(compareBuckets(pr, base));
		expect(md).toMatch(/Partial comparison/);
		expect(md).toMatch(/1 in baseline not run by PR/);
	});
});

describe('formatComparisonTerminal', () => {
	it('renders the title, aggregate, and a regression table without markdown syntax', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 10)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const out = formatComparisonTerminal(compareBuckets(pr, base));

		expect(out).toMatch(/^vs baseline master-abc/);
		expect(out).toMatch(/aggregate \(1 of 1 scenarios\)/);
		expect(out).toMatch(/0\.0% PR vs 100\.0% baseline/);
		expect(out).toMatch(/REGRESSIONS/);
		expect(out).toMatch(/a\/happy/);
		// Should not contain markdown structural syntax.
		expect(out).not.toMatch(/^###/m);
		expect(out).not.toMatch(/\| /);
	});

	it('renders the no-movement message when nothing crossed the noise floor', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const out = formatComparisonTerminal(compareBuckets(pr, base));
		expect(out).toMatch(/No scenarios moved beyond the noise floor/);
	});

	it('shows a partial line and includes the total scenario count in the aggregate', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10), s('b', 'happy', 5, 10)]);
		const out = formatComparisonTerminal(compareBuckets(pr, base));
		expect(out).toMatch(/aggregate \(1 of 2 scenarios\)/);
		expect(out).toMatch(/partial: 1 baseline scenarios not run by PR/);
	});
});
