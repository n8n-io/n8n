import { partitionWarnings, type ValidationWarning } from '../workflow-validation-warnings';

describe('partitionWarnings', () => {
	it('keeps informational severity soft and treats other issues as blocking', () => {
		const warnings: ValidationWarning[] = [
			{ code: 'MISSING_TRIGGER', message: 'No trigger', severity: 'informational' },
			{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected', severity: 'informational' },
			{
				code: 'INVALID_PARAMETER',
				message: 'Bad parameter',
				nodeName: 'HTTP Request',
				severity: 'warning',
			},
		];

		expect(partitionWarnings(warnings)).toEqual({
			informational: warnings.slice(0, 2),
			blocking: [warnings[2]],
		});
	});

	it('treats missing severity as blocking', () => {
		const warnings: ValidationWarning[] = [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown key' }];
		expect(partitionWarnings(warnings)).toEqual({
			informational: [],
			blocking: warnings,
		});
	});
});
