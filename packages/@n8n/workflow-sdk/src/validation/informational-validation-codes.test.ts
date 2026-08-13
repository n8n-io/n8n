import { partitionValidationIssues } from './issue-severity';

describe('partitionValidationIssues', () => {
	it('separates blocking from informational by severity on the issue', () => {
		const issues = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger', severity: 'informational' as const },
			{ code: 'INVALID_PARAMETER', message: 'Bad parameter', severity: 'warning' as const },
			{ code: 'SDK_AS_CONST', message: 'Avoid as const', severity: 'informational' as const },
		];
		expect(partitionValidationIssues(issues)).toEqual({
			informational: [issues[0], issues[2]],
			blocking: [issues[1]],
		});
	});

	it('treats missing severity as blocking', () => {
		const issues = [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown key' }];
		expect(partitionValidationIssues(issues)).toEqual({
			informational: [],
			blocking: [issues[0]],
		});
	});
});
