import { aggregateResults, passAtK, passHatK } from '../cli/aggregator';
import type {
	ArtifactVerdict,
	ExecutionScenario,
	ExecutionScenarioResult,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import { baseTestCase } from './fixtures';

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'plain',
	successCriteria: 'works',
};

const incompleteTestCase: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'build it' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [scenario],
	datasets: ['full'],
};

function makeRunResult(run: {
	success: boolean;
	incomplete?: boolean;
	failureCategory?: string;
}): WorkflowTestCaseResult {
	return {
		testCase: incompleteTestCase,
		workflowBuildSuccess: true,
		executionScenarioResults: [
			{
				scenario,
				success: run.success,
				score: run.success ? 1 : 0,
				reasoning: run.success ? 'ok' : 'nope',
				failureCategory: run.failureCategory,
				...(run.incomplete ? { incomplete: true } : {}),
			},
		],
	};
}

describe('aggregateResults — verifier-incomplete scenario runs', () => {
	it('keeps incomplete runs out of the denominator but visible in runs', () => {
		const allRuns = [
			[makeRunResult({ success: true })],
			[makeRunResult({ success: false, failureCategory: 'builder_issue' })],
			[
				makeRunResult({
					success: false,
					incomplete: true,
					failureCategory: 'verification_failure',
				}),
			],
		];

		const evaluation = aggregateResults(allRuns, 3);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.runs).toHaveLength(3);
		expect(sa.evaluatedCount).toBe(2);
		expect(sa.passCount).toBe(1);
		expect(sa.passRate).toBe(0.5);
		// pass metrics computed over evaluated runs only (n=2)
		expect(sa.passAtK).toHaveLength(2);
		expect(sa.passAtK[0]).toBeCloseTo(0.5);
		expect(sa.passAtK[1]).toBeCloseTo(1);
	});

	it('reports evaluatedCount 0 when every run is incomplete', () => {
		const allRuns = [
			[makeRunResult({ success: false, incomplete: true })],
			[makeRunResult({ success: false, incomplete: true })],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.evaluatedCount).toBe(0);
		expect(sa.passCount).toBe(0);
		expect(sa.passRate).toBe(0);
		expect(sa.passAtK).toEqual([]);
		expect(sa.runs).toHaveLength(2);
	});

	it('leaves fully-evaluated scenarios unchanged', () => {
		const allRuns = [
			[makeRunResult({ success: true })],
			[makeRunResult({ success: true })],
			[makeRunResult({ success: false, failureCategory: 'mock_issue' })],
		];

		const evaluation = aggregateResults(allRuns, 3);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.evaluatedCount).toBe(3);
		expect(sa.passCount).toBe(2);
		expect(sa.passRate).toBeCloseTo(2 / 3);
		expect(sa.passAtK).toHaveLength(3);
	});
});

const SCENARIO_A = { name: 'a', description: 'd', dataSetup: '', successCriteria: 'ok' };
const SCENARIO_B = { name: 'b', description: 'd', dataSetup: '', successCriteria: 'ok' };

function scenarioResult(success: boolean): ExecutionScenarioResult {
	return { scenario: SCENARIO_A, success, score: success ? 1 : 0, reasoning: '' };
}

function baseResult(overrides: Partial<WorkflowTestCaseResult> = {}): WorkflowTestCaseResult {
	return {
		testCase: baseTestCase(),
		workflowBuildSuccess: true,
		executionScenarioResults: [],
		...overrides,
	};
}

/**
 * The headline computation in `cli/index.ts`'s `computeAggregateMetrics` flatMaps
 * `tc.executionScenarios`, evaluated `tc.buildExpectations`, and evaluated `tc.artifacts`
 * into one `units` array, then averages each unit's terminal passAtK/passHatK. We can't
 * import `cli/index.ts` directly in a unit test — it runs a side-effecting `main()` at
 * module load — so this mirrors that exact formula against the aggregator's output to
 * prove artifacts are purely additive.
 */
function terminalRate(arr: number[]): number {
	return arr[arr.length - 1] ?? 0;
}

