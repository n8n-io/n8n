import { compareBuckets } from '../comparison/compare';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';
import { evaluateGate, isGatedTier } from '../comparison/gate';
import type {
	MultiRunEvaluation,
	WorkflowTestCase,
	ExecutionScenarioResult,
	BuildExpectationResult,
} from '../types';

interface CaseSpec {
	slug: string;
	scenarios?: Array<{
		name: string;
		/** `'incomplete'` = verifier returned no verdict for that run. */
		passes: Array<boolean | 'incomplete'>;
		failureCategory?: string;
		reasoning?: string;
	}>;
	expectations?: Array<{ text: string; verdicts: Array<boolean | 'incomplete'>; reason?: string }>;
}

/** Build a MultiRunEvaluation + slug map matching the shape gate.ts/format.ts read. */
function makeEval(totalRuns: number, cases: CaseSpec[]) {
	const slugByTestCase = new Map<WorkflowTestCase, string>();
	const testCases = cases.map((c) => {
		const executionScenarios = (c.scenarios ?? []).map((sa) => ({
			name: sa.name,
			description: '',
			dataSetup: '',
			successCriteria: '',
		}));
		const testCase = {
			conversation: [{ role: 'user', text: c.slug }],
			complexity: 'medium' as const,
			tags: [],
			executionScenarios,
			datasets: ['pr'],
		} as WorkflowTestCase;
		slugByTestCase.set(testCase, c.slug);

		const scenarioAggs = (c.scenarios ?? []).map((sa) => {
			const evaluated = sa.passes.filter((p) => p !== 'incomplete');
			const passCount = evaluated.filter((p) => p).length;
			const scenario = testCase.executionScenarios.find((x) => x.name === sa.name)!;
			return {
				scenario,
				evaluatedCount: evaluated.length,
				passCount,
				passRate: evaluated.length > 0 ? passCount / evaluated.length : 0,
				passAtK: [] as number[],
				passHatK: [] as number[],
				runs: sa.passes.map(
					(p): ExecutionScenarioResult => ({
						scenario,
						success: p === true,
						score: p === true ? 1 : 0,
						reasoning: p === true ? '' : (sa.reasoning ?? `judge: ${sa.name} failed`),
						failureCategory:
							p === 'incomplete' ? 'verification_failure' : !p ? sa.failureCategory : undefined,
						...(p === 'incomplete' ? { incomplete: true } : {}),
					}),
				),
			};
		});

		const buildExpectations = (c.expectations ?? []).map((e) => {
			const runs: BuildExpectationResult[] = e.verdicts.map((v) =>
				v === 'incomplete'
					? { expectation: e.text, pass: false, reason: '', incomplete: true }
					: {
							expectation: e.text,
							pass: v,
							reason: v ? '' : (e.reason ?? 'judge: expectation failed'),
						},
			);
			const evaluated = runs.filter((r) => !r.incomplete);
			const passCount = evaluated.filter((r) => r.pass).length;
			return {
				expectation: e.text,
				runs,
				evaluatedCount: evaluated.length,
				passCount,
				passRate: evaluated.length > 0 ? passCount / evaluated.length : 0,
				passAtK: [] as number[],
				passHatK: [] as number[],
			};
		});

		return {
			testCase,
			runs: new Array(totalRuns).fill(null).map(() => ({
				testCase,
				workflowBuildSuccess: true,
				executionScenarioResults: [],
			})),
			buildSuccessCount: totalRuns,
			executionScenarios: scenarioAggs,
			buildExpectations,
		};
	});
	const evaluation: MultiRunEvaluation = { totalRuns, testCases };
	return { evaluation, slugByTestCase };
}

describe('isGatedTier', () => {
	it('is true only for known gated tiers', () => {
		expect(isGatedTier('pr')).toBe(true);
		expect(isGatedTier('full')).toBe(false);
		expect(isGatedTier(undefined)).toBe(false);
	});
});

