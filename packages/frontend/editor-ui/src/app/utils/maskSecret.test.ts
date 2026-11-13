import { maskSecret, maskSecretParts } from './maskSecret';

describe('maskSecret', () => {
	it('keeps the first and the last four characters by default', () => {
		expect(maskSecret('abcd1234567890wxyz')).toBe('abcd••••••••wxyz');
	});

	it('keeps a longer start when asked', () => {
		expect(maskSecret('n8n_scim_Q1abnpRsYXQcxzQn', 'n8n_scim_'.length)).toBe(
			'n8n_scim_••••••••xzQn',
		);
	});

	it('returns a value that is too short to mask unchanged', () => {
		expect(maskSecret('abcd1234')).toBe('abcd1234');
	});
});

describe('maskSecretParts', () => {
	it('puts the mask between the known start and end', () => {
		expect(maskSecretParts('n8n_scim_', 'xzQn')).toBe('n8n_scim_••••••••xzQn');
	});
});
