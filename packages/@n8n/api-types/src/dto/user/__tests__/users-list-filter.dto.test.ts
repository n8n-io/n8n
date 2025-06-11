import { UsersListFilterDto } from '../users-list-filter.dto';

describe('UsersListFilterDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'pagination with default values',
				request: {},
				parsedResult: { skip: 0, take: 10 },
			},
			{
				name: 'pagination with custom values',
				request: { skip: '5', take: '20' },
				parsedResult: { skip: 5, take: 20 },
			},
			{
				name: 'sort by name ascending',
				request: { sortBy: 'name:asc' },
				parsedResult: { skip: 0, take: 10, sortBy: 'name:asc' },
			},
			{
				name: 'sort by last active descending and pagination',
				request: { skip: '5', take: '20', sortBy: 'lastActive:desc' },
				parsedResult: { skip: 5, take: 20, sortBy: 'lastActive:desc' },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = UsersListFilterDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid skip format',
				request: {
					skip: 'not-a-number',
					take: '10',
				},
				expectedErrorPath: ['skip'],
			},
			{
				name: 'invalid take format',
				request: {
					skip: '0',
					take: 'not-a-number',
				},
				expectedErrorPath: ['take'],
			},
			{
				name: 'invalid sortBy value',
				request: {
					sortBy: 'invalid-value',
				},
				expectedErrorPath: ['sortBy'],
			},
		])('should invalidate $name', ({ request, expectedErrorPath }) => {
			const result = UsersListFilterDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath && !result.success) {
				if (Array.isArray(expectedErrorPath)) {
					const errorPaths = result.error.issues[0].path;
					expect(errorPaths).toContain(expectedErrorPath[0]);
				}
			}
		});
	});
});
