import { mock } from 'jest-mock-extended';

import type { TestCaseExecution } from '../../entities';
import { getTestRunFinalResult } from '../get-final-test-result';

function mockTestCaseExecutions(statuses: Array<TestCaseExecution['status']>) {
	return statuses.map((status) => mock<TestCaseExecution>({ status }));
}

describe('getTestRunFinalResult', () => {
	test('should return success if all test cases are successful', () => {
		const result = getTestRunFinalResult(
			mockTestCaseExecutions(['success', 'success', 'success', 'success', 'success']),
		);

		expect(result).toEqual('success');
	});

	test('should return error if at least one test case is errored', () => {
		const result = getTestRunFinalResult(
			mockTestCaseExecutions(['success', 'error', 'success', 'success', 'success']),
		);

		expect(result).toEqual('error');
	});

	test('should return warning if at least one test case is warned', () => {
		const result = getTestRunFinalResult(
			mockTestCaseExecutions(['success', 'warning', 'success', 'success', 'success']),
		);

		expect(result).toEqual('warning');
	});

	test('should return error if there are errors and warnings', () => {
		const result = getTestRunFinalResult(
			mockTestCaseExecutions(['success', 'error', 'warning', 'success', 'success']),
		);

		expect(result).toEqual('error');
	});
});
