import { ResolveSignupTokenQueryDto } from '../resolve-signup-token-query.dto';

describe('ResolveSignupTokenQueryDto', () => {
	const validUuid = '123e4567-e89b-12d3-a456-426614174000';

	describe('Valid requests', () => {
		test.each([
			{
				name: 'legacy format with both inviterId and inviteeId',
				request: {
					inviterId: validUuid,
					inviteeId: validUuid,
				},
			},
			{
				name: 'JWT token format',
				request: {
					token:
						'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpbnZpdGVySWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJpbnZpdGVlSWQiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAifQ.test',
				},
			},
			{
				name: 'missing inviterId (could be token-based)',
				request: {
					inviteeId: validUuid,
				},
			},
			{
				name: 'missing inviteeId (could be token-based)',
				request: {
					inviterId: validUuid,
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
				name: 'invalid inviterId UUID',
				request: {
					inviterId: 'not-a-valid-uuid',
					inviteeId: validUuid,
				},
				expectedErrorPath: ['inviterId'],
			},
			{
				name: 'invalid inviteeId UUID',
				request: {
					inviterId: validUuid,
					inviteeId: 'not-a-valid-uuid',
				},
				expectedErrorPath: ['inviteeId'],
			},
			{
				name: 'UUID with invalid characters',
				request: {
					inviterId: '123e4567-e89b-12d3-a456-42661417400G',
					inviteeId: validUuid,
				},
				expectedErrorPath: ['inviterId'],
			},
			{
				name: 'UUID too long',
				request: {
					inviterId: '123e4567-e89b-12d3-a456-426614174001234',
					inviteeId: validUuid,
				},
				expectedErrorPath: ['inviterId'],
			},
			{
				name: 'UUID too short',
				request: {
					inviterId: '123e4567-e89b-12d3-a456',
					inviteeId: validUuid,
				},
				expectedErrorPath: ['inviterId'],
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
