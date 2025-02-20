import { passwordSchema } from '../password.schema';

describe('passwordSchema', () => {
	test('should throw on empty password', () => {
		const check = () => passwordSchema.parse('');

		expect(check).toThrowError('Password must be 8 to 64 characters long');
	});

	test('should return same password if valid', () => {
		const validPassword = 'abcd1234X';

		const validated = passwordSchema.parse(validPassword);

		expect(validated).toBe(validPassword);
	});

	test('should require at least one uppercase letter', () => {
		const invalidPassword = 'abcd1234';

		const failingCheck = () => passwordSchema.parse(invalidPassword);

		expect(failingCheck).toThrowError('Password must contain at least 1 uppercase letter.');
	});

	test('should require at least one number', () => {
		const validPassword = 'abcd1234X';
		const invalidPassword = 'abcdEFGH';

		const validated = passwordSchema.parse(validPassword);

		expect(validated).toBe(validPassword);

		const check = () => passwordSchema.parse(invalidPassword);

		expect(check).toThrowError('Password must contain at least 1 number.');
	});

	test('should require a minimum length of 8 characters', () => {
		const invalidPassword = 'a'.repeat(7);

		const check = () => passwordSchema.parse(invalidPassword);

		expect(check).toThrowError('Password must be 8 to 64 characters long.');
	});

	test('should require a maximum length of 64 characters', () => {
		const invalidPassword = 'a'.repeat(65);

		const check = () => passwordSchema.parse(invalidPassword);

		expect(check).toThrowError('Password must be 8 to 64 characters long.');
	});
});
