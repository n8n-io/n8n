import { BaseVariableRequestDto } from '../base.dto';

describe('BaseVariableRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid key, type, and value',
				request: {
					key: 'MY_VARIABLE',
					type: 'string',
					value: 'test value',
				},
				parsedResult: {
					key: 'MY_VARIABLE',
					type: 'string',
					value: 'test value',
				},
			},
			{
				name: 'valid key with underscores',
				request: {
					key: 'MY_TEST_VARIABLE',
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'MY_TEST_VARIABLE',
					type: 'string',
					value: 'value',
				},
			},
			{
				name: 'valid key with numbers',
				request: {
					key: 'VAR123',
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'VAR123',
					type: 'string',
					value: 'value',
				},
			},
			{
				name: 'valid key with mixed case',
				request: {
					key: 'MyVariable123',
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'MyVariable123',
					type: 'string',
					value: 'value',
				},
			},
			{
				name: 'minimum key length (1 character)',
				request: {
					key: 'A',
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'A',
					type: 'string',
					value: 'value',
				},
			},
			{
				name: 'maximum key length (50 characters)',
				request: {
					key: 'A'.repeat(50),
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'A'.repeat(50),
					type: 'string',
					value: 'value',
				},
			},
			{
				name: 'empty value',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: '',
				},
				parsedResult: {
					key: 'MY_VAR',
					type: 'string',
					value: '',
				},
			},
			{
				name: 'maximum value length (1000 characters)',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'x'.repeat(1000),
				},
				parsedResult: {
					key: 'MY_VAR',
					type: 'string',
					value: 'x'.repeat(1000),
				},
			},
			{
				name: 'type defaults to string when omitted',
				request: {
					key: 'MY_VAR',
					value: 'value',
				},
				parsedResult: {
					key: 'MY_VAR',
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
				name: 'empty key',
				request: {
					key: '',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key too long (51 characters)',
				request: {
					key: 'A'.repeat(51),
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with invalid characters (hyphen)',
				request: {
					key: 'MY-VARIABLE',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with invalid characters (space)',
				request: {
					key: 'MY VARIABLE',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with invalid characters (special characters)',
				request: {
					key: 'MY@VARIABLE!',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'value too long (1001 characters)',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'x'.repeat(1001),
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'invalid type',
				request: {
					key: 'MY_VAR',
					type: 'number',
					value: 'value',
				},
				expectedErrorPaths: ['type'],
			},
			{
				name: 'missing key',
				request: {
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'missing value',
				request: {
					key: 'MY_VAR',
					type: 'string',
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'key is not a string',
				request: {
					key: 123,
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'value is not a string',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 123,
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'all fields invalid',
				request: {
					key: '',
					type: 'invalid',
					value: 'x'.repeat(1001),
				},
				expectedErrorPaths: ['key', 'type', 'value'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = BaseVariableRequestDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
