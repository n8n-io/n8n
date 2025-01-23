import type { IDataObject } from 'n8n-workflow';

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

export class TestCaseExecutionError extends Error {
	readonly code: TestCaseExecutionErrorCode;

	readonly extra: IDataObject;

	constructor(code: TestCaseExecutionErrorCode, extra: IDataObject = {}) {
		super('Test Case execution: ' + code);

		this.code = code;
		this.extra = extra;
	}
}
