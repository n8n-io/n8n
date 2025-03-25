import { LoginRequestDto } from '../login-request.dto';

describe('LoginRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'complete valid login request',
				request: {
					emailOrLdapLoginId: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
				},
			},
			{
				name: 'login request without optional MFA',
				request: {
					emailOrLdapLoginId: 'test@example.com',
					password: 'securePassword123',
				},
			},
			{
				name: 'login request with both mfaCode and mfaRecoveryCode',
				request: {
					emailOrLdapLoginId: 'test@example.com',
					password: 'securePassword123',
					mfaCode: '123456',
					mfaRecoveryCode: 'recovery-code-123',
				},
			},
			{
				name: 'login request with only mfaRecoveryCode',
				request: {
					emailOrLdapLoginId: 'test@example.com',
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
				name: 'invalid emailOrLdapLoginId',
				request: {
					emailOrLdapLoginId: 0,
					password: 'securePassword123',
				},
				expectedErrorPath: ['emailOrLdapLoginId'],
			},
			{
				name: 'empty password',
				request: {
					emailOrLdapLoginId: 'test@example.com',
					password: '',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'missing emailOrLdapLoginId',
				request: {
					password: 'securePassword123',
				},
				expectedErrorPath: ['emailOrLdapLoginId'],
			},
			{
				name: 'missing password',
				request: {
					emailOrLdapLoginId: 'test@example.com',
				},
				expectedErrorPath: ['password'],
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
