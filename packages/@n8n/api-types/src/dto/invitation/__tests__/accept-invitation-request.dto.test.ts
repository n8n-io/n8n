import { AcceptInvitationRequestDto } from '../accept-invitation-request.dto';

describe('AcceptInvitationRequestDto', () => {
	const validUuid = '123e4567-e89b-12d3-a456-426614174000';

	describe('Valid requests', () => {
		test.each([
			{
				name: 'legacy format with inviterId',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
			},
			{
				name: 'JWT token format',
				request: {
					token:
						'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpbnZpdGVlSWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.test',
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
			},
			{
				name: 'missing inviterId (could be token-based)',
				request: {
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = AcceptInvitationRequestDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid inviterId',
				request: {
					inviterId: 'not-a-valid-uuid',
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['inviterId'],
			},
			{
				name: 'invalid inviteeId',
				request: {
					inviterId: validUuid,
					inviteeId: 'not-a-valid-uuid',
					firstName: 'John',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['inviteeId'],
			},
			{
				name: 'missing first name',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
					firstName: '',
					lastName: 'Doe',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['firstName'],
			},
			{
				name: 'missing last name',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
					firstName: 'John',
					lastName: '',
					password: 'SecurePassword123',
				},
				expectedErrorPath: ['lastName'],
			},
			{
				name: 'password too short',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
					password: 'short',
				},
				expectedErrorPath: ['password'],
			},
			{
				name: 'password without number',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
					firstName: 'John',
					lastName: 'Doe',
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
