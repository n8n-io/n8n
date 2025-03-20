import { UnexpectedError } from 'n8n-workflow';

export type TestCaseExecutionErrorCode =
	| 'MOCKED_NODE_DOES_NOT_EXIST'
	| 'TRIGGER_NO_LONGER_EXISTS'
	| 'FAILED_TO_EXECUTE_WORKFLOW'
	| 'EVALUATION_WORKFLOW_DOES_NOT_EXIST'
	| 'FAILED_TO_EXECUTE_EVALUATION_WORKFLOW'
	| 'METRICS_MISSING'
	| 'UNKNOWN_METRICS'
	| 'INVALID_METRICS'
	| 'PAYLOAD_LIMIT_EXCEEDED'
	| 'UNKNOWN_ERROR';

export class TestCaseExecutionError extends UnexpectedError {
	readonly code: TestCaseExecutionErrorCode;

	constructor(code: TestCaseExecutionErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Case execution failed with code ' + code, { extra });

		this.code = code;
	}
}

export type TestRunErrorCode =
	| 'PAST_EXECUTIONS_NOT_FOUND'
	| 'EVALUATION_WORKFLOW_NOT_FOUND'
	| 'INTERRUPTED'
	| 'UNKNOWN_ERROR';

export class TestRunError extends UnexpectedError {
	readonly code: TestRunErrorCode;

	constructor(code: TestRunErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Run failed with code ' + code, { extra });

		this.code = code;
	}
}
