import type { TestCaseExecutionErrorCode, TestRunErrorCode } from '@n8n/api-types';
import { ApplicationError } from 'n8n-workflow';

export class TestCaseExecutionError extends ApplicationError {
	readonly code: TestCaseExecutionErrorCode;

	constructor(code: TestCaseExecutionErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Case execution failed with code ' + code, { extra });

		this.code = code;
	}
}

export class TestRunError extends ApplicationError {
	readonly code: TestRunErrorCode;

	constructor(code: TestRunErrorCode, extra: Record<string, unknown> = {}) {
		super('Test Run failed with code ' + code, { extra });

		this.code = code;
	}
}
