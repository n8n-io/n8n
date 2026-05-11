import { ResolveSignupTokenQueryDto } from '../resolve-signup-token-query.dto';

describe('ResolveSignupTokenQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'JWT token format',
				request: {
					token:
						'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpbnZpdGVlSWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.test',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ResolveSignupTokenQueryDto.safeParse(request);
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
			const result = ResolveSignupTokenQueryDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