describe('aggregateResults — artifact units', () => {
	it('AC#1: workflow-only results (no artifactResults) produce zero artifact units and leave the scenario-only headline unchanged', () => {
		const testCase = baseTestCase({ executionScenarios: [SCENARIO_A, SCENARIO_B] });
		const runs: WorkflowTestCaseResult[][] = [
			[
				baseResult({
					testCase,
					executionScenarioResults: [scenarioResult(true), scenarioResult(true)],
				}),
			],
			[
				baseResult({
					testCase,
					executionScenarioResults: [scenarioResult(true), scenarioResult(false)],
				}),
			],
			[
				baseResult({
					testCase,
					executionScenarioResults: [scenarioResult(false), scenarioResult(false)],
				}),
			],
		];

		const evaluation = aggregateResults(runs, 3);
		const tc = evaluation.testCases[0];

		// No run ever set `artifactResults`, so no artifact units are produced.
		expect(tc.artifacts).toEqual([]);
		expect(tc.buildExpectations).toEqual([]);

		// Scenario aggregation is untouched by the artifacts feature: scenario A passes
		// 2/3 runs, scenario B passes 1/3 runs — assert the exact passAtK/passHatK values.
		expect(tc.executionScenarios[0].passCount).toBe(2);
		expect(tc.executionScenarios[0].passAtK).toEqual([
			passAtK(3, 2, 1),
			passAtK(3, 2, 2),
			passAtK(3, 2, 3),
		]);
		expect(tc.executionScenarios[0].passHatK).toEqual([
			passHatK(3, 2, 1),
			passHatK(3, 2, 2),
			passHatK(3, 2, 3),
		]);
		expect(tc.executionScenarios[1].passCount).toBe(1);

		// The headline "units" formula (mirrored from computeAggregateMetrics) sees the
		// same two scenario units whether or not `tc.artifacts` is spread in — an empty
		// array contributes nothing.
		const unitsWithoutArtifactsSpread = [...tc.executionScenarios, ...tc.buildExpectations];
		const unitsWithArtifactsSpread = [
			...tc.executionScenarios,
			...tc.buildExpectations,
			...tc.artifacts.filter((a) => a.evaluatedCount > 0),
		];
		expect(unitsWithArtifactsSpread).toHaveLength(unitsWithoutArtifactsSpread.length);
		const headline = (units: Array<{ passAtK: number[] }>) =>
			units.length > 0
				? units.reduce((sum, u) => sum + terminalRate(u.passAtK), 0) / units.length
				: 0;
		expect(headline(unitsWithArtifactsSpread)).toBe(headline(unitsWithoutArtifactsSpread));
	});

	function agentPass(): ArtifactVerdict {
		return { type: 'agent', id: 'agent-1', pass: true };
	}
	function agentFail(): ArtifactVerdict {
		return { type: 'agent', id: 'agent-1', pass: false, reason: 'missing skill' };
	}
	function agentNotProduced(): ArtifactVerdict {
		return {
			type: 'agent',
			id: '(none)',
			pass: false,
			reason: 'expected agent artifact was not produced',
		};
	}
	function agentIncomplete(): ArtifactVerdict {
		return {
			type: 'agent',
			id: 'agent-1',
			pass: false,
			incomplete: true,
			reason: 'judge produced no result',
		};
	}
	function unexpectedConfigEval(): ArtifactVerdict {
		return {
			type: 'config-eval',
			id: 'wf-1',
			pass: false,
			unexpected: true,
			reason: 'unexpected config-eval artifact produced (not in expectedArtifacts)',
		};
	}

	it('an expected agent artifact that passes in every run becomes one fully-evaluated passing unit', () => {
		const testCase = baseTestCase({ expectedArtifacts: ['workflow', 'agent'] });
		const runs: WorkflowTestCaseResult[][] = [
			[baseResult({ testCase, artifactResults: [agentPass()] })],
			[baseResult({ testCase, artifactResults: [agentPass()] })],
			[baseResult({ testCase, artifactResults: [agentPass()] })],
		];

		const evaluation = aggregateResults(runs, 3);
		const tc = evaluation.testCases[0];

		expect(tc.artifacts).toHaveLength(1);
		expect(tc.artifacts[0].type).toBe('agent');
		expect(tc.artifacts[0].evaluatedCount).toBe(3);
		expect(tc.artifacts[0].passCount).toBe(3);
		expect(tc.artifacts[0].passRate).toBe(1);
		expect(terminalRate(tc.artifacts[0].passAtK)).toBe(1);
		expect(terminalRate(tc.artifacts[0].passHatK)).toBe(1);
	});

	it('an expected agent artifact that fails drops the unit pass rate', () => {
		const testCase = baseTestCase({ expectedArtifacts: ['workflow', 'agent'] });
		const runs: WorkflowTestCaseResult[][] = [
			[baseResult({ testCase, artifactResults: [agentPass()] })],
			[baseResult({ testCase, artifactResults: [agentFail()] })],
		];

		const evaluation = aggregateResults(runs, 2);
		const tc = evaluation.testCases[0];

		expect(tc.artifacts[0].evaluatedCount).toBe(2);
		expect(tc.artifacts[0].passCount).toBe(1);
		expect(tc.artifacts[0].passRate).toBe(0.5);
	});

	it('an expected agent artifact that was never produced counts as a measured fail unit', () => {
		const testCase = baseTestCase({ expectedArtifacts: ['workflow', 'agent'] });
		const runs: WorkflowTestCaseResult[][] = [
			[baseResult({ testCase, artifactResults: [agentPass()] })],
			[baseResult({ testCase, artifactResults: [agentNotProduced()] })],
		];

		const evaluation = aggregateResults(runs, 2);
		const tc = evaluation.testCases[0];

		expect(tc.artifacts[0].evaluatedCount).toBe(2);
		expect(tc.artifacts[0].passCount).toBe(1);
		expect(tc.artifacts[0].passRate).toBe(0.5);
	});

	it('an unexpected artifact type appearing in a run becomes its own failing unit, keyed by that type', () => {
		// Neither run declares `config-eval` in expectedArtifacts, but run 2 produced one.
		const testCase = baseTestCase({ expectedArtifacts: ['workflow'] });
		const runs: WorkflowTestCaseResult[][] = [
			[baseResult({ testCase })],
			[baseResult({ testCase, artifactResults: [unexpectedConfigEval()] })],
		];

		const evaluation = aggregateResults(runs, 2);
		const tc = evaluation.testCases[0];

		expect(tc.artifacts).toHaveLength(1);
		expect(tc.artifacts[0].type).toBe('config-eval');
		// Only 1 of 2 runs produced a verdict for this type — the other run simply never
		// discovered it, so it contributes no verdict (not a pass, not a counted fail).
		expect(tc.artifacts[0].evaluatedCount).toBe(1);
		expect(tc.artifacts[0].passCount).toBe(0);
	});

	it('a dead-judge (incomplete) verdict is excluded from the evaluated denominator', () => {
		const testCase = baseTestCase({ expectedArtifacts: ['workflow', 'agent'] });
		const runs: WorkflowTestCaseResult[][] = [
			[baseResult({ testCase, artifactResults: [agentPass()] })],
			[baseResult({ testCase, artifactResults: [agentIncomplete()] })],
		];

		const evaluation = aggregateResults(runs, 2);
		const tc = evaluation.testCases[0];

		expect(tc.artifacts[0].runs).toHaveLength(2);
		expect(tc.artifacts[0].evaluatedCount).toBe(1);
		expect(tc.artifacts[0].passCount).toBe(1);
		expect(tc.artifacts[0].passRate).toBe(1);
	});
});

