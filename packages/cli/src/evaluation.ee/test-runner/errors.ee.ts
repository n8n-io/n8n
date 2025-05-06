import { UnexpectedError } from 'n8n-workflow';

export type TestCaseExecutionErrorCode =
	| 'MOCKED_NODE_NOT_FOUND' // This will be used when node mocking will be implemented
	| 'FAILED_TO_EXECUTE_WORKFLOW'
	| 'INVALID_METRICS'
	| 'UNKNOWN_ERROR'
	| 'NO_METRICS_COLLECTED';

export class TestCaseExecutionError extends UnexpectedError {
	readonly code: TestCaseExecutionErrorCode;

	constructor(code: TestCaseExecutionErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Case execution failed with code ' + code, { extra });

		this.code = code;
	}
}

export type TestRunErrorCode =
	| 'TEST_CASES_NOT_FOUND'
	| 'INTERRUPTED'
	| 'UNKNOWN_ERROR'
	| 'EVALUATION_TRIGGER_NOT_FOUND';

export class TestRunError extends UnexpectedError {
	readonly code: TestRunErrorCode;

	constructor(code: TestRunErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Run failed with code ' + code, { extra });

		this.code = code;
	}
}
