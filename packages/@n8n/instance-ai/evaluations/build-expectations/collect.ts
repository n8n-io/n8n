import type { WorkflowTestCase } from '../types';

export const EXPECTED_TOOL_INVOCATIONS_EXPECTATION =
	'Expected configured tool invocations were observed';

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

export function collectMeasuredExpectations(
	testCase: Pick<
		WorkflowTestCase,
		'processExpectations' | 'outcomeExpectations' | 'expectedToolInvocations'
	>,
): string[] {
	return [
		...collectExpectations(testCase),
		...(testCase.expectedToolInvocations ? [EXPECTED_TOOL_INVOCATIONS_EXPECTATION] : []),
	];
}
