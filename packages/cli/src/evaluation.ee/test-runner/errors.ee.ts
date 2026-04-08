import type { TestCaseExecutionErrorCode, TestRunErrorCode } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

export class TestCaseExecutionError extends UnexpectedError {
	readonly code: TestCaseExecutionErrorCode;

	constructor(code: TestCaseExecutionErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Case execution failed with code ' + code, { extra });

		this.code = code;
	}
}

export class TestRunError extends UnexpectedError {
	readonly code: TestRunErrorCode;

	constructor(code: TestRunErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Run failed with code ' + code, { extra });

		this.code = code;
	}
}
