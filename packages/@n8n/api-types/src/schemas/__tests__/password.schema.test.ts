import { createPasswordSchema, passwordSchema } from '../../index';

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

describe('createPasswordSchema', () => {
	test('should create a schema with custom min length', () => {
		const schema = createPasswordSchema(12);

		expect(() => schema.parse('Abcdefgh1')).toThrow('Password must be 12 to 64 characters long.');
		expect(schema.parse('Abcdefghijk1')).toBe('Abcdefghijk1');
	});
});

describe('passwordSchema with N8N_PASSWORD_MIN_LENGTH', () => {
	const originalEnv = process.env;

	afterEach(() => {
		process.env = originalEnv;
	});

	const importFreshSchema = async () => {
		vi.resetModules();
		return await import('../password.schema');
	};

	test('should use custom min length from env var', async () => {
		process.env = { ...originalEnv, N8N_PASSWORD_MIN_LENGTH: '12' };

		const { passwordSchema: schema, passwordMinLength } = await importFreshSchema();

		expect(passwordMinLength).toBe(12);
		expect(() => schema.parse('Abcdefgh1')).toThrow('Password must be 12 to 64 characters long.');
		expect(schema.parse('Abcdefghijk1')).toBe('Abcdefghijk1');
	});

	test('should floor at 8 when env var is below minimum', async () => {
		process.env = { ...originalEnv, N8N_PASSWORD_MIN_LENGTH: '3' };

		const { passwordMinLength } = await importFreshSchema();

		expect(passwordMinLength).toBe(8);
	});

	test('should fall back to 8 when env var is non-numeric', async () => {
		process.env = { ...originalEnv, N8N_PASSWORD_MIN_LENGTH: 'abc' };

		const { passwordMinLength } = await importFreshSchema();

		expect(passwordMinLength).toBe(8);
	});

	test('should clamp to 64 when env var exceeds max length', async () => {
		process.env = { ...originalEnv, N8N_PASSWORD_MIN_LENGTH: '100' };

		const { passwordMinLength } = await importFreshSchema();

		expect(passwordMinLength).toBe(64);
	});
});
