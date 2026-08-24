import type { GitAuthResult } from '../git-connections-auth.utils';

describe('computeAuthenticationUpdate type contract', () => {
	// Regression guard for the nullability hole: the helper's return type has a
	// non-nullable connectionType, so a future edit that produces a null
	// connectionType (which callers Object.assign onto the entity's non-nullable
	// column) is a compile error rather than a silent bad write.
	it('rejects a null connectionType in the computed result at compile time', () => {
		const result: GitAuthResult = {
			// @ts-expect-error connectionType is non-nullable; null must not typecheck.
			connectionType: null,
			publicKey: null,
			encryptedPrivateKey: null,
			encryptedUsername: null,
			encryptedPassword: null,
			keyGeneratorType: null,
		};

		expect(result.connectionType).toBeNull();
	});
});
