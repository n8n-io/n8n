import { ListInsightsWorkflowQueryDto } from '../list-workflow-query.dto';

const DEFAULT_PAGINATION = { skip: 0, take: 10 };

describe('ListInsightsWorkflowQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object (no filters)',
				request: {},
				parsedResult: DEFAULT_PAGINATION,
			},
			{
				name: 'valid sortBy',
				request: {
					sortBy: 'total:asc',
				},
				parsedResult: {
					...DEFAULT_PAGINATION,
					sortBy: 'total:asc',
				},
			},
			{
				name: 'valid sortBy workflowName:asc',
				request: {
					sortBy: 'workflowName:asc',
				},
				parsedResult: {
					...DEFAULT_PAGINATION,
					sortBy: 'workflowName:asc',
				},
			},
			{
				name: 'valid sortBy workflowName:desc',
				request: {
					sortBy: 'workflowName:desc',
				},
				parsedResult: {
					...DEFAULT_PAGINATION,
					sortBy: 'workflowName:desc',
				},
			},
			{
				name: 'valid skip and take',
				request: {
					skip: '0',
					take: '20',
				},
				parsedResult: {
					skip: 0,
					take: 20,
				},
			},
			{
				name: 'full query parameters',
				request: {
					skip: '0',
					take: '10',
					sortBy: 'total:desc',
				},
				parsedResult: {
					skip: 0,
					take: 10,
					sortBy: 'total:desc',
				},
			},
			{
				name: 'limit take to 100',
				request: {
					skip: '0',
					take: '200',
					sortBy: 'total:asc',
				},
				parsedResult: {
					skip: 0,
					take: 100,
					sortBy: 'total:asc',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = ListInsightsWorkflowQueryDto.safeParse(request);
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
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = ListInsightsWorkflowQueryDto.safeParse(request);

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
