import type { INodeProperties } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import { DCR_MANAGED_CREDENTIAL_FIELDS, OAUTH_PINNED_FIELDS } from '@/oauth/dcr-managed-fields';

import {
	CredentialFieldTargetValidator,
	getTargetFieldName,
	isProtectedCredentialField,
} from '../credential-field-target';

const prop = (name: string, type: INodeProperties['type'] = 'string') => ({ name, type });

describe('isProtectedCredentialField', () => {
	const none = { overwriteKeys: [], properties: [] };

	it.each([...OAUTH_PINNED_FIELDS, ...DCR_MANAGED_CREDENTIAL_FIELDS])(
		'protects the n8n-owned field %s',
		(name) => {
			expect(isProtectedCredentialField(name, none)).toBe(true);
		},
	);

	it.each(['allowedHttpRequestDomains', 'allowedDomains'])('protects %s', (name) => {
		expect(isProtectedCredentialField(name, none)).toBe(true);
	});

	it('protects a hidden field and not a visible one', () => {
		const properties = [prop('secretSalt', 'hidden'), prop('apiKey')];
		expect(isProtectedCredentialField('secretSalt', { overwriteKeys: [], properties })).toBe(true);
		expect(isProtectedCredentialField('apiKey', { overwriteKeys: [], properties })).toBe(false);
	});

	it('protects a field that the instance overwrites', () => {
		const options = { overwriteKeys: new Set(['apiKey']), properties: [prop('apiKey')] };
		expect(isProtectedCredentialField('apiKey', options)).toBe(true);
		expect(isProtectedCredentialField('other', options)).toBe(false);
	});
});

describe('getTargetFieldName', () => {
	it('returns the field of a field transform only', () => {
		expect(getTargetFieldName('field:value')).toBe('value');
		expect(getTargetFieldName('bearer')).toBeUndefined();
		expect(getTargetFieldName(undefined)).toBeUndefined();
	});
});

describe('CredentialFieldTargetValidator', () => {
	const credentialTypes = mock<CredentialTypes>();
	const overwrites = mock<CredentialsOverwrites>();
	const validator = new CredentialFieldTargetValidator(credentialTypes, overwrites);

	const types: Record<string, { parents: string[]; properties: Array<Partial<INodeProperties>> }> =
		{
			child: { parents: ['parent'], properties: [prop('childField')] },
			parent: { parents: [], properties: [prop('parentField'), prop('hiddenField', 'hidden')] },
			oauth: {
				parents: [],
				properties: [prop('authUrl', 'hidden'), prop('clientId'), prop('scope')],
			},
		};

	beforeEach(() => {
		vi.clearAllMocks();
		credentialTypes.recognizes.mockImplementation((type) => type in types);
		credentialTypes.getParentTypes.mockImplementation((type) => types[type]?.parents ?? []);
		credentialTypes.getByName.mockImplementation(
			(type) => ({ name: type, properties: types[type].properties }) as never,
		);
		overwrites.getOverwrites.mockReturnValue(undefined);
	});

	it('allows a visible field of the type', () => {
		expect(validator.getError('child', 'field:childField')).toBeUndefined();
	});

	it('allows a visible field inherited from a parent type', () => {
		expect(validator.getError('child', 'field:parentField')).toBeUndefined();
	});

	it('does not check the bearer transform or a missing transform', () => {
		expect(validator.getError('oauth', 'bearer')).toBeUndefined();
		expect(validator.getError('oauth', undefined)).toBeUndefined();
	});

	it('does not check an unknown credential type', () => {
		expect(validator.getError('nope', 'field:x')).toBeUndefined();
	});

	it('names the missing field', () => {
		expect(validator.getError('child', 'field:missing')).toBe(
			'Credential type "child" has no field "missing"',
		);
	});

	it.each([
		['a hidden field inherited from a parent', 'child', 'field:hiddenField'],
		['a pinned OAuth field', 'oauth', 'field:authUrl'],
		['a DCR managed field', 'oauth', 'field:clientId'],
	])('refuses %s', (_name, type, transform) => {
		expect(validator.getError(type, transform)).toMatch(/controlled by n8n/);
	});

	it('refuses a field that the instance overwrites, parent overwrites included', () => {
		overwrites.getOverwrites.mockReturnValue({ parentField: 'x' });
		expect(validator.getError('child', 'field:parentField')).toMatch(/controlled by n8n/);
		expect(overwrites.getOverwrites).toHaveBeenCalledWith('child');
	});

	it('refuses allowedDomains fields', () => {
		types.child.properties.push(prop('allowedHttpRequestDomains'), prop('allowedDomains'));
		expect(validator.getError('child', 'field:allowedHttpRequestDomains')).toMatch(/controlled/);
		expect(validator.getError('child', 'field:allowedDomains')).toMatch(/controlled/);
		types.child.properties.length = 1;
	});
});
