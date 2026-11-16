import { MANAGED_VERSION_KEY } from 'n8n-workflow';

import {
	hasClientFields,
	hasInvalidStoredVersion,
	isManagedVersion,
	isManagedVersionEntry,
	nearestValue,
	readStoredVersion,
} from '@/managed-versions';

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

	describe('hasInvalidStoredVersion', () => {
		it.each([
			['a string', '2'],
			['zero', 0],
			['a fraction', 1.5],
			['null', null],
		])('should flag %s as an invalid stored version', (_name, value) => {
			expect(hasInvalidStoredVersion({ oauthTokenData: { [MANAGED_VERSION_KEY]: value } })).toBe(
				true,
			);
		});

		it.each([
			['a valid version', { oauthTokenData: { [MANAGED_VERSION_KEY]: 2 } }],
			['no version key', { oauthTokenData: { access_token: 't' } }],
			['an undefined version', { oauthTokenData: { [MANAGED_VERSION_KEY]: undefined } }],
			['no token data', { clientId: 'a' }],
			['token data that is not an object', { oauthTokenData: 'encrypted' }],
		])('should not flag %s', (_name, data) => {
			expect(hasInvalidStoredVersion(data)).toBe(false);
		});
	});

	describe('nearestValue', () => {
		it('should return the value of the type before the value of a parent', () => {
			expect(nearestValue('child', ['parent'], { child: 1, parent: 2 })).toBe(1);
		});

		it('should return the value of the nearest parent that has one', () => {
			expect(nearestValue('child', ['near', 'far'], { far: 3 })).toBe(3);
		});

		it('should ignore names that the object only inherits', () => {
			expect(nearestValue('toString', [], {})).toBeUndefined();
		});
	});

	describe('hasClientFields', () => {
		const fields = ['clientId', 'clientSecret'];

		it('should be true when every client field is set', () => {
			expect(hasClientFields({ clientId: 'a', clientSecret: 'b', scope: 'x' }, fields)).toBe(true);
		});

		it.each([
			['a missing field', { clientId: 'a' }],
			['an empty field', { clientId: 'a', clientSecret: '' }],
			['a null field', { clientId: 'a', clientSecret: null }],
			['no client fields', { scope: 'x' }],
		])('should be false for %s', (_name, entry) => {
			expect(hasClientFields(entry, fields)).toBe(false);
		});
	});
});
