import { UserError } from 'n8n-workflow';

import { credentialField, requireCredentialField } from '../credential-fields';

describe('credentialField', () => {
	it('trims a pasted value', () => {
		expect(credentialField({ clientId: '  abc  ' }, 'clientId')).toBe('abc');
	});

	it.each([
		['a missing field', {}],
		['a non-string field', { clientId: 42 }],
		['a whitespace-only field', { clientId: '   ' }],
		['a non-record credential', undefined],
	])('returns an empty string for %s', (_case, credential) => {
		expect(credentialField(credential, 'clientId')).toBe('');
	});
});

describe('requireCredentialField', () => {
	it('returns the trimmed value', () => {
		expect(requireCredentialField({ clientId: ' abc ' }, 'clientId', 'boom')).toBe('abc');
	});

	it.each([
		['a missing field', {}],
		['a non-string field', { clientId: 42 }],
		['a whitespace-only field', { clientId: '   ' }],
	])("throws the caller's message for %s", (_case, credential) => {
		expect(() => requireCredentialField(credential, 'clientId', 'Needs a client ID.')).toThrow(
			UserError,
		);
		expect(() => requireCredentialField(credential, 'clientId', 'Needs a client ID.')).toThrow(
			'Needs a client ID.',
		);
	});
});
