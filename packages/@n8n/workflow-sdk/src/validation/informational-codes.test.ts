import { partitionValidationIssues } from './informational-codes';

describe('partitionValidationIssues', () => {
	it('separates blocking from informational codes', () => {
		const issues = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'INVALID_PARAMETER', message: 'Bad parameter' },
			{ code: 'SDK_AS_CONST', message: 'Avoid as const' },
		];
		expect(partitionValidationIssues(issues)).toEqual({
			informational: [issues[0], issues[2]],
			errors: [issues[1]],
		});
	});
});
