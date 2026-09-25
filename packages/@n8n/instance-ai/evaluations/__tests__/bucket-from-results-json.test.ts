import { bucketFromEvaluation } from '../comparison/bucket-from-evaluation';
import {
	EvalResultsParseError,
	bucketFromResultsJson,
	parseEvalResults,
} from '../comparison/bucket-from-results-json';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type {
	BuildExpectationAggregation,
	ExecutionScenarioAggregation,
	MultiRunEvaluation,
	WorkflowTestCase,
} from '../types';

// One logical run, expressed twice: as the in-memory aggregate the LangSmith
// driver projects, and as the persisted artifact every run writes. The last
// test asserts the two projections agree — that is the whole point of this
// module, and the drift it guards against is silent.
const RUNS = [
	{ passed: true },
	{ passed: false, failureCategory: 'builder_issue' },
	{ passed: false, incomplete: true },
];

function resultsJson(overrides: Record<string, unknown> = {}): unknown {
	return {
		timestamp: '2026-09-04T00:00:00.000Z',
		totalRuns: 3,
		testCases: [
			{
				name: 'build it',
				testCaseFile: 'my-case',
				scenarios: [
					{
						name: 'happy',
						passCount: 1,
						evaluatedCount: 2,
						runs: RUNS,
					},
				],
				buildExpectations: [
					{ expectation: 'asks before building', passCount: 2, evaluatedCount: 3 },
					{ expectation: 'never judged', passCount: 0, evaluatedCount: 0 },
				],
				...overrides,
			},
		],
	};
}

function project(raw: unknown = resultsJson()) {
	return bucketFromResultsJson(parseEvalResults(raw, 'fixture'), 'after');
}

function bucket(raw: unknown = resultsJson()) {
	return project(raw).bucket;
}

describe('bucketFromResultsJson', () => {
	it('emits scenario and evaluated-expectation units under their kind-specific keys', () => {
		const result = bucket();

		expect(result.evaluationUnits.get('my-case/happy')).toMatchObject({
			kind: 'scenario',
			name: 'happy',
			passed: 1,
			total: 2,
		});
		expect(result.evaluationUnits.get('my-case#expectation:asks before building')).toMatchObject({
			kind: 'expectation',
			name: 'asks before building',
			passed: 2,
			total: 3,
		});
	});

	it('excludes expectations with no evaluated verdicts', () => {
		const result = bucket();

		expect(result.evaluationUnits.get('my-case#expectation:never judged')).toBeUndefined();
		expect(result.evaluationUnits.size).toBe(2);
	});

	it('keeps trialTotal and failure categories scenario-only, skipping incomplete runs', () => {
		const result = bucket();

		expect(result.trialTotal).toBe(2);
		expect(result.failureCategoryTotals).toEqual({ builder_issue: 1 });
	});

	it('skips and reports a case with no testCaseFile rather than failing the comparison', () => {
		// Real artifacts land like this: `persist.ts` cannot build slugByTestCase on
		// the crash-recovery path, and lang-tracer's dispatcher fixtures show whole
		// files with `testCaseFile: null`. Three of its four are shaped this way.
		const scenarios = [{ name: 'happy', passCount: 1, evaluatedCount: 2, runs: RUNS }];
		const result = project({
			testCases: [
				{ name: 'keyed case', testCaseFile: 'my-case', scenarios, buildExpectations: [] },
				{ name: 'unkeyable case', scenarios, buildExpectations: [] },
			],
		});

		expect(result.skipped).toEqual(['unkeyable case']);
		// The keyed case still contributes its unit — a partial comparison beats none.
		expect([...result.bucket.evaluationUnits.keys()]).toEqual(['my-case/happy']);
	});

	it('throws only when every case is unkeyable, because then nothing can be compared', () => {
		const raw = resultsJson({ testCaseFile: undefined });
		expect(() => project(raw)).toThrow(EvalResultsParseError);
		expect(() => project(raw)).toThrow(/Every test case/);
	});

	it('tolerates a run artifact that carries no per-run scenario detail', () => {
		// A crash-recovered artifact can land without `runs`; the unit counts are
		// still comparable, only the failure-category drift table goes empty.
		const result = bucket(
			resultsJson({
				scenarios: [{ name: 'happy', passCount: 1, evaluatedCount: 2 }],
			}),
		);

		expect(result.evaluationUnits.get('my-case/happy')).toMatchObject({ passed: 1, total: 2 });
		expect(result.trialTotal).toBe(0);
	});

	it('yields a keyed case with no units when a failed build left every expectation unjudged', () => {
		// The real shape of a failed sandbox build: the case is present and
		// keyable, but nothing was graded. `compare-local` distinguishes this from
		// "the two runs covered different cases" — telling someone to check their
		// --filter when the filter was right sends them after a bug that isn't there.
		const result = project({
			testCases: [
				{
					name: 'build a thing',
					testCaseFile: 'ai-gateway-respects-named-web-search-tool',
					scenarios: [],
					buildExpectations: [
						{ expectation: 'honoured the named tool', passCount: 0, evaluatedCount: 0 },
					],
				},
			],
		});

		expect(result.skipped).toEqual([]);
		expect(result.bucket.evaluationUnits.size).toBe(0);
	});

	it('rejects a file that is not an eval-results.json', () => {
		expect(() => parseEvalResults({ hello: 'world' }, 'notes.json')).toThrow(EvalResultsParseError);
		expect(() => parseEvalResults({ hello: 'world' }, 'notes.json')).toThrow(/notes\.json/);
	});
});

