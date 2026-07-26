import {
	INFORMATIONAL_VALIDATION_CODES,
	isInformationalValidationCode,
	partitionValidationIssues,
} from './informational-codes';

describe('informational validation codes', () => {
	it('includes reachability and staged codes', () => {
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_TRIGGER')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('DISCONNECTED_NODE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('auto_imported_sdk_symbols')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('EMPTY_RESOURCE_LOCATOR_VALUE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('WRONG_LLM_TEXT_PATH')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('AGENT_CHAT_INPUT_WITHOUT_CHAT_TRIGGER')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('CODE_NODE_NETWORK_CALL')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_OUTPUT_FIXTURE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('BRANCH_OUTPUT_NOT_WIRED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('ERROR_OUTPUT_NOT_WIRED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('ERROR_OUTPUT_MISROUTED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('ERROR_OUTPUT_INVALID_PORT')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('FILTER_BOOLEAN_COMPARED_AS_STRING')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SPLIT_IN_BATCHES_NO_LOOPBACK')).toBe(true);
		expect(isInformationalValidationCode('FILTER_MISSING_CONDITIONS')).toBe(false);
		expect(INFORMATIONAL_VALIDATION_CODES.has('NESTED_SPLIT_IN_BATCHES')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SINGLE_ITEM_LIST_FIXTURE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('HTTP_ENVELOPE_NOT_UNWRAPPED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('EMPTY_ITEM_NOT_FILTERED')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('ALWAYS_OUTPUT_DATA_NO_EFFECT')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SUBNODE_UNSAFE_JSON_REFERENCE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('MISSING_EXECUTE_ONCE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('WEEKDAY_DIGEST_CADENCE')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SIDE_EFFECT_JSON_CHAIN')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('CODE_NODE_FORBIDDEN_IMPORT')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('SDK_UNSOLICITED_STICKY')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('CODE_NESTED_TEMPLATE_LITERAL')).toBe(true);
		expect(INFORMATIONAL_VALIDATION_CODES.has('AGENT_WITHOUT_PRIOR_AGGREGATE')).toBe(true);
	});

	it('treats HTTP pagination envelope codes as blocking', () => {
		expect(INFORMATIONAL_VALIDATION_CODES.has('HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY')).toBe(
			false,
		);
		expect(INFORMATIONAL_VALIDATION_CODES.has('HTTP_PAGINATION_MISSING_OUTPUT_SHAPE')).toBe(false);
		expect(isInformationalValidationCode('HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY')).toBe(false);
		expect(isInformationalValidationCode('HTTP_PAGINATION_MISSING_OUTPUT_SHAPE')).toBe(false);
	});

	it('treats HTTP text-body and structured-output-parser codes as blocking', () => {
		for (const code of [
			'HTTP_TEXT_BODY_FIELD',
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_NOT_STRING',
			'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
			'STRUCTURED_OUTPUT_PARSER_EXAMPLE_INVALID',
		]) {
			expect(INFORMATIONAL_VALIDATION_CODES.has(code)).toBe(false);
			expect(isInformationalValidationCode(code)).toBe(false);
		}
	});

	it('partitionValidationIssues separates blocking from informational', () => {
		const issues = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY', message: 'Envelope' },
			{ code: 'HTTP_PAGINATION_MISSING_OUTPUT_SHAPE', message: 'Missing output' },
			{ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM', message: 'Collapse' },
		];
		expect(partitionValidationIssues(issues)).toEqual({
			informational: [issues[0]],
			errors: [issues[1], issues[2], issues[3]],
		});
		expect(isInformationalValidationCode('INVALID_PARAMETER')).toBe(false);
	});
});
