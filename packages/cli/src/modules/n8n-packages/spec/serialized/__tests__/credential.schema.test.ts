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

	it('rejects a literal leaf in data', () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			data: { token: 'ghp_plaintextsecret' },
		};

		expect(() => serializedCredentialSchema.parse(credential)).toThrow();
	});

	it('rejects a nested literal leaf in data', () => {
		const credential = {
			id: 'cred-1',
			name: 'GitHub',
			type: 'githubApi',
			data: { nested: { token: '={{ $vars.ok }}', leak: 'secret' } },
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
