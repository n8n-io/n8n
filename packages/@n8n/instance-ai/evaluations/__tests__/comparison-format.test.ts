import { compareBuckets, type ExperimentBucket, type ScenarioCounts } from '../comparison/compare';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';
import type { MultiRunEvaluation, WorkflowTestCase, ScenarioResult } from '../types';

function bucket(name: string, scenarios: ScenarioCounts[]): ExperimentBucket {
	return {
		experimentName: name,
		scenarios: new Map(scenarios.map((s) => [`${s.testCaseFile}/${s.scenarioName}`, s])),
	};
}

function s(file: string, scenario: string, passed: number, total: number): ScenarioCounts {
	return { testCaseFile: file, scenarioName: scenario, passed, total };
}

/** Minimal evaluation fixture matching the shape format.ts reads. */
function evaluation(
	opts: {
		totalRuns?: number;
		testCases?: Array<{
			prompt?: string;
			buildSuccessCount?: number;
			scenarios?: Array<{
				name: string;
				passCount: number;
				passes: boolean[]; // per-iteration pass/fail
				reasoning?: string;
				failureCategory?: string;
			}>;
		}>;
	} = {},
): MultiRunEvaluation {
	const totalRuns = opts.totalRuns ?? 3;
	return {
		totalRuns,
		testCases: (opts.testCases ?? []).map((tc) => {
			const testCase = {
				prompt: tc.prompt ?? 'Test workflow prompt',
				complexity: 'medium' as const,
				tags: [],
				scenarios: (tc.scenarios ?? []).map((sa) => ({
					name: sa.name,
					description: '',
					dataSetup: '',
					successCriteria: '',
				})),
			} as WorkflowTestCase;
			const buildSuccessCount = tc.buildSuccessCount ?? totalRuns;
			const scenarios = (tc.scenarios ?? []).map((sa) => ({
				scenario: testCase.scenarios.find((sc) => sc.name === sa.name)!,
				passCount: sa.passCount,
				passRate: totalRuns > 0 ? sa.passCount / totalRuns : 0,
				passAtK: new Array(totalRuns).fill(sa.passCount > 0 ? 1 : 0) as number[],
				passHatK: new Array(totalRuns).fill(sa.passCount === totalRuns ? 1 : 0) as number[],
				runs: sa.passes.map(
					(passed): ScenarioResult => ({
						scenario: testCase.scenarios.find((sc) => sc.name === sa.name)!,
						success: passed,
						score: passed ? 1 : 0,
						reasoning: sa.reasoning ?? '',
						failureCategory: !passed ? sa.failureCategory : undefined,
					}),
				),
			}));
			return {
				testCase,
				workflowBuildSuccess: buildSuccessCount > 0,
				scenarioResults: [],
				scenarios,
				runs: new Array(totalRuns).fill(null).map(() => ({
					testCase,
					workflowBuildSuccess: buildSuccessCount > 0,
					scenarioResults: [],
				})),
				buildSuccessCount,
			};
		}),
	};
}

describe('formatComparisonMarkdown', () => {
	const evalFixture = evaluation({
		totalRuns: 3,
		testCases: [
			{
				prompt: 'a',
				scenarios: [{ name: 'happy', passCount: 0, passes: [false, false, false] }],
			},
		],
	});

	it('renders heading, alert, aggregate, and a regression table', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base));

		expect(md).toMatch(/### Instance AI Workflow Eval/);
		expect(md).toMatch(/> \[!CAUTION\]/);
		expect(md).toMatch(/1 regression/);
		expect(md).toMatch(/\*\*Aggregate\*\*: 0\.0% PR vs 100\.0% baseline/);
		expect(md).toMatch(/#### Regressions \(1\)/);
		expect(md).toMatch(/`a\/happy`/);
		expect(md).toMatch(/0\/3 \(0%\)/);
		expect(md).toMatch(/-100pp ↓/);
	});

	it('uses TIP alert when there are only improvements', () => {
		const pr = bucket('pr', [s('a', 'happy', 3, 3)]);
		const base = bucket('master', [s('a', 'happy', 0, 10)]);
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base));

		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/1 improvement/);
		expect(md).toMatch(/#### Improvements \(1\)/);
		expect(md).toMatch(/\+100pp ↑/);
	});

	it('uses TIP alert with "No regressions" when everything is stable', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base));

		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/No regressions/);
		expect(md).not.toMatch(/#### Regressions/);
	});

	it('renders no-baseline NOTE when comparison is undefined', () => {
		const md = formatComparisonMarkdown(evalFixture);
		expect(md).toMatch(/> \[!NOTE\]/);
		expect(md).toMatch(/No baseline configured/);
		expect(md).not.toMatch(/#### Regressions/);
	});

	it('shows mixed-case alert when both regressions and improvements exist', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3), s('b', 'happy', 3, 3)]);
		const base = bucket('master', [s('a', 'happy', 10, 10), s('b', 'happy', 0, 10)]);
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base));
		expect(md).toMatch(/> \[!CAUTION\]/);
		expect(md).toMatch(/1 regression/);
		expect(md).toMatch(/1 improvement/);
		expect(md).toMatch(/#### Regressions/);
		expect(md).toMatch(/#### Improvements/);
	});

	it('embeds commit SHA in heading when provided', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base), {
			commitSha: 'abc1234567890def',
		});
		expect(md).toMatch(/### Instance AI Workflow Eval — `abc12345`/);
	});

	it('marks new failure categories with 🆕', () => {
		const pr: ExperimentBucket = {
			experimentName: 'pr',
			scenarios: new Map([['a/happy', { ...s('a', 'happy', 0, 3) }]]),
			failureCategoryTotals: { framework_issue: 9 },
			trialTotal: 145,
		};
		const base: ExperimentBucket = {
			experimentName: 'master',
			scenarios: new Map([['a/happy', { ...s('a', 'happy', 5, 10) }]]),
			failureCategoryTotals: { framework_issue: 0 },
			trialTotal: 290,
		};
		const md = formatComparisonMarkdown(evalFixture, compareBuckets(pr, base));
		expect(md).toMatch(/#### Failure types shifted/);
		expect(md).toMatch(/`framework_issue` 🆕/);
	});
});

describe('formatComparisonTerminal', () => {
	const evalFixture = evaluation({
		totalRuns: 3,
		testCases: [
			{
				prompt: 'a',
				scenarios: [{ name: 'happy', passCount: 0, passes: [false, false, false] }],
			},
		],
	});

	it('renders title, verdict, aggregate, and regression table without markdown syntax', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const out = formatComparisonTerminal(evalFixture, compareBuckets(pr, base));
		expect(out).toMatch(/^Instance AI Workflow Eval/);
		expect(out).toMatch(/▶ 1 regression/);
		expect(out).toMatch(/PR\s{8}0\.0%/);
		expect(out).toMatch(/baseline\s{2}100\.0%/);
		expect(out).toMatch(/REGRESSIONS/);
		expect(out).toMatch(/a\/happy/);
		expect(out).not.toMatch(/^###/m);
		expect(out).not.toMatch(/\| /);
	});

	it('renders no-baseline message when comparison is undefined', () => {
		const out = formatComparisonTerminal(evalFixture);
		expect(out).toMatch(/No baseline configured/);
		expect(out).not.toMatch(/REGRESSIONS/);
	});

	it('shows partial banner when scenarios differ on each side', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10), s('b', 'happy', 5, 10)]);
		const out = formatComparisonTerminal(evalFixture, compareBuckets(pr, base));
		expect(out).toMatch(/partial: 1 baseline-only/);
	});
});
