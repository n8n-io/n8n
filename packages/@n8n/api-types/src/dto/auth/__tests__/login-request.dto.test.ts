import { LoginRequestDto } from '../login-request.dto';

describe('LoginRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'complete valid login request',
				request: {
					email: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
				},
			},
			{
				name: 'login request without optional MFA',
				request: {
					email: 'test@example.com',
					password: 'securePassword123',
				},
			},
			{
				name: 'login request with both mfaCode and mfaRecoveryCode',
				request: {
					email: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
					mfaRecoveryCode: 'recovery-code-123',
				},
			},
			{
				name: 'login request with only mfaRecoveryCode',
				request: {
					email: 'test@example.com',
					password: 'securePassword123',
					mfaRecoveryCode: 'recovery-code-123',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = LoginRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid email',
				request: {
					email: 'invalid-email',
					password: 'securePassword123',
				},
				expectedErrorPath: ['email'],
			},
			{
				name: 'empty password',
				request: {
					email: 'test@example.com',
					password: '',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'missing email',
				request: {
					password: 'securePassword123',
				},
				expectedErrorPath: ['email'],
			},
			{
				name: 'missing password',
				request: {
					email: 'test@example.com',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'whitespace in email and password',
				request: {
					email: '  test@example.com  ',
					password: '  securePassword123  ',
				},
				expectedErrorPath: ['email'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = LoginRequestDto.safeParse(request);
			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
