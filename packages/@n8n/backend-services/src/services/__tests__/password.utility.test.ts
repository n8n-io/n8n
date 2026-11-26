import { Container } from '@n8n/di';

import { DUMMY_PASSWORD_HASH, PasswordUtility } from '../password.utility';

function toComponents(hash: string) {
	const BCRYPT_HASH_REGEX =
		/^\$(?<version>.{2})\$(?<costFactor>\d{2})\$(?<salt>.{22})(?<hashedPassword>.{31})$/;

	const match = hash.match(BCRYPT_HASH_REGEX);

	if (!match?.groups) throw new Error('Invalid bcrypt hash format');

	return match.groups;
}

describe('PasswordUtility', () => {
	const passwordUtility = Container.get(PasswordUtility);

	describe('hash()', () => {
		test('should hash a plaintext password', async () => {
			const plaintext = 'abcd1234X';
			const hashed = await passwordUtility.hash(plaintext);

			const { version, costFactor, salt, hashedPassword } = toComponents(hashed);

			expect(version).toBe('2a');
			expect(costFactor).toBe('10');
			expect(salt).toHaveLength(22);
			expect(hashedPassword).toHaveLength(31);
		});
	});

	describe('compare()', () => {
		test('should return true on match', async () => {
			const plaintext = 'abcd1234X';
			const hashed = await passwordUtility.hash(plaintext);

			const isMatch = await passwordUtility.compare(plaintext, hashed);

			expect(isMatch).toBe(true);
		});

		test('should return false on mismatch', async () => {
			const secondPlaintext = 'abcd1234Y';
			const hashed = await passwordUtility.hash('abcd1234X');

			const isMatch = await passwordUtility.compare(secondPlaintext, hashed);

			expect(isMatch).toBe(false);
		});

		test('should return false when no hash is stored', async () => {
			const isMatch = await passwordUtility.compare('abcd1234X', null);

			expect(isMatch).toBe(false);
		});

		test('should return false when the stored value is not a bcrypt hash', async () => {
			const isMatch = await passwordUtility.compare('no password set', 'no password set');

			expect(isMatch).toBe(false);
		});
	});

	describe('DUMMY_PASSWORD_HASH', () => {
		test('should use the same cost factor as hash()', async () => {
			const hashed = await passwordUtility.hash('abcd1234X');

			expect(toComponents(DUMMY_PASSWORD_HASH).costFactor).toBe(toComponents(hashed).costFactor);
		});
	});
});
