import {
	compareBuckets,
	unitKeyOf,
	type ComparisonOutcome,
	type ComparisonResult,
	type EvaluationUnitCounts,
	type ExperimentBucket,
} from '../comparison/compare';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';
import type {
	MultiRunEvaluation,
	WorkflowTestCase,
	ExecutionScenarioResult,
	BuildExpectationResult,
} from '../types';

function ok(result: ComparisonResult): ComparisonOutcome {
	return { kind: 'ok', result };
}

function slugMap(evaluation: MultiRunEvaluation, slugs: string[]): Map<WorkflowTestCase, string> {
	return new Map(evaluation.testCases.map((tc, i) => [tc.testCase, slugs[i] ?? 'unknown']));
}

function bucket(name: string, units: EvaluationUnitCounts[]): ExperimentBucket {
	return {
		experimentName: name,
		evaluationUnits: new Map(units.map((u) => [unitKeyOf(u), u])),
	};
}

function s(file: string, scenario: string, passed: number, total: number): EvaluationUnitCounts {
	return { kind: 'scenario', testCaseFile: file, name: scenario, passed, total };
}

function e(file: string, expectation: string, passed: number, total: number): EvaluationUnitCounts {
	return { kind: 'expectation', testCaseFile: file, name: expectation, passed, total };
}

/** Minimal evaluation fixture matching the shape format.ts reads. */
function evaluation(
	opts: {
		totalRuns?: number;
		testCases?: Array<{
			userText?: string;
			buildSuccessCount?: number;
			buildError?: string;
			scenarios?: Array<{
				name: string;
				passCount: number;
				passes: boolean[]; // per-iteration pass/fail
				reasoning?: string;
				failureCategory?: string;
			}>;
			expectations?: Array<{
				text: string;
				passes: Array<boolean | 'incomplete'>;
			}>;
		}>;
	} = {},
): MultiRunEvaluation {
	const totalRuns = opts.totalRuns ?? 3;
	return {
		totalRuns,
		testCases: (opts.testCases ?? []).map((tc) => {
			const testCase = {
				conversation: [{ role: 'user', text: tc.userText ?? 'Test workflow prompt' }],
				complexity: 'medium' as const,
				tags: [],
				executionScenarios: (tc.scenarios ?? []).map((sa) => ({
					name: sa.name,
					description: '',
					dataSetup: '',
					successCriteria: '',
				})),
			} as WorkflowTestCase;
			const buildSuccessCount = tc.buildSuccessCount ?? totalRuns;
			const scenarios = (tc.scenarios ?? []).map((sa) => ({
				scenario: testCase.executionScenarios.find((sc) => sc.name === sa.name)!,
				evaluatedCount: sa.passes.length,
				passCount: sa.passCount,
				passRate: totalRuns > 0 ? sa.passCount / totalRuns : 0,
				passAtK: new Array(totalRuns).fill(sa.passCount > 0 ? 1 : 0) as number[],
				passHatK: new Array(totalRuns).fill(sa.passCount === totalRuns ? 1 : 0) as number[],
				runs: sa.passes.map(
					(passed): ExecutionScenarioResult => ({
						scenario: testCase.executionScenarios.find((sc) => sc.name === sa.name)!,
						success: passed,
						score: passed ? 1 : 0,
						reasoning: sa.reasoning ?? '',
						failureCategory: !passed ? sa.failureCategory : undefined,
					}),
				),
			}));
			const buildExpectations = (tc.expectations ?? []).map((ea) => {
				const runs = ea.passes.map(
					(pass): BuildExpectationResult => ({
						expectation: ea.text,
						pass: pass === true,
						reason: pass === 'incomplete' ? '' : 'reason',
						...(pass === 'incomplete' ? { incomplete: true } : {}),
					}),
				);
				const evaluated = runs.filter((run) => !run.incomplete);
				const passCount = evaluated.filter((run) => run.pass).length;
				return {
					expectation: ea.text,
					runs,
					evaluatedCount: evaluated.length,
					passCount,
					passRate: evaluated.length > 0 ? passCount / evaluated.length : 0,
					passAtK: new Array(evaluated.length).fill(passCount > 0 ? 1 : 0) as number[],
					passHatK: new Array(evaluated.length).fill(
						passCount === evaluated.length ? 1 : 0,
					) as number[],
				};
			});
			return {
				testCase,
				workflowBuildSuccess: buildSuccessCount > 0,
				executionScenarioResults: [],
				executionScenarios: scenarios,
				runs: new Array(totalRuns).fill(null).map((_, runIndex) => ({
					testCase,
					workflowBuildSuccess: buildSuccessCount > 0,
					executionScenarioResults: [],
					buildError: tc.buildError,
					buildExpectationResults: buildExpectations.flatMap((ea) => {
						const result = ea.runs[runIndex];
						return result ? [result] : [];
					}),
				})),
				buildSuccessCount,
				buildExpectations,
				status:
					scenarios.some((sa) => sa.evaluatedCount > 0) ||
					buildExpectations.some((ea) => ea.evaluatedCount > 0)
						? ('verified' as const)
						: ('notVerified' as const),
			};
		}),
	};
}

