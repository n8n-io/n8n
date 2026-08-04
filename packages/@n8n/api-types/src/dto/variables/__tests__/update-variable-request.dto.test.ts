import { UpdateVariableRequestDto } from '../update-variable-request.dto';

describe('UpdateVariableRequestDto', () => {
	describe('Valid requests - Permissive key validation', () => {
		test.each([
			{
				name: 'valid request with all fields (underscores)',
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
				name: 'valid request with uppercase and underscores',
				request: {
					key: 'MY_OLD_VARIABLE',
					type: 'string',
					value: 'test value',
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					key: 'MY_OLD_VARIABLE',
					type: 'string',
					value: 'test value',
					projectId: '2gQLpmP5V4wOY627',
				},
			},
			{
				name: 'valid request with only key',
				request: {
					key: 'MY_VARIABLE',
				},
				parsedResult: {
					key: 'MY_VARIABLE',
				},
			},
			{
				name: 'valid request with only value (no key change)',
				request: {
					value: 'new value',
				},
				parsedResult: {
					value: 'new value',
				},
			},
			{
				name: 'valid request with only type',
				request: {
					type: 'string',
				},
				parsedResult: {
					type: 'string',
				},
			},
			{
				name: 'valid request with only projectId',
				request: {
					projectId: '2gQLpmP5V4wOY627',
				},
				parsedResult: {
					projectId: '2gQLpmP5V4wOY627',
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
				name: 'valid request with key and value',
				request: {
					key: 'MY_VAR',
					value: 'value',
				},
				parsedResult: {
					key: 'MY_VAR',
					value: 'value',
				},
			},
			{
				name: 'valid request with max length key',
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
				name: 'valid empty request (all fields optional)',
				request: {},
				parsedResult: {},
			},
		])('should validate $name', ({ request, parsedResult }) => {
			const result = UpdateVariableRequestDto.safeParse(request);
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
					key: 'my-variable',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with spaces',
				request: {
					key: 'my variable',
					type: 'string',
					value: 'value',
				},
				expectedErrorPaths: ['key'],
			},
			{
				name: 'key with dots',
				request: {
					key: 'my.variable',
					type: 'string',
					value: 'value',
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
				name: 'projectId is not a string or null',
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
		])('should fail validation for $name', ({ request, expectedErrorPaths }) => {
			const result = UpdateVariableRequestDto.safeParse(request);
			const issuesPaths = new Set(result.error?.issues.map((issue) => issue.path[0]));

			expect(result.success).toBe(false);
			expect(new Set(issuesPaths)).toEqual(new Set(expectedErrorPaths));
		});
	});
});
