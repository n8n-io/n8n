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
});
