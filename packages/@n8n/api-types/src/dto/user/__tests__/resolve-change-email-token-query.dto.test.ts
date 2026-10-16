import { ResolveChangeEmailTokenQueryDto } from '../resolve-change-email-token-query.dto';

describe('ResolveChangeEmailTokenQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'JWT token format',
				request: {
					token:
						'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.test',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ResolveChangeEmailTokenQueryDto.safeParse(request);
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
				request: {
					token: '',
				},
				expectedErrorPath: ['token'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ResolveChangeEmailTokenQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
