import { ShareCredentialsBodyDto } from '../share-credentials-body.dto';

describe('ShareCredentialsBodyDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with project IDs',
				request: {
					shareWithIds: ['project-1', 'project-2'],
				},
			},
			{
				name: 'with empty array',
				request: {
					shareWithIds: [],
				},
			},
			{
				name: 'with single project ID',
				request: {
					shareWithIds: ['project-123'],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = ShareCredentialsBodyDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing shareWithIds',
				request: {},
				expectedErrorPath: ['shareWithIds'],
			},
			{
				name: 'shareWithIds is not an array',
				request: {
					shareWithIds: 'project-123',
				},
				expectedErrorPath: ['shareWithIds'],
			},
			{
				name: 'shareWithIds contains non-string',
				request: {
					shareWithIds: ['project-1', 123],
				},
				expectedErrorPath: ['shareWithIds', 1],
			},
			{
				name: 'shareWithIds is null',
				request: {
					shareWithIds: null,
				},
				expectedErrorPath: ['shareWithIds'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ShareCredentialsBodyDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