describe('formatComparisonMarkdown', () => {
	const evalFixture = evaluation({
		totalRuns: 3,
		testCases: [
			{
				userText: 'a',
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

	it('renders run-level pass metrics and the LangSmith experiment link when provided', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)), {
			passMetrics: { passAtK: 0.892, passHatK: 0.757 },
			experimentUrl:
				'https://eu.smith.langchain.com/o/org-1/datasets/ds-1/compare?selectedSessions=sess-1',
		});

		expect(md).toContain(
			'_pass@3 89.2% · pass^3 75.7% · [LangSmith experiment](https://eu.smith.langchain.com/o/org-1/datasets/ds-1/compare?selectedSessions=sess-1)_',
		);
		// Rendered inside the header area, above the regression tables.
		expect(md.indexOf('_pass@3 89.2%')).toBeLessThan(md.indexOf('#### Regressions'));
	});

	it('omits the run-meta line entirely when neither metrics nor URL are provided', () => {
		const pr = bucket('pr', [s('a', 'happy', 0, 3)]);
		const base = bucket('master-abc', [s('a', 'happy', 10, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));

		// The per-test-case table legitimately mentions pass@3 — assert only the
		// meta line (leading underscore) is absent.
		expect(md).not.toMatch(/_pass@3 /);
		expect(md).not.toContain('LangSmith experiment');
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

	it('counts build expectations in no-baseline build-only summaries', () => {
		const buildOnly = evaluation({
			totalRuns: 1,
			testCases: [
				{
					userText: 'Build a workflow and ask a follow-up',
					expectations: [
						{ text: 'The workflow was built', passes: [true] },
						{ text: 'The follow-up was asked', passes: [true] },
					],
				},
			],
		});
		const slugs = slugMap(buildOnly, ['build-only']);

		const md = formatComparisonMarkdown(
			buildOnly,
			{ kind: 'no_baseline' },
			{ slugByTestCase: slugs },
		);
		expect(md).toContain(
			'**Aggregate**: 100.0% pass (2/2 trials, 0 scenarios + 2 expectations, N=1)',
		);
		expect(md).toMatch(/\| `build-only` \| CHECKED \| 2\/2 \|/);

		const terminal = formatComparisonTerminal(
			buildOnly,
			{ kind: 'no_baseline' },
			{
				slugByTestCase: slugs,
			},
		);
		expect(terminal).toContain(
			'Aggregate: 100.0% pass (2/2 trials, 0 scenarios + 2 expectations, N=1)',
		);
	});

	it('counts outcome expectations in no-baseline build-only summaries', () => {
		const buildOnly = evaluation({
			totalRuns: 1,
			testCases: [
				{
					userText: 'Build an agent',
					expectations: [
						{ text: 'An agent was created', passes: [true] },
						{ text: 'No workflow was built', passes: [true] },
					],
				},
			],
		});
		const slugs = slugMap(buildOnly, ['build-only']);

		const md = formatComparisonMarkdown(
			buildOnly,
			{ kind: 'no_baseline' },
			{ slugByTestCase: slugs },
		);
		expect(md).toContain(
			'**Aggregate**: 100.0% pass (2/2 trials, 0 scenarios + 2 expectations, N=1)',
		);
		expect(md).toMatch(/\| `build-only` \| CHECKED \| 2\/2 \|/);

		const terminal = formatComparisonTerminal(
			buildOnly,
			{ kind: 'no_baseline' },
			{
				slugByTestCase: slugs,
			},
		);
		expect(terminal).toContain(
			'Aggregate: 100.0% pass (2/2 trials, 0 scenarios + 2 expectations, N=1)',
		);
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

	it('omits commit SHA from the PR-comment heading even when provided', () => {
		const pr = bucket('pr', [s('a', 'happy', 8, 10)]);
		const base = bucket('master', [s('a', 'happy', 8, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)), {
			commitSha: 'abc1234567890def',
		});
		expect(md).toContain('### Instance AI Workflow Eval');
		expect(md).not.toContain('abc12345');
	});

	it('renders a self-seeded re-run command and button when a rerun hint is given', () => {
		const md = formatComparisonMarkdown(
			evalFixture,
			{ kind: 'no_baseline' },
			{
				rerun: {
					prNumber: '4242',
					dispatchUrl: 'https://github.com/n8n-io/n8n/actions/workflows/ci-instance-ai-evals.yml',
				},
			},
		);
		expect(md).toContain('does not re-run on new commits');
		expect(md).toContain('gh workflow run ci-instance-ai-evals.yml -f pr=4242');
		expect(md).toContain(
			'[Run workflow button](https://github.com/n8n-io/n8n/actions/workflows/ci-instance-ai-evals.yml)',
		);
		expect(md).toContain('**pr** = `4242`');
	});

	it('falls back to a generic re-run instruction when no rerun hint is given', () => {
		const md = formatComparisonMarkdown(evalFixture, { kind: 'no_baseline' });
		expect(md).toContain('does not re-run on new commits');
		expect(md).toContain('dispatching the **Instance AI Evals: PR Gate** workflow');
		expect(md).not.toContain('gh workflow run');
	});

	it('renders the Workflow checks table when at least one run has outcomes', () => {
		const withChecks = evaluation({
			totalRuns: 2,
			testCases: [
				{
					userText: 'workflow with checks',
					scenarios: [{ name: 'happy', passCount: 2, passes: [true, true] }],
				},
			],
		});
		withChecks.testCases[0].runs[0].workflowChecks = [
			{
				name: 'has_trigger',
				description: 'd',
				kind: 'deterministic',
				dimension: 'structure',
				status: 'pass',
			},
			{
				name: 'valid_field_references',
				description: 'd',
				kind: 'deterministic',
				dimension: 'parameter_correctness',
				status: 'pass',
			},
			{
				name: 'agent_has_language_model',
				description: 'd',
				kind: 'deterministic',
				dimension: 'ai_nodes',
				status: 'n_a',
			},
			{
				name: 'fulfills_user_request',
				description: 'd',
				kind: 'llm',
				dimension: 'intent_match',
				status: 'error',
				comment: 'LLM check "fulfills_user_request" timed out after 30000ms',
			},
		];
		withChecks.testCases[0].runs[1].workflowChecks = [
			{
				name: 'has_trigger',
				description: 'd',
				kind: 'deterministic',
				dimension: 'structure',
				status: 'pass',
			},
			{
				name: 'valid_field_references',
				description: 'd',
				kind: 'deterministic',
				dimension: 'parameter_correctness',
				status: 'fail',
			},
			{
				name: 'agent_has_language_model',
				description: 'd',
				kind: 'deterministic',
				dimension: 'ai_nodes',
				status: 'n_a',
			},
			{
				name: 'fulfills_user_request',
				description: 'd',
				kind: 'llm',
				dimension: 'intent_match',
				status: 'pass',
			},
		];

		const md = formatComparisonMarkdown(withChecks, { kind: 'no_baseline' });

		expect(md).toMatch(/#### Workflow checks/);
		expect(md).toMatch(/Scored over 2 successful build/);
		expect(md).toMatch(/`has_trigger`/);
		expect(md).toMatch(/`valid_field_references`/);
		expect(md).toMatch(/`agent_has_language_model`/);
		// has_trigger → 2 pass, 0 fail, 0 N/A, 0 errors
		expect(md).toMatch(
			/\| `structure` \| `has_trigger` \| deterministic \| 2 \| 0 \| 0 \| 0 \| 100% \|/,
		);
		// valid_field_references → 1 pass, 1 fail, 0 N/A, 0 errors → 50%
		expect(md).toMatch(
			/\| `parameter_correctness` \| `valid_field_references` \| deterministic \| 1 \| 1 \| 0 \| 0 \| 50% \|/,
		);
		// agent_has_language_model → 0/0 scored, 2 N/A
		expect(md).toMatch(
			/\| `ai_nodes` \| `agent_has_language_model` \| deterministic \| 0 \| 0 \| 2 \| 0 \| — \|/,
		);
		// fulfills_user_request → the errored run stays out of the denominator: 1/1 scored → 100%
		expect(md).toMatch(
			/\| `intent_match` \| `fulfills_user_request` \| llm \| 1 \| 0 \| 0 \| 1 \| 100% \|/,
		);
	});

	it('omits the Workflow checks section when no run has outcomes', () => {
		const md = formatComparisonMarkdown(evalFixture, { kind: 'no_baseline' });
		expect(md).not.toMatch(/#### Workflow checks/);
	});

	it('marks new failure categories with 🆕', () => {
		const pr: ExperimentBucket = {
			experimentName: 'pr',
			evaluationUnits: new Map([['a/happy', { ...s('a', 'happy', 0, 3) }]]),
			failureCategoryTotals: { framework_issue: 9 },
			trialTotal: 145,
		};
		const base: ExperimentBucket = {
			experimentName: 'master',
			evaluationUnits: new Map([['a/happy', { ...s('a', 'happy', 5, 10) }]]),
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
					userText: 'a',
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
					userText: 'Build a cross-team Linear report digest',
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

		expect(md).toMatch(/<summary>Failures \(1\)<\/summary>/);
		expect(md).toMatch(/\*\*`cross-team-linear-report\/no-cross-team-issues`\*\* — passed 0\/3/);
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
					userText: 'cross-team prompt',
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
					userText: 'weather prompt',
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
					userText: 'Build a cross-team Linear report digest from open issues',
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
					userText: 'a',
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
			evaluationUnits: new Map([['a/happy', { ...s('a', 'happy', 50, 100) }]]),
			failureCategoryTotals: { builder_issue: 25 },
			trialTotal: 100,
		};
		const base: ExperimentBucket = {
			experimentName: 'master',
			evaluationUnits: new Map([['a/happy', { ...s('a', 'happy', 50, 100) }]]),
			failureCategoryTotals: { builder_issue: 22 },
			trialTotal: 100,
		};
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));
		expect(md).toMatch(/#### Failure breakdown/);
		expect(md).toMatch(/`builder_issue`/);
		// builder_issue isn't notable here, so no "notable" marker.
		expect(md).not.toMatch(/builder_issue.*notable/);
	});

	it('renders expectation units in the regression tiers with the file :: text label', () => {
		const evalWithExpectation = evaluation({
			totalRuns: 3,
			testCases: [
				{
					userText: 'a',
					expectations: [{ text: 'asks before building anything', passes: [false, false, false] }],
				},
			],
		});
		const pr = bucket('pr', [e('a', 'asks before building anything', 0, 3)]);
		const base = bucket('master', [e('a', 'asks before building anything', 10, 10)]);
		const md = formatComparisonMarkdown(evalWithExpectation, ok(compareBuckets(pr, base)), {
			slugByTestCase: slugMap(evalWithExpectation, ['a']),
		});

		expect(md).toMatch(/#### Regressions \(1\)/);
		expect(md).toMatch(/\| Unit \| PR \| Baseline \| Δ \| p \|/);
		expect(md).toContain('`a :: asks before building anything`');
		// The expectation row gets its own failure-breakdown collapsible with judge text.
		expect(md).toContain('<code>a :: asks before building anything</code>');
		expect(md).toMatch(/3 of 3 failed/);
	});

	it('labels the with-baseline aggregate with the unit mix and flags expectations missing a baseline', () => {
		const pr = bucket('pr', [
			s('a', 'happy', 8, 10),
			e('a', 'asks first', 9, 10),
			e('a', 'stays quiet', 10, 10),
		]);
		const base = bucket('master', [s('a', 'happy', 8, 10), e('a', 'asks first', 9, 10)]);
		const md = formatComparisonMarkdown(evalFixture, ok(compareBuckets(pr, base)));

		expect(md).toContain('2 units (1 scenario + 1 expectation)');
		expect(md).toContain(
			'1 PR expectations have no baseline data (baseline predates expectation persistence)',
		);
	});
});

describe('formatComparisonTerminal', () => {
	const evalFixture = evaluation({
		totalRuns: 3,
		testCases: [
			{
				userText: 'a',
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

	it('does not render workflow build failure text for process-only checks', () => {
		const agentsEval = evaluation({
			totalRuns: 1,
			testCases: [
				{
					userText: 'workflow-scheduled-weather-and-agent',
					buildSuccessCount: 0,
					buildError: "Agent response: Here's the intent I'd detect",
					expectations: [{ text: 'classifies the request intent', passes: [true] }],
				},
			],
		});

		const out = formatComparisonTerminal(agentsEval);

		expect(out).toMatch(/CHECKED/);
		expect(out).not.toMatch(/BUILD FAILED/);
		expect(out).not.toMatch(/Agent response/);
	});

	it('counts evaluated expectations in the terminal aggregate', () => {
		const agentsEval = evaluation({
			totalRuns: 1,
			testCases: [
				{
					userText: 'workflow-scheduled-weather-and-agent',
					buildSuccessCount: 0,
					expectations: [
						{ text: 'does not build', passes: [true] },
						{ text: 'classifies weather as workflow', passes: [true] },
						{ text: 'classifies support as agent', passes: [true] },
						{ text: 'brief reasoning only', passes: [true] },
					],
				},
			],
		});

		const out = formatComparisonTerminal(agentsEval);

		expect(out).toMatch(
			/Aggregate: 100\.0% pass \(4\/4 trials, 0 scenarios \+ 4 expectations, N=1\)/,
		);
	});

	it('renders the unit mix in the aggregate heading and expectation rows in tier tables', () => {
		const pr = bucket('pr', [s('a', 'happy', 3, 3), e('a', 'asks before building', 0, 3)]);
		const base = bucket('master', [
			s('a', 'happy', 10, 10),
			e('a', 'asks before building', 10, 10),
		]);
		const out = formatComparisonTerminal(evalFixture, ok(compareBuckets(pr, base)));

		expect(out).toMatch(/Aggregate \(2 units \(1 scenario \+ 1 expectation\)\)/);
		expect(out).toMatch(/REGRESSIONS/);
		expect(out).toContain('a :: asks before building');
	});
});
