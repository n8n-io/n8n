import type { TestCaseExecutionDto, TestRunSummaryDto } from '@n8n/api-types';
import type { TestCaseExecution, TestRun } from '@n8n/db';

/**
 * Maps internal entities to the sanitized public-API DTOs. This is the single
 * choke point that keeps internal-only fields (workflow join, running-instance
 * tracking, cancellation flags, evaluation-config references, per-case
 * `runIndex`) out of the public response. Whitelist-style mapping is
 * deliberate: new entity columns are not exposed until added here.
 */

// Structural source shape shared by both repository return types: the list
// (`getMany` — a spread that omits `testCaseExecutions`) and the single-run
// summary (`getTestRunSummaryById`). Using `Pick` avoids requiring the full
// entity (relations included) at the call sites.
type TestRunSummarySource = Pick<
	TestRun,
	| 'id'
	| 'status'
	| 'runAt'
	| 'completedAt'
	| 'metrics'
	| 'errorCode'
	| 'errorDetails'
	| 'createdAt'
	| 'updatedAt'
> & { finalResult: TestRun['finalResult']; testCaseCount: number };

export function toTestRunSummaryDto(run: TestRunSummarySource): TestRunSummaryDto {
	return {
		id: run.id,
		status: run.status,
		runAt: run.runAt?.toISOString() ?? null,
		completedAt: run.completedAt?.toISOString() ?? null,
		metrics: run.metrics ?? null,
		errorCode: run.errorCode ?? null,
		errorDetails: run.errorDetails ?? null,
		finalResult: run.finalResult ?? null,
		testCaseCount: run.testCaseCount,
		createdAt: run.createdAt.toISOString(),
		updatedAt: run.updatedAt.toISOString(),
	};
}

export function toTestCaseExecutionDto(testCase: TestCaseExecution): TestCaseExecutionDto {
	return {
		id: testCase.id,
		status: testCase.status,
		runAt: testCase.runAt?.toISOString() ?? null,
		completedAt: testCase.completedAt?.toISOString() ?? null,
		metrics: testCase.metrics ?? null,
		errorCode: testCase.errorCode ?? null,
		errorDetails: testCase.errorDetails ?? null,
		inputs: testCase.inputs ?? null,
		outputs: testCase.outputs ?? null,
		executionId: testCase.executionId ?? null,
	};
}
