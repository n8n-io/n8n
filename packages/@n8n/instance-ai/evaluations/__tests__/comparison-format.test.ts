import {
	compareBuckets,
	type ComparisonOutcome,
	type ComparisonResult,
	type ExperimentBucket,
	type ScenarioCounts,
} from '../comparison/compare';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';
import type { MultiRunEvaluation, WorkflowTestCase, ScenarioResult } from '../types';

function ok(result: ComparisonResult): ComparisonOutcome {
	return { kind: 'ok', result };
}

function slugMap(evaluation: MultiRunEvaluation, slugs: string[]): Map<WorkflowTestCase, string> {
	return new Map(evaluation.testCases.map((tc, i) => [tc.testCase, slugs[i] ?? 'unknown']));
}

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
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));

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
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));

		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/1 improvement/);
		expect(md).toMatch(/#### Improvements \(1\)/);
		expect(md).toMatch(/\+100pp ↑/);
	});

	it('uses TIP alert with "0 regressions" when everything is stable', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));

		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/0 regressions/);
		expect(md).toMatch(/1 stable/);
		expect(md).not.toMatch(/#### Regressions/);
	});

	it('renders LangSmith-disabled NOTE when outcome is undefined', () => {
		const md = formatComparisonMarkdown(evalFixture);
		expect(md).toMatch(/> \[!NOTE\]/);
		expect(md).toMatch(/LangSmith disabled/);
		expect(md).not.toMatch(/#### Regressions/);
	});

	it('renders distinct alerts per skip reason', () => {
		const noBase = formatComparisonMarkdown(evalFixture, { kind: 'no_baseline' });
		expect(noBase).toMatch(/> \[!NOTE\]/);
		expect(noBase).toMatch(/No baseline configured/);

		const selfBase = formatComparisonMarkdown(evalFixture, {
			kind: 'self_baseline',
			experimentName: 'instance-ai-baseline-abc',
		});
		expect(selfBase).toMatch(/> \[!NOTE\]/);
		expect(selfBase).toMatch(/This run is the baseline/);
		expect(selfBase).toMatch(/instance-ai-baseline-abc/);

		const fetchFail = formatComparisonMarkdown(evalFixture, {
			kind: 'fetch_failed',
			error: 'LangSmith 503',
		});
		// fetch_failed is a real outage, not a benign skip — must be a WARNING.
		expect(fetchFail).toMatch(/> \[!WARNING\]/);
		expect(fetchFail).toMatch(/Regression detection did not run/);
		expect(fetchFail).toMatch(/LangSmith 503/);
	});

	it('shows mixed-case alert when both regressions and improvements exist', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3), s('b', 'happy', 3, 3)]);
		const base = bucket('master', [s('a', 'happy', 10, 10), s('b', 'happy', 0, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/> \[!CAUTION\]/);
		expect(md).toMatch(/1 regression/);
		expect(md).toMatch(/1 improvement/);
		expect(md).toMatch(/#### Regressions/);
		expect(md).toMatch(/#### Improvements/);
	});

	it('embeds commit SHA in heading when provided', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)), {
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
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/#### Failure breakdown/);
		expect(md).toMatch(/`framework_issue` 🆕/);
		expect(md).toMatch(/\*\*notable\*\*/);
	});

	it('always includes all five tier counts in the alert, split across two lines', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/0 regressions · 0 likely regressions · 0 worth watching/);
		expect(md).toMatch(/0 improvements · 1 stable · pass rate/);
	});

	it('places the pass-rate delta on the concerns line when negative', () => {
		// PR pass rate < baseline → delta is negative, so the pass-rate text
		// tails the regression-tier line instead of the wins line.
		const pr = bucket('pr', [s('a', 'happy', 1, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/regression.*pass rate -/);
		expect(md).not.toMatch(/stable · pass rate/);
	});

	it('places the pass-rate delta on the wins line when positive or zero', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 1, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/stable · pass rate \+/);
	});

	it('renders a per-scenario breakdown collapsible inside the regression section', () => {
		const evalWithFailures = evaluation({
			totalRuns: 3,
			testCases: [
				{
					prompt: 'a',
					scenarios: [
						{
							name: 'happy',
							passCount: 0,
							passes: [false, false, false],
							reasoning: 'Builder produced an unsupported node configuration',
							failureCategory: 'builder_issue',
						},
					],
				},
			],
		});
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalWithFailures, ok(compareBuckets(pr, base)), {
			slugByTestCase: slugMap(evalWithFailures, ['a']),
		});

		expect(md).toMatch(/#### Regressions \(1\)/);
		// The regression row's collapsible should appear inside the Regressions
		// section, before the per-test-case section, and carry the same slug.
		const regressionsIdx = md.indexOf('#### Regressions');
		const perTcIdx = md.indexOf('Per-test-case results');
		const breakdownIdx = md.indexOf('<code>a/happy</code>');
		expect(breakdownIdx).toBeGreaterThan(regressionsIdx);
		expect(breakdownIdx).toBeLessThan(perTcIdx);
		expect(md).toMatch(/3 of 3 failed · 3× builder_issue/);
		expect(md).toMatch(/Run 1 \[builder_issue\]: Builder produced/);
	});

	it('uses `file/scenario` slug headers in the bottom Failure details section', () => {
		const evalWithFailures = evaluation({
			totalRuns: 3,
			testCases: [
				{
					prompt: 'Build a cross-team Linear report digest',
					scenarios: [
						{
							name: 'no-cross-team-issues',
							passCount: 0,
							passes: [false, false, false],
							reasoning: 'reason',
							failureCategory: 'builder_issue',
						},
					],
				},
			],
		});
		const pr = bucket('pr', [s('cross-team-linear-report', 'no-cross-team-issues', 0, 3)]);
		const base = bucket('master', [s('cross-team-linear-report', 'no-cross-team-issues', 10, 10)]);
		const md = formatComparisonMarkdown(evalWithFailures, ok(compareBuckets(pr, base)), {
			slugByTestCase: slugMap(evalWithFailures, ['cross-team-linear-report']),
		});

		expect(md).toMatch(/<summary>Failure details<\/summary>/);
		expect(md).toMatch(/\*\*`cross-team-linear-report\/no-cross-team-issues`\*\* — 3 failed/);
	});

	it('attaches per-scenario failures to the right file slug when names collide', () => {
		// Two test cases each defining `happy-path`. Without the slug map,
		// the renderer would conflate them — Albert's review flagged this
		// exact bug. With the map, each row's collapsible carries only that
		// row's failures.
		const evalWithFailures = evaluation({
			totalRuns: 3,
			testCases: [
				{
					prompt: 'cross-team prompt',
					scenarios: [
						{
							name: 'happy-path',
							passCount: 0,
							passes: [false, false, false],
							reasoning: 'Linear node misconfigured',
							failureCategory: 'builder_issue',
						},
					],
				},
				{
					prompt: 'weather prompt',
					scenarios: [
						{
							name: 'happy-path',
							passCount: 0,
							passes: [false, false, false],
							reasoning: 'Weather mock returned empty',
							failureCategory: 'mock_issue',
						},
					],
				},
			],
		});
		const pr = bucket('pr', [
			s('cross-team-linear-report', 'happy-path', 0, 3),
			s('weather-monitoring', 'happy-path', 0, 3),
		]);
		const base = bucket('master', [
			s('cross-team-linear-report', 'happy-path', 10, 10),
			s('weather-monitoring', 'happy-path', 10, 10),
		]);
		const md = formatComparisonMarkdown(evalWithFailures, ok(compareBuckets(pr, base)), {
			slugByTestCase: slugMap(evalWithFailures, ['cross-team-linear-report', 'weather-monitoring']),
		});

		// Each per-scenario collapsible (under the regression table) must show
		// ONLY its own failures. Slice each block at its closing </details>.
		function collapsibleFor(slug: string): string {
			const open = md.indexOf(`<code>${slug}</code>`);
			expect(open).toBeGreaterThan(-1);
			const close = md.indexOf('</details>', open);
			return md.slice(open, close);
		}
		const crossTeamBlock = collapsibleFor('cross-team-linear-report/happy-path');
		const weatherBlock = collapsibleFor('weather-monitoring/happy-path');
		expect(crossTeamBlock).toMatch(/Linear node misconfigured/);
		expect(crossTeamBlock).not.toMatch(/Weather mock returned empty/);
		expect(weatherBlock).toMatch(/Weather mock returned empty/);
		expect(weatherBlock).not.toMatch(/Linear node misconfigured/);
	});

	it('uses the slug instead of the prompt in the per-test-case table', () => {
		const evalFx = evaluation({
			totalRuns: 3,
			testCases: [
				{
					prompt: 'Build a cross-team Linear report digest from open issues',
					scenarios: [{ name: 'happy', passCount: 0, passes: [false, false, false] }],
				},
			],
		});
		const pr = bucket('pr', [s('cross-team-linear-report', 'happy', 0, 3)]);
		const base = bucket('master', [s('cross-team-linear-report', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalFx, ok(compareBuckets(pr, base)), {
			slugByTestCase: slugMap(evalFx, ['cross-team-linear-report']),
		});

		// Per-test-case table cell should be the slug, not the prompt.
		const perTcSection = md.slice(md.indexOf('Per-test-case results'));
		expect(perTcSection).toMatch(/`cross-team-linear-report`/);
		expect(perTcSection).not.toMatch(/Build a cross-team Linear report digest/);
	});

	it('skips per-scenario breakdown when slugByTestCase is omitted', () => {
		// Without the slug map, the renderer can't disambiguate. We'd rather
		// drop the breakdown than show a wrong one.
		const evalWithFailures = evaluation({
			totalRuns: 3,
			testCases: [
				{
					prompt: 'a',
					scenarios: [
						{
							name: 'happy',
							passCount: 0,
							passes: [false, false, false],
							reasoning: 'Some failure',
							failureCategory: 'builder_issue',
						},
					],
				},
			],
		});
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalWithFailures, ok(compareBuckets(pr, base)));

		// Regression table still rendered.
		expect(md).toMatch(/#### Regressions \(1\)/);
		// But no per-scenario collapsible (which would have used <code>a/happy</code>
		// with the breakdown summary text).
		expect(md).not.toMatch(/3 of 3 failed · 3× builder_issue/);
	});

	it('renders the failure breakdown for non-notable categories with non-zero counts', () => {
		// 50/100 vs 50/100 — no scenario regression, but still has builder_issue
		// counts on both sides (non-notable but non-zero).
		const pr: ExperimentBucket = {
			experimentName: 'pr',
			scenarios: new Map([['a/happy', { ...s('a', 'happy', 50, 100) }]]),
			failureCategoryTotals: { builder_issue: 25 },
			trialTotal: 100,
		};
		const base: ExperimentBucket = {
			experimentName: 'master',
			scenarios: new Map([['a/happy', { ...s('a', 'happy', 50, 100) }]]),
			failureCategoryTotals: { builder_issue: 22 },
			trialTotal: 100,
		};
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/#### Failure breakdown/);
		expect(md).toMatch(/`builder_issue`/);
		// builder_issue isn't notable here, so no "notable" marker.
		expect(md).not.toMatch(/builder_issue.*notable/);
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
		const out = formatComparisonTerminal(evalFixture, ok(compareBuckets(pr, base)));
		expect(out).toMatch(/^Instance AI Workflow Eval/);
		expect(out).toMatch(/▶ 1 regression/);
		expect(out).toMatch(/PR\s{8}0\.0%/);
		expect(out).toMatch(/baseline\s{2}100\.0%/);
		expect(out).toMatch(/REGRESSIONS/);
		expect(out).toMatch(/a\/happy/);
		expect(out).not.toMatch(/^###/m);
		expect(out).not.toMatch(/\| /);
	});

	it('renders LangSmith-disabled message when outcome is undefined', () => {
		const out = formatComparisonTerminal(evalFixture);
		expect(out).toMatch(/LangSmith disabled/);
		expect(out).not.toMatch(/REGRESSIONS/);
	});

	it('shows partial banner when scenarios differ on each side', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10), s('b', 'happy', 5, 10)]);
		const out = formatComparisonTerminal(evalFixture, ok(compareBuckets(pr, base)));
		expect(out).toMatch(/partial: 1 baseline scenarios not run by PR/);
	});
});
