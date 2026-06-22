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

	it('keeps incomplete router warnings informational', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'IF_NO_OUTPUT_CONNECTIONS', message: 'IF has no outputs', nodeName: 'Route?' },
			{
				code: 'SWITCH_NO_OUTPUT_CONNECTIONS',
				message: 'Switch has no outputs',
				nodeName: 'Route',
			},
			{
				code: 'SWITCH_FALLBACK_OUTPUT_DISABLED',
				message: 'Switch fallback disabled',
				nodeName: 'Route',
			},
			{ code: 'INVALID_PARAMETER', message: 'Bad parameter', nodeName: 'HTTP Request' },
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: warnings.slice(0, 3),
			errors: [warnings[3]],
		});
	});
});
