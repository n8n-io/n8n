import { packageRequirementsSchema } from '../requirements.schema';

describe('packageRequirementsSchema', () => {
	const credential = (id: string) => ({
		id,
		name: 'My Credential',
		type: 'httpBasicAuth',
		usedByWorkflows: ['wf-1'],
	});
	const variable = (name: string) => ({ name, usedByWorkflows: ['wf-1'] });

	it('accepts distinct entries per section', () => {
		const requirements = {
			credentials: [credential('cred-1'), credential('cred-2')],
			variables: [variable('API_URL'), variable('REGION')],
		};

		expect(() => packageRequirementsSchema.parse(requirements)).not.toThrow();
	});

	it('rejects duplicate credential ids', () => {
		const requirements = { credentials: [credential('cred-1'), credential('cred-1')] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(
			/Duplicate credential id: cred-1/,
		);
	});

	it('rejects duplicate variable names', () => {
		const requirements = { variables: [variable('API_URL'), variable('API_URL')] };

		expect(() => packageRequirementsSchema.parse(requirements)).toThrow(
			/Duplicate variable name: API_URL/,
		);
	});
});
