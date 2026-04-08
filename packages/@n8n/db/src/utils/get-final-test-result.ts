import type { TestCaseExecution } from '../entities';
import type { TestRunFinalResult } from '../entities/types-db';

/**
 * Returns the final result of the test run based on the test case executions.
 * The final result is the most severe status among all test case executions' statuses.
 */
export function getTestRunFinalResult(testCaseExecutions: TestCaseExecution[]): TestRunFinalResult {
	// Priority of statuses: error > warning > success
	const severityMap: Record<TestRunFinalResult, number> = {
		error: 3,
		warning: 2,
		success: 1,
	};

	let finalResult: TestRunFinalResult = 'success';

	for (const testCaseExecution of testCaseExecutions) {
		if (['error', 'warning'].includes(testCaseExecution.status)) {
			if (
				testCaseExecution.status in severityMap &&
				severityMap[testCaseExecution.status as TestRunFinalResult] > severityMap[finalResult]
			) {
				finalResult = testCaseExecution.status as TestRunFinalResult;
			}
		}
	}

	return finalResult;
}
