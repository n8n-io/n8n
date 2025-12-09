import { CreateCredentialResolverDto } from '../create-credential-resolver.dto';

describe('CreateCredentialResolverDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'basic valid resolver',
				data: {
					name: 'Test Resolver',
					type: 'credential-resolver.stub-1.0',
					config: { prefix: 'test-' },
				},
			},
			{
				name: 'resolver with complex config',
				data: {
					name: 'AWS Secrets Manager',
					type: 'credential-resolver.aws-secrets-1.0',
					config: {
						region: 'us-east-1',
						accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
						secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
					},
				},
			},
			{
				name: 'resolver with empty config',
				data: {
					name: 'Simple Resolver',
					type: 'credential-resolver.simple-1.0',
					config: {},
				},
			},
			{
				name: 'resolver with minimum name length',
				data: {
					name: 'A',
					type: 'type',
					config: {},
				},
			},
		])('should succeed validation for $name', ({ data }) => {
			const result = CreateCredentialResolverDto.safeParse(data);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe(data.name);
				expect(result.data.type).toBe(data.type);
				expect(result.data.config).toEqual(data.config);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing name',
				data: {
					type: 'credential-resolver.stub-1.0',
					config: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'missing type',
				data: {
					name: 'Test Resolver',
					config: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'missing config',
				data: {
					name: 'Test Resolver',
					type: 'credential-resolver.stub-1.0',
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'empty name',
				data: {
					name: '',
					type: 'credential-resolver.stub-1.0',
					config: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'whitespace-only name',
				data: {
					name: '   ',
					type: 'credential-resolver.stub-1.0',
					config: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long (>255 chars)',
				data: {
					name: 'a'.repeat(256),
					type: 'credential-resolver.stub-1.0',
					config: {},
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty type',
				data: {
					name: 'Test Resolver',
					type: '',
					config: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'whitespace-only type',
				data: {
					name: 'Test Resolver',
					type: '   ',
					config: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'type too long (>255 chars)',
				data: {
					name: 'Test Resolver',
					type: 'a'.repeat(256),
					config: {},
				},
				expectedErrorPath: ['type'],
			},
			{
				name: 'config as string',
				data: {
					name: 'Test Resolver',
					type: 'credential-resolver.stub-1.0',
					config: 'invalid',
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'config as array',
				data: {
					name: 'Test Resolver',
					type: 'credential-resolver.stub-1.0',
					config: [],
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'config as null',
				data: {
					name: 'Test Resolver',
					type: 'credential-resolver.stub-1.0',
					config: null,
				},
				expectedErrorPath: ['config'],
			},
		])('should fail validation for $name', ({ data, expectedErrorPath }) => {
			const result = CreateCredentialResolverDto.safeParse(data);

			expect(result.success).toBe(false);

			if (expectedErrorPath && !result.success) {
				expect(result.error.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Trimming', () => {
		test('should trim name', () => {
			const result = CreateCredentialResolverDto.safeParse({
				name: '  Test Resolver  ',
				type: 'credential-resolver.stub-1.0',
				config: {},
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Test Resolver');
			}
		});

		test('should trim type', () => {
			const result = CreateCredentialResolverDto.safeParse({
				name: 'Test Resolver',
				type: '  credential-resolver.stub-1.0  ',
				config: {},
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.type).toBe('credential-resolver.stub-1.0');
			}
		});
	});
});
