import { CreateApiKeyRequestDto } from '../create-api-key-request.dto';

describe('CreateApiKeyRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'expiresAt in the future',
				expiresAt: Date.now() / 1000 + 1000,
			},
			{
				name: 'expiresAt null',
				expiresAt: null,
			},
		])('should succeed validation for $name', ({ expiresAt }) => {
			const result = CreateApiKeyRequestDto.safeParse({ label: 'valid', expiresAt });

			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'expiresAt in the past',
				expiresAt: Date.now() / 1000 - 1000,
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with string',
				expiresAt: 'invalid',
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with []',
				expiresAt: [],
				expectedErrorPath: ['expiresAt'],
			},
			{
				name: 'expiresAt with {}',
				expiresAt: {},
				expectedErrorPath: ['expiresAt'],
			},
		])('should fail validation for $name', ({ expiresAt, expectedErrorPath }) => {
			const result = CreateApiKeyRequestDto.safeParse({ label: 'valid', expiresAt });

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
