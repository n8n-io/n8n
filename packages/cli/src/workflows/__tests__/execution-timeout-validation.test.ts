import { UserError } from 'n8n-workflow';

import {
	assertExecutionTimeoutWithinMax,
	exceedsMaxExecutionTimeout,
} from '@/workflows/execution-timeout-validation';

describe('exceedsMaxExecutionTimeout', () => {
	it.each([
		{ executionTimeout: 3000, maxTimeout: 2400, expected: true },
		{ executionTimeout: 2400, maxTimeout: 2400, expected: false },
		{ executionTimeout: 300, maxTimeout: 2400, expected: false },
		{ executionTimeout: -1, maxTimeout: 2400, expected: false },
		{ executionTimeout: undefined, maxTimeout: 2400, expected: false },
		{ executionTimeout: 99999, maxTimeout: -1, expected: false },
		{ executionTimeout: 99999, maxTimeout: 0, expected: false },
	])(
		'returns $expected for executionTimeout $executionTimeout and maximum $maxTimeout',
		({ executionTimeout, maxTimeout, expected }) => {
			expect(exceedsMaxExecutionTimeout(executionTimeout, maxTimeout)).toBe(expected);
		},
	);
});

describe('assertExecutionTimeoutWithinMax', () => {
	it('throws a UserError that names the configured maximum', () => {
		const assertion = () => assertExecutionTimeoutWithinMax(3000, 2400);

		expect(assertion).toThrow(UserError);
		expect(assertion).toThrow(
			"executionTimeout (3000s) exceeds this instance's maximum of 2400s. Set executionTimeout to 2400 or less.",
		);
	});

	it('does not throw when executionTimeout is within the maximum', () => {
		expect(() => assertExecutionTimeoutWithinMax(2400, 2400)).not.toThrow();
	});
});
