import { AcceptInvitationRequestDto } from '../accept-invitation-request.dto';

describe('AcceptInvitationRequestDto', () => {
	const validToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpbnZpdGVlSWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.test';

	const validRequest = {
		token: validToken,
		firstName: 'John',
		lastName: 'Doe',
		password: 'SecurePassword123',
	};

	describe('Valid requests', () => {
		test.each([
			{
				name: 'token-based format with all required fields',
				request: validRequest,
			},
		])('should validate $name', ({ request }) => {
			const result = AcceptInvitationRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing token',
				request: {
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'empty token',
				request: {
					...validRequest,
					token: '',
				},
				expectedErrorPath: ['token'],
			},
			{
				name: 'missing first name',
				request: {
					...validRequest,
					firstName: '',
				},
				expectedErrorPath: ['firstName'],
			},
			{
				name: 'missing last name',
				request: {
					...validRequest,
					lastName: '',
				},
				expectedErrorPath: ['lastName'],
			},
			{
				name: 'password too short',
				request: {
					...validRequest,
					password: 'short',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without number',
				request: {
					...validRequest,
					password: 'NoNumberPassword',
				},
				expectedErrorPath: ['password'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = AcceptInvitationRequestDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
