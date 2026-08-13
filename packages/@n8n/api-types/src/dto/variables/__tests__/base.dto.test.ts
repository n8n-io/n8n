import { BaseVariableRequestDto } from '../base.dto';

describe('BaseVariableRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid type and value',
				request: {
					type: 'string',
					value: 'test value',
				},
				parsedResult: {
					type: 'string',
					value: 'test value',
				},
			},
			{
				name: 'empty value',
				request: {
					type: 'string',
					value: '',
				},
				parsedResult: {
					type: 'string',
					value: '',
				},
			},
			{
				name: 'maximum value length (1000 characters)',
				request: {
					type: 'string',
					value: 'x'.repeat(1000),
				},
				parsedResult: {
					type: 'string',
					value: 'x'.repeat(1000),
				},
			},
			{
				name: 'type defaults to string when omitted',
				request: {
					value: 'value',
				},
				parsedResult: {
					type: 'string',
					value: 'value',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = BaseVariableRequestDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'value too long (1001 characters)',
				request: {
					type: 'string',
					value: 'x'.repeat(1001),
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'invalid type',
				request: {
					type: 'number',
					value: 'value',
				},
				expectedErrorPaths: ['type'],
			},
			{
				name: 'missing value',
				request: {
					type: 'string',
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'value is not a string',
				request: {
					type: 'string',
					value: 123,
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'both fields invalid',
				request: {
					type: 'invalid',
					value: 'x'.repeat(1001),
				},
				expectedErrorPaths: ['type', 'value'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = BaseVariableRequestDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
