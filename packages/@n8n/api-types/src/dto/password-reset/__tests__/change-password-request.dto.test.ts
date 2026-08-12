import { ChangePasswordRequestDto } from '../change-password-request.dto';

describe('ChangePasswordRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid password reset with token',
				request: {
					token: 'valid-reset-token-with-sufficient-length',
					password: 'newSecurePassword123',
				},
			},
			{
				name: 'valid password reset with MFA code',
				request: {
					token: 'another-valid-reset-token',
					password: 'newSecurePassword123',
					mfaCode: '123456',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ChangePasswordRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing token',
				request: { password: 'newSecurePassword123' },
				expectedErrorPath: ['token'],
			},
			{
				name: 'empty token',
				request: { token: '', password: 'newSecurePassword123' },
				expectedErrorPath: ['token'],
			},
			{
				name: 'short token',
				request: { token: 'short', password: 'newSecurePassword123' },
				expectedErrorPath: ['token'],
			},
			{
				name: 'missing password',
				request: { token: 'valid-reset-token' },
				expectedErrorPath: ['password'],
			},
			{
				name: 'password too short',
				request: {
					token: 'valid-reset-token',
					password: 'short',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password too long',
				request: {
					token: 'valid-reset-token',
					password: 'a'.repeat(65),
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without number',
				request: {
					token: 'valid-reset-token',
					password: 'NoNumberPassword',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without uppercase letter',
				request: {
					token: 'valid-reset-token',
					password: 'nouppercasepassword123',
				},
				expectedErrorPath: ['password'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ChangePasswordRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});

		describe('Edge cases', () => {
			test('should handle optional MFA code correctly', () => {
				const validRequest = {
					token: 'valid-reset-token',
					password: 'newSecurePassword123',
					mfaCode: undefined,
				};

				const result = ChangePasswordRequestDto.safeParse(validRequest);
				expect(result.success).toBe(true);
			});

			test('should handle token with special characters', () => {
				const validRequest = {
					token: 'valid-reset-token-with-special-!@#$%^&*()_+',
					password: 'newSecurePassword123',
				};

				const result = ChangePasswordRequestDto.safeParse(validRequest);
				expect(result.success).toBe(true);
			});
		});
	});
});
