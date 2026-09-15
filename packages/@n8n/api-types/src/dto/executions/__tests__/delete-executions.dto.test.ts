import { DeleteExecutionsDto } from '../delete-executions.dto';

describe('DeleteExecutionsDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty body',
				request: {},
				parsedResult: {},
			},
			{
				name: 'deleteBefore as an ISO string',
				request: { deleteBefore: '2026-01-01T00:00:00.000Z' },
				parsedResult: { deleteBefore: new Date('2026-01-01T00:00:00.000Z') },
			},
			{
				name: 'deleteBefore as a date-only string',
				request: { deleteBefore: '2026-01-01' },
				parsedResult: { deleteBefore: new Date('2026-01-01') },
			},
			{
				name: 'deleteBefore as a timestamp',
				request: { deleteBefore: new Date('2026-01-01').getTime() },
				parsedResult: { deleteBefore: new Date('2026-01-01') },
			},
			{
				name: 'ids',
				request: { ids: ['1', '2'] },
				parsedResult: { ids: ['1', '2'] },
			},
			{
				name: 'arbitrary filters',
				request: { filters: { status: ['error'], metadata: [{ key: 'a', value: 'b' }] } },
				parsedResult: { filters: { status: ['error'], metadata: [{ key: 'a', value: 'b' }] } },
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = DeleteExecutionsDto.safeParse(request);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(parsedResult);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'unparseable deleteBefore',
				request: { deleteBefore: 'not-a-date' },
				expectedErrorPaths: ['deleteBefore'],
			},
			{
				name: 'deleteBefore as an invalid timestamp',
				request: { deleteBefore: NaN },
				expectedErrorPaths: ['deleteBefore'],
			},
			{
				name: 'non-string ids',
				request: { ids: [1, 2] },
				expectedErrorPaths: ['ids'],
			},
			{
				name: 'filters as a JSON string',
				request: { filters: '{"status":["error"]}' },
				expectedErrorPaths: ['filters'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = DeleteExecutionsDto.safeParse(request);

			expect(result.success).toBe(false);
			expect(new Set(result.error?.issues.map((issue) => issue.path[0]))).toEqual(
				new Set(expectedErrorPaths),
			);
		});
	});
});
