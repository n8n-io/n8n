import { serializedCredentialSchema } from '../credential.schema';

describe('serializedCredentialSchema', () => {
	it('accepts a data-less credential', () => {
		const credential = { id: 'cred-1', name: 'GitHub', type: 'githubApi' };

		expect(() => serializedCredentialSchema.parse(credential)).not.toThrow();
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
