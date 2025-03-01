import { LoginRequestDto } from '../login-request.dto';

describe('LoginRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'complete valid login request',
				request: {
					emailOrLdapUsername: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
				},
			},
			{
				name: 'login request without optional MFA',
				request: {
					emailOrLdapUsername: 'test@example.com',
					password: 'securePassword123',
				},
			},
			{
				name: 'login request with both mfaCode and mfaRecoveryCode',
				request: {
					emailOrLdapUsername: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
					mfaRecoveryCode: 'recovery-code-123',
				},
			},
			{
				name: 'login request with only mfaRecoveryCode',
				request: {
					emailOrLdapUsername: 'test@example.com',
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
					emailOrLdapUsername: 'invalid-email',
					password: 'securePassword123',
				},
				expectedErrorPath: ['emailOrLdapUsername'],
			},
			{
				name: 'empty password',
				request: {
					emailOrLdapUsername: 'test@example.com',
					password: '',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'missing emailOrLdapUsername',
				request: {
					password: 'securePassword123',
				},
				expectedErrorPath: ['emailOrLdapUsername'],
			},
			{
				name: 'missing password',
				request: {
					emailOrLdapUsername: 'test@example.com',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'whitespace in emailOrLdapUsername and password',
				request: {
					emailOrLdapUsername: '  test@example.com  ',
					password: '  securePassword123  ',
				},
				expectedErrorPath: ['emailOrLdapUsername'],
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
