import { UpdateCredentialResolverDto } from '../update-credential-resolver.dto';

describe('UpdateCredentialResolverDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'update only name',
				data: {
					name: 'Updated Resolver',
				},
			},
			{
				name: 'update only config',
				data: {
					config: { prefix: 'updated-' },
				},
			},
			{
				name: 'update both name and config',
				data: {
					name: 'Updated Resolver',
					config: { prefix: 'updated-' },
				},
			},
			{
				name: 'update with empty config',
				data: {
					name: 'Updated Resolver',
					config: {},
				},
			},
			{
				name: 'update with complex config',
				data: {
					config: {
						region: 'eu-west-1',
						timeout: 5000,
						nested: {
							value: true,
						},
					},
				},
			},
			{
				name: 'empty update (all optional)',
				data: {},
			},
			{
				name: 'minimum name length',
				data: {
					name: 'A',
				},
			},
		])('should succeed validation for $name', ({ data }) => {
			const result = UpdateCredentialResolverDto.safeParse(data);

			expect(result.success).toBe(true);
			if (result.success) {
				if (data.name !== undefined) {
					expect(result.data.name).toBe(data.name);
				}
				if (data.config !== undefined) {
					expect(result.data.config).toEqual(data.config);
				}
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'empty name',
				data: {
					name: '',
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'whitespace-only name',
				data: {
					name: '   ',
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long (>255 chars)',
				data: {
					name: 'a'.repeat(256),
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'config as string',
				data: {
					config: 'invalid',
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'config as array',
				data: {
					config: [],
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'config as null',
				data: {
					config: null,
				},
				expectedErrorPath: ['config'],
			},
			{
				name: 'name as number',
				data: {
					name: 123,
				},
				expectedErrorPath: ['name'],
			},
			{
				name: 'name as object',
				data: {
					name: { value: 'test' },
				},
				expectedErrorPath: ['name'],
			},
		])('should fail validation for $name', ({ data, expectedErrorPath }) => {
			const result = UpdateCredentialResolverDto.safeParse(data);

			expect(result.success).toBe(false);

			if (expectedErrorPath && !result.success) {
				expect(result.error.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Trimming', () => {
		test('should trim name when provided', () => {
			const result = UpdateCredentialResolverDto.safeParse({
				name: '  Updated Resolver  ',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('Updated Resolver');
			}
		});

		test('should not affect config', () => {
			const result = UpdateCredentialResolverDto.safeParse({
				config: { key: '  value with spaces  ' },
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.config).toEqual({ key: '  value with spaces  ' });
			}
		});
	});
});
