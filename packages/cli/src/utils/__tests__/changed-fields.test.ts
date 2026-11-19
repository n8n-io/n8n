import { getChangedFields } from '../changed-fields';

describe('getChangedFields', () => {
	it('returns the names of the fields whose value changed, in key order', () => {
		expect(
			getChangedFields(
				{ loginEnabled: false, loginLabel: 'SSO', mapping: { email: 'mail' } },
				{ loginEnabled: true, loginLabel: 'SSO', mapping: { email: 'email' } },
			),
		).toEqual(['loginEnabled', 'mapping']);
	});

	it('compares nested values structurally', () => {
		expect(
			getChangedFields(
				{ signatureConfig: { prefix: 'ds', location: { reference: '/a', action: 'after' } } },
				{ signatureConfig: { location: { action: 'after', reference: '/a' }, prefix: 'ds' } },
			),
		).toEqual([]);
	});

	it('reports fields that were added or removed', () => {
		expect(
			getChangedFields({ metadataUrl: 'https://idp.example.com' }, { metadata: '<xml/>' }),
		).toEqual(['metadataUrl', 'metadata']);
	});

	it('treats a missing field and an undefined value as equal', () => {
		expect(getChangedFields({ metadataUrl: undefined }, {})).toEqual([]);
	});

	it('accepts undefined snapshots', () => {
		expect(getChangedFields(undefined, { loginEnabled: true })).toEqual(['loginEnabled']);
		expect(getChangedFields(undefined, undefined)).toEqual([]);
	});
});
