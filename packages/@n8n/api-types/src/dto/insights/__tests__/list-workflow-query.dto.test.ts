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
				name: 'valid startDate and endDate (as strings)',
				request: {
					startDate: '2025-01-01',
					endDate: '2025-01-31',
				},
				parsedResult: {
					startDate: new Date('2025-01-01'),
					endDate: new Date('2025-01-31'),
				},
			},
			{
				name: 'valid startDate and endDate (as ISO strings)',
				request: {
					startDate: '2025-01-01T00:00:00Z',
					endDate: '2025-01-31T23:59:59Z',
				},
				parsedResult: {
					startDate: new Date('2025-01-01T00:00:00Z'),
					endDate: new Date('2025-01-31T23:59:59Z'),
				},
			},
			{
				name: 'valid startDate and endDate (as timestamps)',
				request: {
					startDate: new Date('2025-01-01').getTime(),
					endDate: new Date('2025-01-31').getTime(),
				},
				parsedResult: {
					startDate: new Date('2025-01-01'),
					endDate: new Date('2025-01-31'),
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
				expectedErrorPaths: ['skip'],
			},
			{
				name: 'invalid take format',
				request: {
					skip: '0',
					take: 'not-a-number',
				},
				expectedErrorPaths: ['take'],
			},
			{
				name: 'invalid sortBy value',
				request: {
					sortBy: 'invalid-value',
				},
				expectedErrorPaths: ['sortBy'],
			},
			{
				name: 'invalid projectId value',
				request: {
					projectId: 10,
				},
				expectedErrorPaths: ['projectId'],
			},
			{
				name: 'invalid startDate format',
				request: {
					startDate: '2025-13-01', // Invalid month
					endDate: '2025-13-31', // Invalid month
				},
				expectedErrorPaths: ['startDate', 'endDate'],
			},
			{
				name: 'startDate is an invalid timestamp',
				request: {
					startDate: NaN,
				},
				expectedErrorPaths: ['startDate'],
			},
			{
				name: 'endDate is an invalid timestamp',
				request: {
					endDate: NaN,
					projectId: 'validProjectId',
				},
				expectedErrorPaths: ['endDate'],
			},
			{
				name: 'startDate is an invalid ISO string',
				request: {
					startDate: 'invalid--date',
				},
				expectedErrorPaths: ['startDate'],
			},
			{
				name: 'endDate is an invalid ISO string',
				request: {
					startDate: '2025-01-01',
					endDate: 'not-a-date',
				},
				expectedErrorPaths: ['endDate'],
			},
			{
				name: 'all fields invalid',
				request: {
					sortBy: 'invalid-value',
					startDate: '2025-13-01', // Invalid month
					endDate: 'not-a-date',
					projectId: 10,
				},
				expectedErrorPaths: ['sortBy', 'startDate', 'endDate', 'projectId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = ListInsightsWorkflowQueryDto.safeParse(request);

			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
