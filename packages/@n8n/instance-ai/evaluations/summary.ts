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

/**
 * Whether a case is graded on a built workflow. Keyed off execution scenarios only:
 * outcome expectations are judged from the rendered build context (workflow AND any
 * agent/config-eval artifact), so a case that produces an agent instead of a workflow
 * still grades cleanly rather than reporting a missing-workflow build failure.
 */
export function requiresWorkflowOutput(testCase: WorkflowTestCase): boolean {
	return (testCase.executionScenarios?.length ?? 0) > 0;
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

	// A scenario-less case is "checked" on any run that produced a scoreable unit — a judged
	// process/outcome expectation (which covers the workflow and any agent/config-eval artifact).
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
	// A scenario-less case (e.g. an agent/config-eval build) produces no workflow to score by
	// design; treat it as checked (not build-failed) once it has any scoreable unit — a judged
	// process/outcome expectation.
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
