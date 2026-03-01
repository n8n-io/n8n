import {
	credentialResolverIdSchema,
	credentialResolverNameSchema,
	credentialResolverTypeNameSchema,
	credentialResolverTypeSchema,
	credentialResolverTypesSchema,
	credentialResolverConfigSchema,
	credentialResolverSchema,
	credentialResolversSchema,
} from '../credential-resolver.schema';

describe('credential-resolver.schema', () => {
	describe('credentialResolverIdSchema', () => {
		test.each([
			{ name: 'valid UUID', value: '550e8400-e29b-41d4-a716-446655440000', expected: true },
			{ name: 'short ID', value: 'abc123', expected: true },
			{ name: 'nanoid', value: 'V1StGXR8_Z5jdHi6B-myT', expected: true },
			{ name: 'ID at max length (36 chars)', value: 'a'.repeat(36), expected: true },
			{ name: 'ID too long (37 chars)', value: 'a'.repeat(37), expected: false },
			{ name: 'empty ID', value: '', expected: true }, // zod string allows empty by default
		])('should validate $name', ({ value, expected }) => {
			const result = credentialResolverIdSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('credentialResolverNameSchema', () => {
		test.each([
			{ name: 'valid name', value: 'Test Resolver', expected: true },
			{ name: 'minimum length (1 char)', value: 'A', expected: true },
			{ name: 'maximum length (255 chars)', value: 'a'.repeat(255), expected: true },
			{ name: 'name with special chars', value: 'Test-Resolver_123', expected: true },
			{ name: 'name with unicode', value: 'Tëst Rësölvër 🚀', expected: true },
			{ name: 'empty name', value: '', expected: false },
			{ name: 'whitespace-only name', value: '   ', expected: false },
			{ name: 'name too long (256 chars)', value: 'a'.repeat(256), expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = credentialResolverNameSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});

		test('should trim whitespace', () => {
			const result = credentialResolverNameSchema.safeParse('  Test Resolver  ');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('Test Resolver');
			}
		});
	});

	describe('credentialResolverTypeNameSchema', () => {
		test.each([
			{ name: 'valid type', value: 'credential-resolver.test-1.0', expected: true },
			{ name: 'simple type', value: 'simple', expected: true },
			{ name: 'type with dots', value: 'resolver.aws.v2', expected: true },
			{ name: 'minimum length (1 char)', value: 'A', expected: true },
			{ name: 'maximum length (255 chars)', value: 'a'.repeat(255), expected: true },
			{ name: 'empty type', value: '', expected: false },
			{ name: 'whitespace-only type', value: '   ', expected: false },
			{ name: 'type too long (256 chars)', value: 'a'.repeat(256), expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = credentialResolverTypeNameSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});

		test('should trim whitespace', () => {
			const result = credentialResolverTypeNameSchema.safeParse('  credential-resolver.test-1.0  ');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('credential-resolver.test-1.0');
			}
		});
	});

	describe('credentialResolverTypeSchema', () => {
		const validType = {
			name: 'credential-resolver.test-1.0',
			displayName: 'Test Resolver',
			description: 'A test resolver for testing',
			options: [{ key: 'value' }],
		};

		test('should validate complete type object', () => {
			const result = credentialResolverTypeSchema.safeParse(validType);
			expect(result.success).toBe(true);
		});

		test('should allow missing optional description', () => {
			const { description, ...typeWithoutDescription } = validType;
			const result = credentialResolverTypeSchema.safeParse(typeWithoutDescription);
			expect(result.success).toBe(true);
		});

		test('should allow missing optional options', () => {
			const { options, ...typeWithoutOptions } = validType;
			const result = credentialResolverTypeSchema.safeParse(typeWithoutOptions);
			expect(result.success).toBe(true);
		});

		test('should allow empty description', () => {
			const typeWithEmptyDescription = { ...validType, description: '' };
			const result = credentialResolverTypeSchema.safeParse(typeWithEmptyDescription);
			expect(result.success).toBe(true);
		});

		test('should allow empty options array', () => {
			const typeWithEmptyOptions = { ...validType, options: [] };
			const result = credentialResolverTypeSchema.safeParse(typeWithEmptyOptions);
			expect(result.success).toBe(true);
		});

		test.each([
			{
				name: 'missing name',
				data: { ...validType, name: undefined },
				expectedErrorPath: ['name'],
			},
			{
				name: 'missing displayName',
				data: { ...validType, displayName: undefined },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'empty name',
				data: { ...validType, name: '' },
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty displayName',
				data: { ...validType, displayName: '' },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'whitespace-only name',
				data: { ...validType, name: '   ' },
				expectedErrorPath: ['name'],
			},
			{
				name: 'whitespace-only displayName',
				data: { ...validType, displayName: '   ' },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'name too long (256 chars)',
				data: { ...validType, name: 'a'.repeat(256) },
				expectedErrorPath: ['name'],
			},
			{
				name: 'displayName too long (256 chars)',
				data: { ...validType, displayName: 'a'.repeat(256) },
				expectedErrorPath: ['displayName'],
			},
			{
				name: 'description too long (1025 chars)',
				data: { ...validType, description: 'a'.repeat(1025) },
				expectedErrorPath: ['description'],
			},
			{
				name: 'options as string',
				data: { ...validType, options: 'invalid' },
				expectedErrorPath: ['options'],
			},
			{
				name: 'options as object',
				data: { ...validType, options: { key: 'value' } },
				expectedErrorPath: ['options'],
			},
		])('should fail validation for $name', ({ data, expectedErrorPath }) => {
			const result = credentialResolverTypeSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(expectedErrorPath);
			}
		});

		test('should trim name', () => {
			const typeWithWhitespace = { ...validType, name: '  test-resolver  ' };
			const result = credentialResolverTypeSchema.safeParse(typeWithWhitespace);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('test-resolver');
			}
		});

		test('should trim displayName', () => {
			const typeWithWhitespace = { ...validType, displayName: '  Test Resolver  ' };
			const result = credentialResolverTypeSchema.safeParse(typeWithWhitespace);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.displayName).toBe('Test Resolver');
			}
		});

		test('should trim description', () => {
			const typeWithWhitespace = { ...validType, description: '  A test resolver  ' };
			const result = credentialResolverTypeSchema.safeParse(typeWithWhitespace);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.description).toBe('A test resolver');
			}
		});
	});

	describe('credentialResolverTypesSchema', () => {
		const validType1 = {
			name: 'credential-resolver.test-1.0',
			displayName: 'Test Resolver',
			description: 'A test resolver for testing',
			options: [{ key: 'value' }],
		};

		const validType2 = {
			name: 'credential-resolver.aws-1.0',
			displayName: 'AWS Resolver',
		};

		test('should validate empty array', () => {
			const result = credentialResolverTypesSchema.safeParse([]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual([]);
			}
		});

		test('should validate array with single type', () => {
			const result = credentialResolverTypesSchema.safeParse([validType1]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(1);
			}
		});

		test('should validate array with multiple types', () => {
			const result = credentialResolverTypesSchema.safeParse([validType1, validType2]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
			}
		});

		test('should fail if any type is invalid', () => {
			const invalidType = { ...validType1, name: '' };
			const result = credentialResolverTypesSchema.safeParse([validType1, invalidType]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual([1, 'name']);
			}
		});

		test('should fail for non-array input', () => {
			const result = credentialResolverTypesSchema.safeParse(validType1);
			expect(result.success).toBe(false);
		});
	});

	describe('credentialResolverConfigSchema', () => {
		test.each([
			{ name: 'empty object', value: {}, expected: true },
			{ name: 'simple config', value: { prefix: 'test-' }, expected: true },
			{
				name: 'complex config',
				value: {
					region: 'us-east-1',
					timeout: 5000,
					nested: { value: true },
				},
				expected: true,
			},
			{
				name: 'config with various types',
				value: {
					stringValue: 'value',
					numberValue: 123,
					booleanValue: true,
					nullValue: null,
					arrayValue: [1, 2, 3],
					objectValue: { key: 'value' },
				},
				expected: true,
			},
			{ name: 'string instead of object', value: 'invalid', expected: false },
			{ name: 'array instead of object', value: [], expected: false },
			{ name: 'null instead of object', value: null, expected: false },
			{ name: 'number instead of object', value: 123, expected: false },
		])('should validate $name', ({ value, expected }) => {
			const result = credentialResolverConfigSchema.safeParse(value);
			expect(result.success).toBe(expected);
		});
	});

	describe('credentialResolverSchema', () => {
		const validResolver = {
			id: 'resolver-123',
			name: 'Test Resolver',
			type: 'credential-resolver.test-1.0',
			config: 'encrypted-config-string',
			decryptedConfig: { test: 'value' },
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		};

		test('should validate complete resolver object', () => {
			const result = credentialResolverSchema.safeParse(validResolver);
			expect(result.success).toBe(true);
		});

		test('should allow missing optional decryptedConfig', () => {
			const { decryptedConfig, ...resolverWithoutDecrypted } = validResolver;
			const result = credentialResolverSchema.safeParse(resolverWithoutDecrypted);
			expect(result.success).toBe(true);
		});

		test.each([
			{
				name: 'missing id',
				data: { ...validResolver, id: undefined },
				expectedErrorPath: ['id'],
			},
			{
				name: 'missing name',
				data: { ...validResolver, name: undefined },
				expectedErrorPath: ['name'],
			},
			{
				name: 'missing type',
				data: { ...validResolver, type: undefined },
				expectedErrorPath: ['type'],
			},
			{
				name: 'missing config',
				data: { ...validResolver, config: undefined },
				expectedErrorPath: ['config'],
			},
			{
				name: 'missing createdAt',
				data: { ...validResolver, createdAt: undefined },
				expectedErrorPath: ['createdAt'],
			},
			{
				name: 'missing updatedAt',
				data: { ...validResolver, updatedAt: undefined },
				expectedErrorPath: ['updatedAt'],
			},
			{
				name: 'invalid createdAt format',
				data: { ...validResolver, createdAt: 'invalid-date' },
				expectedErrorPath: ['createdAt'],
			},
			{
				name: 'config as object instead of string',
				data: { ...validResolver, config: { key: 'value' } },
				expectedErrorPath: ['config'],
			},
		])('should fail validation for $name', ({ data, expectedErrorPath }) => {
			const result = credentialResolverSchema.safeParse(data);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual(expectedErrorPath);
			}
		});

		test('should accept date strings and coerce to Date', () => {
			const resolverWithStringDates = {
				...validResolver,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			};
			const result = credentialResolverSchema.safeParse(resolverWithStringDates);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.createdAt).toBeInstanceOf(Date);
				expect(result.data.updatedAt).toBeInstanceOf(Date);
			}
		});

		test('should accept Date objects directly', () => {
			const result = credentialResolverSchema.safeParse(validResolver);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.createdAt).toBeInstanceOf(Date);
				expect(result.data.updatedAt).toBeInstanceOf(Date);
			}
		});
	});

	describe('credentialResolversSchema', () => {
		const validResolver1 = {
			id: 'resolver-1',
			name: 'Test Resolver 1',
			type: 'credential-resolver.test-1.0',
			config: 'encrypted-config-1',
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		};

		const validResolver2 = {
			id: 'resolver-2',
			name: 'Test Resolver 2',
			type: 'credential-resolver.test-2.0',
			config: 'encrypted-config-2',
			decryptedConfig: { prefix: 'test-' },
			createdAt: new Date('2024-01-03T00:00:00.000Z'),
			updatedAt: new Date('2024-01-04T00:00:00.000Z'),
		};

		test('should validate empty array', () => {
			const result = credentialResolversSchema.safeParse([]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual([]);
			}
		});

		test('should validate array with single resolver', () => {
			const result = credentialResolversSchema.safeParse([validResolver1]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(1);
			}
		});

		test('should validate array with multiple resolvers', () => {
			const result = credentialResolversSchema.safeParse([validResolver1, validResolver2]);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
			}
		});

		test('should fail if any resolver is invalid', () => {
			const invalidResolver = { ...validResolver1, name: '' };
			const result = credentialResolversSchema.safeParse([validResolver1, invalidResolver]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toEqual([1, 'name']);
			}
		});

		test('should fail for non-array input', () => {
			const result = credentialResolversSchema.safeParse(validResolver1);
			expect(result.success).toBe(false);
		});
	});
});
