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

	it('keeps staged HTTP pagination envelope code informational', () => {
		const warnings: ValidationWarning[] = [
			{
				code: 'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY',
				message: 'Use completeExpression',
				nodeName: 'Fetch',
			},
			{ code: 'ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM', message: 'Use $input.all()' },
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: [warnings[0]],
			errors: [warnings[1]],
		});
	});
});
