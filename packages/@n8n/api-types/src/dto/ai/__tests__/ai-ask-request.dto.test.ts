import { AiAskRequestDto } from '../ai-ask-request.dto';

describe('AiAskRequestDto', () => {
	const validRequest = {
		question: 'How can I improve this workflow?',
		context: {
			schema: [
				{
					nodeName: 'TestNode',
					schema: {
						type: 'string',
						key: 'testKey',
						value: 'testValue',
						path: '/test/path',
					},
				},
			],
			inputSchema: {
				nodeName: 'InputNode',
				schema: {
					type: 'object',
					key: 'inputKey',
					value: [
						{
							type: 'string',
							key: 'nestedKey',
							value: 'nestedValue',
							path: '/nested/path',
						},
					],
					path: '/input/path',
				},
			},
			pushRef: 'push-123',
			ndvPushRef: 'ndv-push-456',
		},
		forNode: 'TestWorkflowNode',
	};

	it('should validate a valid AI ask request', () => {
		const result = AiAskRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should fail if question is missing', () => {
		const invalidRequest = {
			...validRequest,
			question: undefined,
		};

		const result = AiAskRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['question']);
	});

	it('should fail if context is invalid', () => {
		const invalidRequest = {
			...validRequest,
			context: {
				...validRequest.context,
				schema: [
					{
						nodeName: 'TestNode',
						schema: {
							type: 'invalid-type', // Invalid type
							value: 'testValue',
							path: '/test/path',
						},
					},
				],
			},
		};

		const result = AiAskRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
	});

	it('should fail if forNode is missing', () => {
		const invalidRequest = {
			...validRequest,
			forNode: undefined,
		};

		const result = AiAskRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['forNode']);
	});

	it('should validate all possible schema types', () => {
		const allTypesRequest = {
			question: 'Test all possible types',
			context: {
				schema: [
					{
						nodeName: 'AllTypesNode',
						schema: {
							type: 'object',
							key: 'typesRoot',
							value: [
								{ type: 'string', key: 'stringType', value: 'string', path: '/types/string' },
								{ type: 'number', key: 'numberType', value: 'number', path: '/types/number' },
								{ type: 'boolean', key: 'booleanType', value: 'boolean', path: '/types/boolean' },
								{ type: 'bigint', key: 'bigintType', value: 'bigint', path: '/types/bigint' },
								{ type: 'symbol', key: 'symbolType', value: 'symbol', path: '/types/symbol' },
								{ type: 'array', key: 'arrayType', value: [], path: '/types/array' },
								{ type: 'object', key: 'objectType', value: [], path: '/types/object' },
								{
									type: 'function',
									key: 'functionType',
									value: 'function',
									path: '/types/function',
								},
								{ type: 'null', key: 'nullType', value: 'null', path: '/types/null' },
								{
									type: 'undefined',
									key: 'undefinedType',
									value: 'undefined',
									path: '/types/undefined',
								},
							],
							path: '/types/root',
						},
					},
				],
				inputSchema: {
					nodeName: 'InputNode',
					schema: {
						type: 'object',
						key: 'simpleInput',
						value: [
							{
								type: 'string',
								key: 'simpleKey',
								value: 'simpleValue',
								path: '/simple/path',
							},
						],
						path: '/simple/input/path',
					},
				},
				pushRef: 'push-types-123',
				ndvPushRef: 'ndv-push-types-456',
			},
			forNode: 'TypeCheckNode',
		};

		const result = AiAskRequestDto.safeParse(allTypesRequest);
		expect(result.success).toBe(true);
	});

	it('should fail with invalid type', () => {
		const invalidTypeRequest = {
			question: 'Test invalid type',
			context: {
				schema: [
					{
						nodeName: 'InvalidTypeNode',
						schema: {
							type: 'invalid-type', // This should fail
							key: 'invalidKey',
							value: 'invalidValue',
							path: '/invalid/path',
						},
					},
				],
				inputSchema: {
					nodeName: 'InputNode',
					schema: {
						type: 'object',
						key: 'simpleInput',
						value: [
							{
								type: 'string',
								key: 'simpleKey',
								value: 'simpleValue',
								path: '/simple/path',
							},
						],
						path: '/simple/input/path',
					},
				},
				pushRef: 'push-invalid-123',
				ndvPushRef: 'ndv-push-invalid-456',
			},
			forNode: 'InvalidTypeNode',
		};

		const result = AiAskRequestDto.safeParse(invalidTypeRequest);
		expect(result.success).toBe(false);
	});

	it('should validate multiple schema entries', () => {
		const multiSchemaRequest = {
			question: 'Multiple schema test',
			context: {
				schema: [
					{
						nodeName: 'FirstNode',
						schema: {
							type: 'string',
							key: 'firstKey',
							value: 'firstValue',
							path: '/first/path',
						},
					},
					{
						nodeName: 'SecondNode',
						schema: {
							type: 'object',
							key: 'secondKey',
							value: [
								{
									type: 'number',
									key: 'nestedKey',
									value: 'nestedValue',
									path: '/second/nested/path',
								},
							],
							path: '/second/path',
						},
					},
				],
				inputSchema: {
					nodeName: 'InputNode',
					schema: {
						type: 'object',
						key: 'simpleInput',
						value: [
							{
								type: 'string',
								key: 'simpleKey',
								value: 'simpleValue',
								path: '/simple/path',
							},
						],
						path: '/simple/input/path',
					},
				},
				pushRef: 'push-multi-123',
				ndvPushRef: 'ndv-push-multi-456',
			},
			forNode: 'MultiSchemaNode',
		};

		const result = AiAskRequestDto.safeParse(multiSchemaRequest);
		expect(result.success).toBe(true);
	});
});
