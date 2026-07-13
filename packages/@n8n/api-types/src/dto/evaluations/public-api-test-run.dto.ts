/**
 * Sanitized response DTOs for the public-facing evaluation read API
 * (`GET /workflows/{id}/test-runs...`). These are the public contract and are
 * intentionally decoupled from the internal `TestRun` / `TestCaseExecution`
 * entities: internal-only fields (workflow join, running-instance tracking,
 * cancellation flags, evaluation-config references, per-case internal indexes)
 * are never exposed here. Date fields are ISO-8601 strings, matching JSON
 * serialization.
 */

export type PublicTestRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

export type PublicTestRunFinalResult = 'success' | 'error' | 'warning';

export type PublicTestCaseExecutionStatus =
	| 'new'
	| 'running'
	| 'evaluation_running'
	| 'success'
	| 'error'
	| 'warning'
	| 'cancelled';

export interface TestRunSummaryDto {
	id: string;
	status: PublicTestRunStatus;
	runAt: string | null;
	completedAt: string | null;
	metrics: Record<string, number | boolean> | null;
	errorCode: string | null;
	errorDetails: Record<string, unknown> | null;
	finalResult: PublicTestRunFinalResult | null;
	testCaseCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface TestRunDto {
	id: string;
	status: PublicTestRunStatus;
	createdAt: string;
}

export interface TestRunCancelDto {
	id: string;
	status: 'cancelled';
}

export interface TestCaseExecutionDto {
	id: string;
	status: PublicTestCaseExecutionStatus;
	runAt: string | null;
	completedAt: string | null;
	metrics: Record<string, number | boolean> | null;
	errorCode: string | null;
	errorDetails: Record<string, unknown> | null;
	inputs: Record<string, unknown> | null;
	outputs: Record<string, unknown> | null;
	executionId: string | null;
}
