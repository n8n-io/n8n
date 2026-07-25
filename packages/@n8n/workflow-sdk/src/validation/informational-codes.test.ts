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
		expect(INFORMATIONAL_VALIDATION_CODES.has('EMPTY_RESOURCE_LOCATOR_VALUE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('WRONG_LLM_TEXT_PATH')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('AGENT_CHAT_INPUT_WITHOUT_CHAT_TRIGGER')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('CODE_NODE_NETWORK_CALL')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_OUTPUT_FIXTURE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('BRANCH_OUTPUT_NOT_WIRED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SPLIT_IN_BATCHES_NO_LOOPBACK')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('NESTED_SPLIT_IN_BATCHES')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SINGLE_ITEM_LIST_FIXTURE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('HTTP_ENVELOPE_NOT_UNWRAPPED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('EMPTY_ITEM_NOT_FILTERED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('ALWAYS_OUTPUT_DATA_NO_EFFECT')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SUBNODE_UNSAFE_JSON_REFERENCE')).toBe(true);
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
