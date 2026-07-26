import { partitionWarnings, type ValidationWarning } from '../workflow-validation-warnings';

describe('partitionWarnings', () => {
	it('keeps graph reachability warnings informational and treats other issues as blocking', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
			{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' },
			{ code: 'INVALID_PARAMETER', message: 'Bad parameter', nodeName: 'HTTP Request' },
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: warnings.slice(0, 2),
			errors: [warnings[2]],
		});
	});

	it('treats HTTP pagination envelope codes as blocking', () => {
		const warnings: ValidationWarning[] = [
			{
				code: 'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY',
				message: 'Use completeExpression',
				nodeName: 'Fetch',
			},
			{
				code: 'HTTP_PAGINATION_MISSING_OUTPUT_SHAPE',
				message: 'Declare output or set completeExpression',
				nodeName: 'Fetch',
			},
			{ code: 'MISSING_TRIGGER', message: 'No trigger' },
		];

		expect(partitionWarnings(warnings)).toEqual({
			errors: [warnings[0], warnings[1]],
			informational: [warnings[2]],
		});
	});

	it('treats HTTP text-body and structured-output-parser codes as blocking', () => {
		const warnings: ValidationWarning[] = [
			{
				code: 'HTTP_TEXT_BODY_FIELD',
				message: 'Use $json.data after text-format HTTP Request',
				nodeName: 'Aggregate Emails',
			},
			{
				code: 'STRUCTURED_OUTPUT_PARSER_SCHEMA_IN_EXAMPLE_FIELD',
				message: 'Use schemaType manual or example JSON',
				nodeName: 'Structured Output Parser',
			},
			{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' },
		];

		expect(partitionWarnings(warnings)).toEqual({
			errors: [warnings[0], warnings[1]],
			informational: [warnings[2]],
		});
	});
});
