import type { CombinedResults, EvalTestCase } from '../cli/mcp/merge-results';
import { buildReplayMap, bucketFromCombined } from '../cli/mcp/upload-merged-experiment';

function testCase(overrides: Partial<EvalTestCase> & { testCaseFile: string }): EvalTestCase {
	return {
		name: overrides.testCaseFile,
		buildSuccessCount: 1,
		totalRuns: 2,
		workflowChecksPerRun: [],
		buildExpectationResultsPerRun: [],
		buildExpectations: [],
		threadIds: [],
		scenarios: [],
		...overrides,
	};
}

const tc = testCase({
	testCaseFile: 'weather-alert',
	scenarios: [
		{
			name: 'error-handling',
			passCount: 1,
			totalRuns: 2,
			passAtK: 0.5,
			passHatK: 0.25,
			runs: [
				{ workflowId: 'wf1', passed: true, score: 1, reasoning: 'ok', execErrors: [] },
				{
					workflowId: 'wf1',
					passed: false,
					score: 0,
					reasoning: 'no retry',
					failureCategory: 'missing_error_handling',
					execErrors: [],
				},
			],
		},
	],
});

describe('buildReplayMap', () => {
	it('keys precomputed outputs by slug/scenario/iteration', () => {
		const map = buildReplayMap([tc]);
		expect(map.get('weather-alert/error-handling/0')).toMatchObject({
			passed: true,
			buildSuccess: true,
			failureCategory: undefined,
		});
		expect(map.get('weather-alert/error-handling/1')).toMatchObject({
			passed: false,
			failureCategory: 'missing_error_handling',
		});
	});

	it('drops the failure category on passing runs', () => {
		const map = buildReplayMap([tc]);
		expect(map.get('weather-alert/error-handling/0')?.failureCategory).toBeUndefined();
	});

	it('stamps scenario-level pass@k / pass^k onto every run of the scenario', () => {
		const map = buildReplayMap([tc]);
		// Both iterations carry the scenario's precomputed pass@k / pass^k so the
		// LangSmith column average reduces to the per-scenario mean.
		expect(map.get('weather-alert/error-handling/0')).toMatchObject({
			passAtK: 0.5,
			passHatK: 0.25,
		});
		expect(map.get('weather-alert/error-handling/1')).toMatchObject({
			passAtK: 0.5,
			passHatK: 0.25,
		});
	});
});

describe('bucketFromCombined', () => {
	it('projects scenarios into a comparison bucket keyed by slug/scenario', () => {
		const combined: CombinedResults = {
			totalRuns: 2,
			durationMs: 0,
			testCases: [tc],
			summary: {
				testCases: 1,
				built: 1,
				scenariosTotal: 1,
				passAtK: 0.5,
				passHatK: 0.25,
				passRatePerIter: '100% / 0%',
			},
		};
		const bucket = bucketFromCombined(combined, 'mcp-merged-abc');
		expect(bucket.experimentName).toBe('mcp-merged-abc');
		const counts = bucket.scenarios.get('weather-alert/error-handling');
		expect(counts).toMatchObject({ passed: 1, total: 2 });
		expect(counts?.failureCategories).toEqual({ missing_error_handling: 1 });
		expect(bucket.trialTotal).toBe(2);
		expect(bucket.failureCategoryTotals).toEqual({ missing_error_handling: 1 });
	});
});