describe('aggregateResults — build expectations as units', () => {
	const expectationCase: WorkflowTestCase = {
		...incompleteTestCase,
		executionScenarios: undefined,
		processExpectations: ['asks before building'],
		outcomeExpectations: ['workflow has a trigger'],
	};

	function expectationRun(
		verdicts: Array<{ expectation: string; pass: boolean; incomplete?: boolean }>,
	): WorkflowTestCaseResult {
		return {
			testCase: expectationCase,
			workflowBuildSuccess: true,
			executionScenarioResults: [],
			buildExpectationResults: verdicts.map((v) => ({
				expectation: v.expectation,
				pass: v.pass,
				reason: v.pass ? 'ok' : 'nope',
				...(v.incomplete ? { incomplete: true } : {}),
			})),
		};
	}

	it('aggregates per-expectation counts in process-then-outcome order', () => {
		const allRuns = [
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: true },
				]),
			],
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: false },
				]),
			],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const [process, outcome] = evaluation.testCases[0].buildExpectations;

		expect(process.expectation).toBe('asks before building');
		expect(process).toMatchObject({ evaluatedCount: 2, passCount: 2 });
		expect(process.passAtK).toHaveLength(2);
		expect(outcome.expectation).toBe('workflow has a trigger');
		expect(outcome).toMatchObject({ evaluatedCount: 2, passCount: 1 });
	});

	it('keeps judge-incomplete and missing verdicts out of the denominator', () => {
		const allRuns = [
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: true },
				]),
			],
			[
				// Judge returned an incomplete verdict for one expectation and
				// nothing at all for the other.
				expectationRun([{ expectation: 'asks before building', pass: false, incomplete: true }]),
			],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const [process, outcome] = evaluation.testCases[0].buildExpectations;

		expect(process).toMatchObject({ evaluatedCount: 1, passCount: 1 });
		expect(outcome).toMatchObject({ evaluatedCount: 1, passCount: 1 });
	});

	it('reports evaluatedCount 0 for an expectation the judge never evaluated', () => {
		const allRuns = [[expectationRun([])], [expectationRun([])]];

		const evaluation = aggregateResults(allRuns, 2);
		for (const ea of evaluation.testCases[0].buildExpectations) {
			expect(ea).toMatchObject({ evaluatedCount: 0, passCount: 0 });
			expect(ea.passAtK).toEqual([]);
		}
	});
});
