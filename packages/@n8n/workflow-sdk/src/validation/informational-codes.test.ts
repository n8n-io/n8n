import {
	INFORMATIONAL_VALIDATION_CODES,
	isInformationalValidationCode,
	partitionValidationIssues,
} from './informational-codes';

describe('informational validation codes', () => {
	it('includes reachability and source-lint codes', () => {
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_TRIGGER')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('DISCONNECTED_NODE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('auto_imported_sdk_symbols')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('CODE_NODE_NETWORK_CALL')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SDK_AS_CONST')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SDK_UNSOLICITED_STICKY')).toBe(true);
		expect(isInformationalValidationCode('INVALID_PARAMETER')).toBe(false);
	});

	it('partitionValidationIssues separates blocking from informational', () => {
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
