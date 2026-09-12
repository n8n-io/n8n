import { ConfirmEmailChangeRequestDto } from '../confirm-email-change-request.dto';

describe('ConfirmEmailChangeRequestDto', () => {
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
			const result = ConfirmEmailChangeRequestDto.safeParse(request);
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
			const result = ConfirmEmailChangeRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
