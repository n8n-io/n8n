import { CREDENTIAL_DESCRIPTION_MAX_LENGTH } from '../../../schemas/credential-description.schema';
import { serializedCredentialSchema } from '../credential.schema';

describe('serializedCredentialSchema', () => {
	it('accepts a data-less credential', () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi' };

		expect(() => serializedCredentialSchema.parse(credential)).not.toThrow();
	});

	it.each(['Prod key', null, undefined])('accepts the description %s', (description) => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi', description };

		expect(() => serializedCredentialSchema.parse(credential)).not.toThrow();
	});

	it('rejects a description over the length limit', () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			description: 'x'.repeat(CREDENTIAL_DESCRIPTION_MAX_LENGTH + 1),
		};

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('rejects a description that is not a string', () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi', description: 5 };

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('accepts nested expression data', () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			data: {
				token: '={{ $secrets.github.token }}',
				nested: { deep: '={{ $vars.x }}' },
				list: ['={{ $vars.y }}'],
			},
		};

		expect(() => serializedCredentialSchema.parse(credential)).not.toThrow();
	});

	it('accepts plain boolean, string and string list values', () => {
		// The package reader decides which plain values stay. The schema checks the shape only.
		const credential = {
			id: 'cred-1',
			name: 'Postgres',
			type: 'postgres',
			data: {
				allowUnauthorizedCerts: false,
				ssl: 'require',
				scopes: ['read', 'write'],
				caCertificate: '={{ $secrets.ca }}',
			},
		};

		expect(() => serializedCredentialSchema.parse(credential)).not.toThrow();
	});

	it('rejects a number value in data', () => {
		const credential = {
			id: 'cred-1',
			name: 'Postgres',
			type: 'postgres',
			data: { port: 5432 },
		};

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('rejects a null value in data', () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			data: { token: null },
		};

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('rejects unknown keys such as encrypted DB data', () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi', shared: [] };

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('rejects an empty id', () => {
		const credential = { id: '', name: 'GitHub', type: 'githubApi' };

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});
});
