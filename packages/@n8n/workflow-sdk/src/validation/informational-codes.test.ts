import {
	INFORMATIONAL_VALIDATION_CODES,
	isInformationalValidationCode,
	partitionValidationIssues,
} from './informational-codes';

describe('informational validation codes', () => {
	it('includes reachability and staged pagination codes', () => {
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_TRIGGER')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('DISCONNECTED_NODE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('auto_imported_sdk_symbols')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY')).toBe(
			true,
		);
	});

	it('partitionValidationIssues separates blocking from informational', () => {
		const issues = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY', message: 'Envelope' },
			{ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM', message: 'Collapse' },
		];
		expect(partitionValidationIssues(issues)).toEqual({
			informational: [issues[0], issues[1]],
			errors: [issues[2]],
		});
		expect(isInformationalValidationCode('INVALID_PARAMETER')).toBe(false);
	});
});
