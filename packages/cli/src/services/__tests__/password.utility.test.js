'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const password_utility_1 = require('@/services/password.utility');
function toComponents(hash) {
	const BCRYPT_HASH_REGEX =
		/^\$(?<version>.{2})\$(?<costFactor>\d{2})\$(?<salt>.{22})(?<hashedPassword>.{31})$/;
	const match = hash.match(BCRYPT_HASH_REGEX);
	if (!match?.groups) throw new Error('Invalid bcrypt hash format');
	return match.groups;
}
describe('PasswordUtility', () => {
	const passwordUtility = di_1.Container.get(password_utility_1.PasswordUtility);
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
	});
});
//# sourceMappingURL=password.utility.test.js.map
