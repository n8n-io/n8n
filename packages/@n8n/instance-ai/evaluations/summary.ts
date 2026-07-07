import type {
	BuildExpectationAggregation,
	ExecutionScenarioAggregation,
	TestCaseAggregation,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from './types';

export type CaseRunStatus = 'checked' | 'built' | 'build_failed';

export interface ScoredCounts {
	passCount: number;
	totalCount: number;
}

export type AggregatedCaseUnit = ExecutionScenarioAggregation | BuildExpectationAggregation;

export function requiresWorkflowOutput(testCase: WorkflowTestCase): boolean {
	return (
		(testCase.executionScenarios?.length ?? 0) > 0 ||
		(testCase.outcomeExpectations?.length ?? 0) > 0
	);
}

export function getAggregatedCaseUnits(tc: TestCaseAggregation): AggregatedCaseUnit[] {
	return [...tc.executionScenarios, ...tc.buildExpectations.filter((ea) => ea.evaluatedCount > 0)];
}

export function countAggregatedUnitTrials(units: AggregatedCaseUnit[]): ScoredCounts {
	return units.reduce<ScoredCounts>(
		(counts, unit) => {
			counts.passCount += unit.passCount;
			counts.totalCount += unit.evaluatedCount;
			return counts;
		},
		{ passCount: 0, totalCount: 0 },
	);
}

export function getCheckedRunCount(tc: TestCaseAggregation): number {
	if (requiresWorkflowOutput(tc.testCase)) return tc.buildSuccessCount;

	return tc.runs.filter((run) => (run.buildExpectationResults?.length ?? 0) > 0).length;
}

export function getRunScoredCounts(result: WorkflowTestCaseResult): ScoredCounts {
	// Incomplete units (no verifier/judge verdict) are visible but not scored.
	const scoredExpectations = (result.buildExpectationResults ?? []).filter((e) => !e.incomplete);
	const scoredScenarios = result.executionScenarioResults.filter((sr) => !sr.incomplete);

	return {
		passCount:
			scoredScenarios.filter((sr) => sr.success).length +
			scoredExpectations.filter((e) => e.pass).length,
		totalCount: scoredScenarios.length + scoredExpectations.length,
	};
}

export function getCaseRunStatus(result: WorkflowTestCaseResult): CaseRunStatus {
	const checkedWithoutWorkflow =
		!requiresWorkflowOutput(result.testCase) && (result.buildExpectationResults?.length ?? 0) > 0;

	if (checkedWithoutWorkflow) return 'checked';
	if (result.workflowBuildSuccess) return 'built';
	return 'build_failed';
}

export function getCaseRunStatusLabel(result: WorkflowTestCaseResult): string {
	switch (getCaseRunStatus(result)) {
		case 'checked':
			return 'CHECKED';
		case 'built':
			return 'BUILT';
		case 'build_failed':
			return 'BUILD FAILED';
	}
}
