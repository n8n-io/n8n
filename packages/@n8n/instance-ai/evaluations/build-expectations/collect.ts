import type { WorkflowTestCase } from '../types';

/**
 * Author expectations to judge for a full build: process turns first, then outcome.
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
