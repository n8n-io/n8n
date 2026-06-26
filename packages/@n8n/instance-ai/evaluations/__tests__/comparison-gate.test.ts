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
	scenarios?: Array<{ name: string; passes: boolean[]; failureCategory?: string }>;
	expectations?: Array<{ text: string; verdicts: Array<boolean | 'incomplete'> }>;
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
			const passCount = sa.passes.filter(Boolean).length;
			const scenario = testCase.executionScenarios.find((x) => x.name === sa.name)!;
			return {
				scenario,
				passCount,
				passRate: totalRuns > 0 ? passCount / totalRuns : 0,
				passAtK: [] as number[],
				passHatK: [] as number[],
				runs: sa.passes.map(
					(p): ExecutionScenarioResult => ({
						scenario,
						success: p,
						score: p ? 1 : 0,
						reasoning: '',
						failureCategory: !p ? sa.failureCategory : undefined,
					}),
				),
			};
		});

		const buildExpectations = (c.expectations ?? []).map((e) => {
			const runs: BuildExpectationResult[] = e.verdicts.map((v) =>
				v === 'incomplete'
					? { expectation: e.text, pass: false, reason: '', incomplete: true }
					: { expectation: e.text, pass: v, reason: '' },
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

	it('renders a red CAUTION verdict with a Not-green table for failing units', () => {
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
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(md).toMatch(/> \[!CAUTION\]/);
		expect(md).toMatch(/🔴 1 of 2 units not green over 3 runs/);
		expect(md).toMatch(/#### Not green/);
		expect(md).toMatch(
			/`rest-api-data-pipeline\/empty-response` \| 0\/3 \(0%\) \| 3× builder_issue/,
		);
	});

	it('renders a yellow WARNING when all units pass@k but one had a failing run', () => {
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
		const md = formatComparisonMarkdown(evaluation, undefined, { slugByTestCase, gate });

		expect(gate.green).toBe(true); // pass@k still met
		expect(md).toMatch(/> \[!WARNING\]/);
		expect(md).toMatch(/🟡 All 2 units green over 3 runs, but 1 had a failing run/);
		expect(md).toMatch(/#### Passed with failures/);
		expect(md).toMatch(/`notification-router\/high` \| 2\/3 \(67%\) \| 1× builder_issue/);
		expect(md).not.toMatch(/#### Not green/);
		expect(md).not.toMatch(/> \[!CAUTION\]/);
	});

	it('renders the gate even if a comparison outcome is also passed (gate wins)', () => {
		const { evaluation, slugByTestCase } = makeEval(3, [
			{ slug: 'a', scenarios: [{ name: 'happy', passes: [true, true, true] }] },
		]);
		const gate = evaluateGate(evaluation, { slugByTestCase });
		const pr = {
			experimentName: 'pr',
			scenarios: new Map([
				['a/happy', { testCaseFile: 'a', scenarioName: 'happy', passed: 0, total: 3 }],
			]),
		};
		const base = {
			experimentName: 'master',
			scenarios: new Map([
				['a/happy', { testCaseFile: 'a', scenarioName: 'happy', passed: 10, total: 10 }],
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

	it('marks green-but-flaky units as FLAKY in the gate summary', () => {
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

		expect(out).toMatch(/▶ GATE: all 2 units green over 3 runs, 1 with a failing run/);
		expect(out).toMatch(/FLAKY +notification-router\/high +2\/3/);
	});
});