describe('agreement with bucketFromEvaluation', () => {
	function testCase(): WorkflowTestCase {
		return {
			conversation: [{ role: 'user', text: 'build it' }],
			complexity: 'simple',
			tags: [],
			datasets: ['full'],
		} as WorkflowTestCase;
	}

	function scenarioAggregation(): ExecutionScenarioAggregation {
		const scenario = { name: 'happy', description: '', dataSetup: '', successCriteria: '' };
		return {
			scenario,
			runs: RUNS.map((run) => ({
				scenario,
				success: run.passed,
				score: run.passed ? 1 : 0,
				reasoning: '',
				failureCategory: run.failureCategory,
				...(run.incomplete ? { incomplete: true } : {}),
			})),
			evaluatedCount: 2,
			passCount: 1,
			passRate: 0.5,
			passAtK: [],
			passHatK: [],
		};
	}

	function expectationAggregation(
		expectation: string,
		passCount: number,
		evaluatedCount: number,
	): BuildExpectationAggregation {
		return {
			expectation,
			runs: [],
			evaluatedCount,
			passCount,
			passRate: evaluatedCount > 0 ? passCount / evaluatedCount : 0,
			passAtK: [],
			passHatK: [],
		};
	}

	it('produces the same unit keys, counts and trial totals from either source', () => {
		const tc = testCase();
		const evaluation: MultiRunEvaluation = {
			totalRuns: 3,
			testCases: [
				{
					testCase: tc,
					runs: [],
					buildSuccessCount: 3,
					executionScenarios: [scenarioAggregation()],
					buildExpectations: [
						expectationAggregation('asks before building', 2, 3),
						expectationAggregation('never judged', 0, 0),
					],
					status: 'verified',
				},
			],
		};
		const withFiles: WorkflowTestCaseWithFile[] = [{ testCase: tc, fileSlug: 'my-case' }];

		const fromEvaluation = bucketFromEvaluation(evaluation, withFiles, 'x');
		const fromJson = bucket();

		expect([...fromJson.evaluationUnits.keys()].sort()).toEqual(
			[...fromEvaluation.evaluationUnits.keys()].sort(),
		);
		for (const [key, counts] of fromEvaluation.evaluationUnits) {
			expect(fromJson.evaluationUnits.get(key)).toEqual(counts);
		}
		expect(fromJson.trialTotal).toBe(fromEvaluation.trialTotal);
		expect(fromJson.failureCategoryTotals).toEqual(fromEvaluation.failureCategoryTotals);
	});
});
