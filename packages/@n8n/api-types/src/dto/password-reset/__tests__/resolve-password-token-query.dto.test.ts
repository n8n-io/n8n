import { ResolvePasswordTokenQueryDto } from '../resolve-password-token-query.dto';

describe('ResolvePasswordTokenQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid token',
				request: { token: 'valid-reset-token' },
			},
			{
				name: 'long token',
				request: { token: 'x'.repeat(50) },
			},
		])('should validate $name', ({ request }) => {
			const result = ResolvePasswordTokenQueryDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing token',
				request: {},
				expectedErrorPath: ['token'],
			},
			{
				name: 'empty token',
				request: { token: '' },
				expectedErrorPath: ['token'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ResolvePasswordTokenQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
