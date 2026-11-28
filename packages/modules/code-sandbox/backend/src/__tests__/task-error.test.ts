import { SandboxServiceError, type CodeTaskErrorEvent } from '@n8n/sandbox-client';

import {
	CodeSandboxCrashedError,
	CodeSandboxTaskFailedError,
	CodeSandboxUnavailableError,
	toServiceError,
	toTaskError,
} from '../task-error';

describe('toTaskError', () => {
	const failure = (event: Partial<CodeTaskErrorEvent>): CodeTaskErrorEvent => ({
		type: 'error',
		taskId: 't1',
		code: 'user_error',
		message: 'code execution failed',
		...event,
	});

	it('passes on the user error as task runners send it', () => {
		const userError = { message: 'x is not defined [line 2]', lineNumber: 2 };

		expect(toTaskError(failure({ userError }))).toBe(userError);
	});

	it('uses the event message when the user error is missing', () => {
		expect(toTaskError(failure({}))).toEqual({ message: 'code execution failed' });
	});

	it('maps a crash to its error', () => {
		expect(toTaskError(failure({ code: 'crashed', message: 'runtime exited' }))).toBeInstanceOf(
			CodeSandboxCrashedError,
		);
	});

	it('maps an unknown code to a failed task', () => {
		const code = 'timeout' as CodeTaskErrorEvent['code'];

		expect(toTaskError(failure({ code }))).toBeInstanceOf(CodeSandboxTaskFailedError);
	});
});

describe('toServiceError', () => {
	it.each([0, 429, 503])('reports status %i as an unavailable service', (status) => {
		expect(toServiceError(new SandboxServiceError('failed', status))).toBeInstanceOf(
			CodeSandboxUnavailableError,
		);
	});

	it('passes on the error of a cancelled task', () => {
		const aborted = new SandboxServiceError('canceled', 0);

		expect(toServiceError(aborted, AbortSignal.abort())).toBe(aborted);
	});

	it('passes on other errors', () => {
		const conflict = new SandboxServiceError('different settings', 409);

		expect(toServiceError(conflict)).toBe(conflict);
	});
});
