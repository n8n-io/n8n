import { PasswordService } from '@/services/password.service';
import Container from 'typedi';

function toComponents(hash: string) {
	const BCRYPT_HASH_REGEX =
		/^\$(?<version>.{2})\$(?<costFactor>\d{2})\$(?<salt>.{22})(?<hashedPassword>.{31})$/;

	const match = hash.match(BCRYPT_HASH_REGEX);

	if (!match?.groups) throw new Error('Invalid bcrypt hash format');

	return match.groups;
}

describe('PasswordService', () => {
	const passwordService = Container.get(PasswordService);

	describe('hash()', () => {
		test('should hash a plaintext password', async () => {
			const plaintext = 'abcd1234X';
			const hashed = await passwordService.hash(plaintext);

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
			const hashed = await passwordService.hash(plaintext);

			const isMatch = await passwordService.compare(plaintext, hashed);

			expect(isMatch).toBe(true);
		});

		test('should return false on mismatch', async () => {
			const secondPlaintext = 'abcd1234Y';
			const hashed = await passwordService.hash('abcd1234X');

			const isMatch = await passwordService.compare(secondPlaintext, hashed);

			expect(isMatch).toBe(false);
		});
	});

	describe('validate()', () => {
		test('should throw on empty password', () => {
			const check = () => passwordService.validate();

			expect(check).toThrowError('Password is mandatory');
		});

		test('should return same password if valid', () => {
			const validPassword = 'abcd1234X';

			const validated = passwordService.validate(validPassword);

			expect(validated).toBe(validPassword);
		});

		test('should require at least one uppercase letter', () => {
			const invalidPassword = 'abcd1234';

			const failingCheck = () => passwordService.validate(invalidPassword);

			expect(failingCheck).toThrowError('Password must contain at least 1 uppercase letter.');
		});

		test('should require at least one number', () => {
			const validPassword = 'abcd1234X';
			const invalidPassword = 'abcdEFGH';

			const validated = passwordService.validate(validPassword);

			expect(validated).toBe(validPassword);

			const check = () => passwordService.validate(invalidPassword);

			expect(check).toThrowError('Password must contain at least 1 number.');
		});

		test('should require a minimum length of 8 characters', () => {
			const invalidPassword = 'a'.repeat(7);

			const check = () => passwordService.validate(invalidPassword);

			expect(check).toThrowError('Password must be 8 to 64 characters long.');
		});

		test('should require a maximum length of 64 characters', () => {
			const invalidPassword = 'a'.repeat(65);

			const check = () => passwordService.validate(invalidPassword);

			expect(check).toThrowError('Password must be 8 to 64 characters long.');
		});
	});
});
