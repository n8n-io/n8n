import { VariableListRequestDto } from '../variables-list-request.dto';

describe('VariableListRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object (no filters)',
				request: {},
				parsedResult: {},
			},
			{
				name: 'valid state filter',
				request: {
					state: 'empty',
				},
				parsedResult: {
					state: 'empty',
				},
			},
			{
				name: 'valid projectId',
				request: {
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					projectId: '2gQLpmP5V4wOY627',
				},
			},
			{
				name: 'valid state and projectId',
				request: {
					state: 'empty',
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					state: 'empty',
					projectId: '2gQLpmP5V4wOY627',
				},
			},
			{
				name: 'valid projectId with UUID format',
				request: {
					projectId: '550e8400-e29b-41d4-a716-446655440000',
				},
				parsedResult: {
					projectId: '550e8400-e29b-41d4-a716-446655440000',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = VariableListRequestDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid state value',
				request: {
					state: 'invalid',
				},
				expectedErrorPaths: ['state'],
			},
			{
				name: 'state is not a string',
				request: {
					state: 123,
				},
				expectedErrorPaths: ['state'],
			},
			{
				name: 'projectId too long (37 characters)',
				request: {
					projectId: 'a'.repeat(37),
				},
				expectedErrorPaths: ['projectId'],
			},
			{
				name: 'projectId is not a string',
				request: {
					projectId: 123,
				},
				expectedErrorPaths: ['projectId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = VariableListRequestDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
