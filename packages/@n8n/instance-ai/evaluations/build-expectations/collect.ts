import type { BuildExpectationResult, WorkflowTestCase } from '../types';

/**
 * Tag verdicts as context-state graded.
 *
 * Applied on every path that can produce a memory verdict — judged, ungraded, and
 * judge-error — so `kind` is a reliable filter in the report and in
 * `eval-results.json` rather than something only the happy path sets.
 */
export function asMemoryVerdicts(verdicts: BuildExpectationResult[]): BuildExpectationResult[] {
	return verdicts.map((verdict) => ({ ...verdict, kind: 'memory' as const }));
}

/**
 * Author expectations judged by the CONVERSATION/WORKFLOW judge: process turns
 * first, then outcome.
 *
 * `memoryExpectations` are deliberately excluded — they go to their own judge with
 * the context state as its only input (see `verifyMemoryExpectations`). Use
 * `collectAllExpectations` when you need every authored expectation regardless of
 * which judge owns it.
 *
 * The original single `buildExpectations` order isn't preserved across the split,
 * but verdicts are matched back by expectation string (not index), so ordering
 * only affects the judge's numbered list — within its inherent run-to-run noise.
 */
export function collectExpectations(
	testCase: Pick<WorkflowTestCase, 'processExpectations' | 'outcomeExpectations'>,
): string[] {
	return [...(testCase.processExpectations ?? []), ...(testCase.outcomeExpectations ?? [])];
}

/**
 * Every authored expectation across all three kinds.
 *
 * Used for the accounting paths — a build that produced nothing records all of them
 * as ungraded, so the case keeps a stable unit count whichever judge would have
 * owned each one.
 */
export function collectAllExpectations(
	testCase: Pick<
		WorkflowTestCase,
		'processExpectations' | 'outcomeExpectations' | 'memoryExpectations'
	>,
): string[] {
	return [...collectExpectations(testCase), ...(testCase.memoryExpectations ?? [])];
}
