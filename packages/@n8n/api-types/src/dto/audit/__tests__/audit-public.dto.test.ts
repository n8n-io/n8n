import { AuditPublicDto } from '../audit-public.dto';

const report = {
	risk: 'credentials',
	sections: [
		{
			title: 'Credentials not used in any workflow',
			description: 'These credentials are not used in any workflow.',
			recommendation: 'Consider deleting these credentials if you no longer need them.',
			location: [{ kind: 'credential', id: '1', name: 'My Test Account' }],
		},
	],
};

describe('AuditPublicDto', () => {
	test('keeps the report of a title the schema does not name', () => {
		// A reporter added later titles its report from its own risk category, so the response must
		// carry a title the schema was not written with.
		const parsed = AuditPublicDto.parse({
			'Credentials Risk Report': report,
			'Container Risk Report': { ...report, risk: 'container' },
		});

		expect(parsed).toEqual({
			'Credentials Risk Report': report,
			'Container Risk Report': { ...report, risk: 'container' },
		});
	});

	test('rejects a report that is not shaped like a report', () => {
		const result = AuditPublicDto.safeParse({ 'Container Risk Report': { risk: 'container' } });

		expect(result.success).toBe(false);
	});

	test('accepts the empty array of an instance with no risk to report', () => {
		expect(AuditPublicDto.parse([])).toEqual([]);
	});

	test('rejects a non-empty array', () => {
		expect(AuditPublicDto.safeParse([report]).success).toBe(false);
	});
});
