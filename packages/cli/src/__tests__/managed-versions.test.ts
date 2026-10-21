import { MANAGED_VERSION_KEY } from 'n8n-workflow';

import { isManagedVersion, isManagedVersionEntry, readStoredVersion } from '@/managed-versions';

describe('managed-versions', () => {
	describe('isManagedVersion', () => {
		it.each([1, 2, 10])('should accept %s', (value) => {
			expect(isManagedVersion(value)).toBe(true);
		});

		it.each([0, -1, 1.5, '1', null, undefined, Number.NaN])('should reject %s', (value) => {
			expect(isManagedVersion(value)).toBe(false);
		});
	});

	describe('isManagedVersionEntry', () => {
		it('should accept an entry with an integer version', () => {
			expect(isManagedVersionEntry({ version: 2, clientId: 'a', clientSecret: 'b' })).toBe(true);
		});

		it.each([{ clientId: 'a' }, { version: '2' }, { version: 0 }, [], null, 'x'])(
			'should reject %j',
			(value) => {
				expect(isManagedVersionEntry(value)).toBe(false);
			},
		);
	});

	describe('readStoredVersion', () => {
		it('should read the version stored next to the tokens', () => {
			const data = { oauthTokenData: { access_token: 't', [MANAGED_VERSION_KEY]: 2 } };

			expect(readStoredVersion(data)).toBe(2);
		});

		it('should return undefined when the credential has no token data', () => {
			expect(readStoredVersion({ clientId: 'a' })).toBeUndefined();
		});

		it('should return undefined when the token data has no version', () => {
			expect(readStoredVersion({ oauthTokenData: { access_token: 't' } })).toBeUndefined();
		});

		it('should ignore a stored value that is not a valid version', () => {
			expect(readStoredVersion({ oauthTokenData: { [MANAGED_VERSION_KEY]: '2' } })).toBeUndefined();
		});

		it('should return undefined when the token data is not an object', () => {
			expect(readStoredVersion({ oauthTokenData: 'encrypted' })).toBeUndefined();
		});
	});
});
