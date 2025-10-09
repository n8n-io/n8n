import { InsightsDateFilterDto } from '../date-filter.dto';

describe('InsightsDateFilterDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object (no filters)',
				request: {},
				parsedResult: {},
			},
			{
				name: 'valid dateRange',
				request: {
					dateRange: 'week', // Using a valid option from the provided list
				},
				parsedResult: {},
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
			{
				name: 'valid projectId',
				request: {
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					projectId: '2gQLpmP5V4wOY627',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = InsightsDateFilterDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
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
				name: 'invalid dateRange value',
				request: {
					dateRange: 'invalid-value',
				},
				expectedErrorPaths: ['dateRange'],
			},
			{
				name: 'invalid projectId value',
				request: {
					projectId: 10,
				},
				expectedErrorPaths: ['projectId'],
			},
			{
				name: 'all fields invalid',
				request: {
					dateRange: 'invalid-value',
					startDate: '2025-13-01', // Invalid month
					endDate: 'not-a-date',
					projectId: 10,
				},
				expectedErrorPaths: ['dateRange', 'startDate', 'endDate', 'projectId'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = InsightsDateFilterDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