describe('evaluateGate', () => {
	it('is green when every unit passes at least once (pass@k)', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'a',
				scenarios: [
					{ name: 'happy', passes: [true, true, true] },
					{ name: 'edge', passes: [false, true, false] }, // flaky but green under pass@k
				],
				expectations: [{ text: 'asked the channel', verdicts: [true, true, true] }],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(true);
		expect(gate.units).toHaveLength(3);
		expect(gate.failing).toHaveLength(0);
		expect(gate.excluded).toHaveLength(0);
	});

	it('grades a build-only case (0 scenarios) by its expectation alone', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'build-only',
				expectations: [{ text: 'splits the records envelope', verdicts: [true, true, true] }],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.units).toHaveLength(1);
		expect(gate.units[0].kind).toBe('buildExpectation');
		expect(gate.green).toBe(true);
		expect(gate.excluded).toHaveLength(0);
	});

	it('fails a build-only case when its sole expectation never passes', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'build-only',
				expectations: [{ text: 'splits the records envelope', verdicts: [false, false, false] }],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.units).toHaveLength(1);
		expect(gate.failing).toHaveLength(1);
		expect(gate.green).toBe(false);
	});

	it('is not green when a unit never passes, and records its failure categories', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'rest-api-data-pipeline',
				scenarios: [
					{ name: 'happy-path', passes: [true, true, true] },
					{
						name: 'empty-response',
						passes: [false, false, false],
						failureCategory: 'builder_issue',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(false);
		expect(gate.failing).toHaveLength(1);
		expect(gate.failing[0].slug).toBe('rest-api-data-pipeline/empty-response');
		expect(gate.failing[0].passCount).toBe(0);
		expect(gate.failing[0].failureCategories).toEqual({ builder_issue: 3 });
	});

	it('excludes build expectations with no judge verdict instead of failing on them', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'a',
				scenarios: [{ name: 'happy', passes: [true, true, true] }],
				expectations: [
					{ text: 'flaky judge', verdicts: ['incomplete', 'incomplete', 'incomplete'] },
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(true);
		expect(gate.units).toHaveLength(1); // only the scenario
		expect(gate.excluded).toHaveLength(1);
		expect(gate.excluded[0].kind).toBe('buildExpectation');
	});

	it('keeps verifier-incomplete scenario runs out of the denominator and the category tally', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'a',
				scenarios: [
					{
						name: 'happy',
						passes: [true, 'incomplete', false],
						failureCategory: 'builder_issue',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(true); // pass@k over evaluated runs
		expect(gate.units).toHaveLength(1);
		expect(gate.units[0].total).toBe(2);
		expect(gate.units[0].passCount).toBe(1);
		// The incomplete run's verification_failure label stays out of the tally.
		expect(gate.units[0].failureCategories).toEqual({ builder_issue: 1 });
		expect(gate.aggregate).toEqual({ passed: 1, total: 2, rate: 0.5 });
	});

	it('is NOT green when every unit is excluded (nothing was measured)', () => {
		const { evaluation, slugByTestCase } = makeEval(2, [
			{
				slug: 'a',
				scenarios: [{ name: 'happy', passes: ['incomplete', 'incomplete'] }],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(false);
		expect(gate.units).toHaveLength(0);
		expect(gate.failing).toHaveLength(0);
		expect(gate.excluded).toHaveLength(1);
	});

	it('excludes a scenario whose every run is verifier-incomplete instead of failing on it', () => {
		const { evaluation, slugByTestCase } = makeEval(2, [
			{
				slug: 'a',
				scenarios: [
					{ name: 'happy', passes: [true, true] },
					{ name: 'edge', passes: ['incomplete', 'incomplete'] },
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });

		expect(gate.green).toBe(true);
		expect(gate.units).toHaveLength(1); // only the evaluated scenario
		expect(gate.excluded).toHaveLength(1);
		expect(gate.excluded[0].kind).toBe('scenario');
		expect(gate.excluded[0].slug).toBe('a/edge');
	});

	it('minAggregatePassRate verdict tracks the pooled rate, not per-unit greenness', () => {
		// 4 scenarios: 3 fully pass, 1 fully fails → pooled 9/12 = 75%.
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'a',
				scenarios: [
					{ name: 's1', passes: [true, true, true] },
					{ name: 's2', passes: [true, true, true] },
					{ name: 's3', passes: [true, true, true] },
					{ name: 's4', passes: [false, false, false], failureCategory: 'builder_issue' },
				],
			},
		]);

		const lenient = evaluateGate(evaluation, {
			slugByTestCase,
			criterion: { kind: 'minAggregatePassRate', minRate: 0.7 },
		});
		expect(lenient.aggregate.rate).toBeCloseTo(0.75);
		expect(lenient.green).toBe(true);
		// per-unit display still flags the fully-failing scenario
		expect(lenient.failing.map((u) => u.slug)).toContain('a/s4');

		const strict = evaluateGate(evaluation, {
			slugByTestCase,
			criterion: { kind: 'minAggregatePassRate', minRate: 0.9 },
		});
		expect(strict.green).toBe(false);
	});
});

describe('formatComparisonMarkdown — gate mode', () => {
	it('renders a green TIP verdict and omits baseline-comparison sections', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{ slug: 'a', scenarios: [{ name: 'happy', passes: [true, true, true] }] },
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(md).toMatch(/### Instance AI Workflow Eval/);
		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/🟢 All 1 unit green over 3 runs/);
		expect(md).toMatch(/\*\*Gate\*\*: pass@k = 100%/);
		// No baseline framing.
		expect(md).not.toMatch(/baseline/i);
		expect(md).not.toMatch(/#### Regressions/);
		expect(md).not.toMatch(/#### Not green/);
	});

	it("renders a red CAUTION verdict and the failing unit's full judge text", () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'rest-api-data-pipeline',
				scenarios: [
					{ name: 'happy-path', passes: [true, true, true] },
					{
						name: 'empty-response',
						passes: [false, false, false],
						failureCategory: 'builder_issue',
						reasoning: 'No Slack message was posted for the empty array.',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(md).toMatch(/> \[!CAUTION\]/);
		expect(md).toMatch(/🔴 1 of 2 units not green over 3 runs/);
		expect(md).toMatch(/<details open><summary>Failures \(1\)<\/summary>/);
		expect(md).toMatch(/`rest-api-data-pipeline\/empty-response`\*\* — passed 0\/3/);
		expect(md).toMatch(/_\[builder_issue\]_ No Slack message was posted for the empty array\./);
		expect(md).not.toMatch(/#### Not green/);
	});

	it('renders a yellow WARNING when a unit barely passed (failed the majority)', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'notification-router',
				scenarios: [
					{ name: 'low', passes: [true, true, true] },
					{
						name: 'high',
						passes: [true, false, false], // 1/3 — passed the minority
						failureCategory: 'builder_issue',
						reasoning: 'Teams message omitted the Server Down title.',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(gate.green).toBe(true); // pass@k still met
		expect(md).toMatch(/> \[!WARNING\]/);
		expect(md).toMatch(/🟡 All 2 units green over 3 runs, but 1 barely passed/);
		expect(md).toMatch(/`notification-router\/high`\*\* — passed 1\/3/);
		expect(md).toMatch(/_\[builder_issue\]_ Teams message omitted the Server Down title\./);
		expect(md).not.toMatch(/> \[!CAUTION\]/);
	});

	it('stays a green TIP for a single flaky run (2/3) but still lists it', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'notification-router',
				scenarios: [
					{ name: 'low', passes: [true, true, true] },
					{
						name: 'high',
						passes: [true, false, true], // 2/3 — one flaky miss, still majority-pass
						failureCategory: 'mock_issue',
						reasoning: 'Transient mock hiccup on run 2.',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(md).toMatch(/> \[!TIP\]/);
		expect(md).toMatch(/🟢 All 2 units green over 3 runs; 1 flaky/);
		expect(md).not.toMatch(/> \[!WARNING\]/);
		// the flaky run is still surfaced, with its judge text
		expect(md).toMatch(/`notification-router\/high`\*\* — passed 2\/3/);
		expect(md).toMatch(/Transient mock hiccup on run 2\./);
	});

	it('renders the judge text for a failing build expectation, not just scenarios', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'notification-router',
				scenarios: [{ name: 'happy', passes: [true, true, true] }],
				expectations: [
					{
						text: 'asked a clarifying question before building',
						verdicts: [true, false, false], // 1/3 — barely passed
						reason: 'The agent started building without asking anything.',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		// the build-expectation failure is surfaced with its full reason (previously omitted)
		expect(md).toMatch(/notification-router :: asked a clarifying question/);
		expect(md).toMatch(/passed 1\/3/);
		expect(md).toMatch(/The agent started building without asking anything\./);
		expect(md).toMatch(/> \[!WARNING\]/); // a 1/3 build expectation is "barely passed"
	});

	it('renders the gate even if a comparison outcome is also passed (gate wins)', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{ slug: 'a', scenarios: [{ name: 'happy', passes: [true, true, true] }] },
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const pr = {
			experimentName: 'pr',
			evaluationUnits: new Map([
				[
					'a/happy',
					{ kind: 'scenario' as const, testCaseFile: 'a', name: 'happy', passed: 0, total: 3 },
				],
			]),
		};
		const base = {
			experimentName: 'master',
			evaluationUnits: new Map([
				[
					'a/happy',
					{ kind: 'scenario' as const, testCaseFile: 'a', name: 'happy', passed: 10, total: 10 },
				],
			]),
		};
		const outcome = { kind: 'ok' as const, result: compareBuckets(pr, base) };
		const md = formatComparisonMarkdown(evaluation, outcome, { slugByTestCase, gate });
		// Gate verdict shown, baseline comparison suppressed.
		expect(md).toMatch(/🟢 All 1 unit green/);
		expect(md).not.toMatch(/#### Regressions/);
	});
});

describe('formatComparisonTerminal — gate mode', () => {
	it('renders a plain-text gate verdict with failing units', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'rest-api-data-pipeline',
				scenarios: [
					{ name: 'happy-path', passes: [true, true, true] },
					{
						name: 'empty-response',
						passes: [false, false, false],
						failureCategory: 'builder_issue',
					},
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const out = formatComparisonTerminal(evaluation, undefined, { slugByTestCase, gate });

		expect(out).toMatch(/▶ GATE: 1 of 2 units NOT green over 3 runs/);
		expect(out).toMatch(/NOT GREEN {2}rest-api-data-pipeline\/empty-response {2}0\/3/);
		expect(out).not.toMatch(/\| /);
	});

	it('marks green-but-flaky units in the terminal gate summary', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{
				slug: 'notification-router',
				scenarios: [
					{ name: 'low', passes: [true, true, true] },
					{ name: 'high', passes: [true, false, true], failureCategory: 'builder_issue' },
				],
			},
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const out = formatComparisonTerminal(evaluation, undefined, { slugByTestCase, gate });

		expect(out).toMatch(/▶ GATE: all 2 units green over 3 runs, 1 flaky/);
		expect(out).toMatch(/flaky +notification-router\/high +2\/3/);
	});
});
