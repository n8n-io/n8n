import { z } from 'zod';

const TestCaseExecutionErrorCodes = z.enum([
	'MOCKED_NODE_DOES_NOT_EXIST',
	'TRIGGER_NO_LONGER_EXISTS',
	'FAILED_TO_EXECUTE_WORKFLOW',
	'EVALUATION_WORKFLOW_DOES_NOT_EXIST',
	'FAILED_TO_EXECUTE_EVALUATION_WORKFLOW',
	'METRICS_MISSING',
	'UNKNOWN_METRICS',
	'INVALID_METRICS',
	'PAYLOAD_LIMIT_EXCEEDED',
	'UNKNOWN_ERROR',
]);
export const TEST_CASE_EXECUTION_ERROR_CODE = TestCaseExecutionErrorCodes.Values;
export type TestCaseExecutionErrorCode = z.infer<typeof TestCaseExecutionErrorCodes>;

const TestRunErrorCodes = z.enum([
	'PAST_EXECUTIONS_NOT_FOUND',
	'EVALUATION_WORKFLOW_NOT_FOUND',
	'INTERRUPTED',
	'UNKNOWN_ERROR',
]);
export const TEST_RUN_ERROR_CODES = TestRunErrorCodes.Values;
export type TestRunErrorCode = z.infer<typeof TestRunErrorCodes>;

const TestCaseExecutionStatuses = z.enum([
	'new', // Test case execution was created and added to the test run, but has not been started yet
	'running', // Workflow under test is running
	'evaluation_running', // Evaluation workflow is running
	'success', // Both workflows have completed successfully
	'error', // An error occurred during the execution of workflow under test or evaluation workflow
	'warning', // There were warnings during the execution of workflow under test or evaluation workflow. Used only to signal possible issues to user, not to indicate a failure.
	'cancelled',
]);
export const TEST_CASE_EXECUTION_STATUS = TestCaseExecutionStatuses.Values;
export type TestCaseExecutionStatus = z.infer<typeof TestCaseExecutionStatuses>;
