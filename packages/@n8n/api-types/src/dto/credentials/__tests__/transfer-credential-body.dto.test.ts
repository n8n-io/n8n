import { TransferCredentialBodyDto } from '../transfer-credential-body.dto';

describe('TransferCredentialBodyDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with destinationProjectId',
				request: {
					destinationProjectId: 'project-123',
				},
			},
			{
				name: 'with uuid-style projectId',
				request: {
					destinationProjectId: '550e8400-e29b-41d4-a716-446655440000',
				},
			},
		])('should validate $name', ({ request }) => {
			const result = TransferCredentialBodyDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing destinationProjectId',
				request: {},
				expectedErrorPath: ['destinationProjectId'],
			},
			{
				name: 'destinationProjectId is not a string',
				request: {
					destinationProjectId: 123,
				},
				expectedErrorPath: ['destinationProjectId'],
			},
			{
				name: 'destinationProjectId is null',
				request: {
					destinationProjectId: null,
				},
				expectedErrorPath: ['destinationProjectId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = TransferCredentialBodyDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
