import { CreateApiKeyRequestDto } from '../create-api-key-request.dto';

describe('CreateApiKeyRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'expiresAt in the future',
				expiresAt: Date.now() / 1000 + 1000,
				scopes: ['user:create'],
			},
			{
				name: 'expiresAt null',
				expiresAt: null,
				scopes: ['user:create'],
			},
			{
				name: 'scopes with valid scope',
				expiresAt: null,
				scopes: ['user:create'],
			},
		])('should succeed validation for $name', ({ expiresAt, scopes }) => {
			const result = CreateApiKeyRequestDto.safeParse({ label: 'valid', expiresAt, scopes });

			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'expiresAt in the past',
				expiresAt: Date.now() / 1000 - 1000,
				scopes: ['user:create'],
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with string',
				expiresAt: 'invalid',
				scopes: ['user:create'],
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with []',
				expiresAt: [],
				scopes: ['user:create'],
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with {}',
				expiresAt: {},
				scopes: ['user:create'],
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'scopes with non exiting scope',
				scopes: ['user:test'],
				expiresAt: Date.now() / 1000 + 1000,
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes with empty array',
				scopes: [],
				expiresAt: Date.now() / 1000 + 1000,
				expectedErrorPath: ['scopes'],
			},
			{
				name: 'scopes with {}',
				scopes: {},
				expiresAt: Date.now() / 1000 + 1000,
				expectedErrorPath: ['scopes'],
			},
		])('should fail validation for $name', ({ expiresAt, scopes, expectedErrorPath }) => {
			const result = CreateApiKeyRequestDto.safeParse({ label: 'valid', expiresAt, scopes });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
