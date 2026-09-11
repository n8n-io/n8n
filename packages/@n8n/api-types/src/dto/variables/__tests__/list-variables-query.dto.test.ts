import { ListVariablesQueryDto } from '../list-variables-query.dto';

describe('ListVariablesQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'no query params, defaulting the limit',
				request: {},
				parsedResult: { limit: 100 },
			},
			{
				name: 'numeric limit as a string',
				request: { limit: '5' },
				parsedResult: { limit: 5 },
			},
			{
				name: 'limit above the maximum, now clamped instead of rejected',
				request: { limit: '1000' },
				parsedResult: { limit: 250 },
			},
			{
				name: 'cursor, projectId and state filters',
				request: { cursor: 'MTAw', projectId: '2gQLpmP5V4wOY627', state: 'empty' },
				parsedResult: { cursor: 'MTAw', projectId: '2gQLpmP5V4wOY627', state: 'empty' },
			},
			{
				name: 'the "null" projectId sentinel for global variables',
				request: { projectId: 'null' },
				parsedResult: { projectId: 'null' },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = ListVariablesQueryDto.safeParse(request);

			expect(result.success).toBe(true);
			expect(result.data).toMatchObject(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{ name: 'non-numeric limit', request: { limit: 'abc' }, expectedErrorPaths: ['limit'] },
			{ name: 'negative limit', request: { limit: '-1' }, expectedErrorPaths: ['limit'] },
			{ name: 'unknown state value', request: { state: 'full' }, expectedErrorPaths: ['state'] },
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = ListVariablesQueryDto.safeParse(request);

			expect(result.success).toBe(false);
			expect(new Set(result.error?.issues.map((issue) => issue.path[0]))).toEqual(
				new Set(expectedErrorPaths),
			);
		});
	});
});
