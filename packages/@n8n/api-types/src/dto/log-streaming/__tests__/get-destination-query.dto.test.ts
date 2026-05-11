import { GetDestinationQueryDto } from '../get-destination-query.dto';

describe('GetDestinationQueryDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty object (no id - get all destinations)',
				request: {},
				parsedResult: {},
			},
			{
				name: 'valid UUID',
				request: {
					id: '550e8400-e29b-41d4-a716-446655440000',
				},
				parsedResult: {
					id: '550e8400-e29b-41d4-a716-446655440000',
				},
			},
			{
				name: 'another valid UUID',
				request: {
					id: '123e4567-e89b-12d3-a456-426614174000',
				},
				parsedResult: {
					id: '123e4567-e89b-12d3-a456-426614174000',
				},
			},
			{
				name: 'non-UUID string (backward compatibility)',
				request: {
					id: 'e2e-tls-test',
				},
				parsedResult: {
					id: 'e2e-tls-test',
				},
			},
			{
				name: 'short string',
				request: {
					id: '550e8400-e29b-41d4',
				},
				parsedResult: {
					id: '550e8400-e29b-41d4',
				},
			},
			{
				name: 'string without dashes',
				request: {
					id: '550e8400e29b41d4a716446655440000',
				},
				parsedResult: {
					id: '550e8400e29b41d4a716446655440000',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = GetDestinationQueryDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'empty string',
				request: {
					id: '',
				},
				expectedErrorPaths: ['id'],
			},
			{
				name: 'numeric value',
				request: {
					id: 123,
				},
				expectedErrorPaths: ['id'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = GetDestinationQueryDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
