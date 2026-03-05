import { CreateVariableRequestDto } from '../create-variable-request.dto';

describe('CreateVariableRequestDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'valid request with uppercase and underscores',
				request: {
					key: 'MY_VARIABLE',
					type: 'string',
					value: 'test value',
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					key: 'MY_VARIABLE',
					type: 'string',
					value: 'test value',
					projectId: '2gQLpmP5V4wOY627',
				},
			},
			{
				name: 'valid request with alphanumeric key (no separators)',
				request: {
					key: 'myVariable123',
					type: 'string',
					value: 'test value',
				},
				parsedResult: {
					key: 'myVariable123',
					type: 'string',
					value: 'test value',
				},
			},
			{
				name: 'valid request without projectId',
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
				name: 'valid request with UUID projectId',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'value',
					projectId: '550e8400-e29b-41d4-a716-446655440000',
				},
				parsedResult: {
					key: 'MY_VAR',
					type: 'string',
					value: 'value',
					projectId: '550e8400-e29b-41d4-a716-446655440000',
				},
			},
			{
				name: 'valid request with type defaulting to string',
				request: {
					key: 'MY_VAR',
					value: 'value',
					projectId: 'project123',
				},
				parsedResult: {
					key: 'MY_VAR',
					type: 'string',
					value: 'value',
					projectId: 'project123',
				},
			},
			{
				name: 'valid request with all base validations',
				request: {
					key: 'A'.repeat(50),
					type: 'string',
					value: 'x'.repeat(1000),
					projectId: 'proj',
				},
				parsedResult: {
					key: 'A'.repeat(50),
					type: 'string',
					value: 'x'.repeat(1000),
					projectId: 'proj',
				},
			},
			{
				name: 'valid request with numbers in key',
				request: {
					key: 'api_key_123',
					type: 'string',
					value: 'value',
				},
				parsedResult: {
					key: 'api_key_123',
					type: 'string',
					value: 'value',
				},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = CreateVariableRequestDto.safeParse(request);
			expect(result.success).toBe(true);
			if (parsedResult) {
				expect(result.data).toMatchObject(parsedResult);
			}
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'key with hyphens (not valid JavaScript identifier)',
				request: {
					key: 'my-MY_VAR',
					type: 'string',
					value: 'test',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with special characters',
				request: {
					key: 'my@variable',
					type: 'string',
					value: 'test',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with spaces',
				request: {
					key: 'my variable',
					type: 'string',
					value: 'test',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with dots',
				request: {
					key: 'my.variable',
					type: 'string',
					value: 'test',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key starting with number',
				request: {
					key: '1myvariable',
					type: 'string',
					value: 'test',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'projectId too long (37 characters)',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'value',
					projectId: 'a'.repeat(37),
				},
				expectedErrorPaths: ['projectId'],
			},
			{
				name: 'projectId is not a string',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'value',
					projectId: 123,
				},
				expectedErrorPaths: ['projectId'],
			},
			{
				name: 'invalid value length',
				request: {
					key: 'MY_VAR',
					type: 'string',
					value: 'x'.repeat(1001),
					projectId: 'project123',
				},
				expectedErrorPaths: ['value'],
			},
			{
				name: 'invalid type',
				request: {
					key: 'MY_VAR',
					type: 'number',
					value: 'value',
					projectId: 'project123',
				},
				expectedErrorPaths: ['type'],
			},
			{
				name: 'empty key',
				request: {
					key: '',
					type: 'string',
					value: 'value',
					projectId: 'project123',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key too long (51 characters)',
				request: {
					key: 'a'.repeat(51),
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'missing required fields (key and value)',
				request: {
					projectId: 'project123',
				},
				expectedErrorPaths: ['key', 'value'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = CreateVariableRequestDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
