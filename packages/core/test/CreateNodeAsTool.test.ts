/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string */
import { createNodeAsTool } from '@/CreateNodeAsTool';
import type { IExecuteFunctions, INodeParameters, INodeType } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

jest.mock('@langchain/core/tools', () => ({
	DynamicStructuredTool: jest.fn().mockImplementation((config) => ({
		name: config.name,
		description: config.description,
		schema: config.schema,
		func: config.func,
	})),
}));

describe('createNodeAsTool', () => {
	let mockCtx: IExecuteFunctions;
	let mockNode: INodeType;
	let mockNodeParameters: INodeParameters;

	beforeEach(() => {
		mockCtx = {
			getNodeParameter: jest.fn(),
			addInputData: jest.fn().mockReturnValue({ index: 0 }),
			addOutputData: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'Test_Node' }),
		} as unknown as IExecuteFunctions;

		mockNode = {
			description: {
				name: 'TestNode',
				description: 'Test node description',
			},
			execute: jest.fn().mockResolvedValue([[{ json: { result: 'test' } }]]),
		} as unknown as INodeType;

		mockNodeParameters = {
			param1: "={{$fromAI('param1', 'Test parameter', 'string') }}",
			param2: 'static value',
			nestedParam: {
				subParam: "={{ $fromAI('subparam', 'Nested parameter', 'string') }}",
			},
			descriptionType: 'auto',
			resource: 'testResource',
			operation: 'testOperation',
		};
		jest.clearAllMocks();
	});

	it('should create a DynamicStructuredTool with correct properties', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool).toBeDefined();
		expect(tool.name).toBe('Test_Node');
		expect(tool.description).toBe(
			'Test node description\n Resource: testResource\n Operation: testOperation',
		);
		expect(tool.schema).toBeDefined();
	});

	it('should use toolDescription if provided', () => {
		mockNodeParameters.descriptionType = 'manual';
		mockNodeParameters.toolDescription = 'Custom tool description';

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.description).toBe('Custom tool description');
	});

	it('should create a schema based on fromAI arguments in nodeParameters', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema).toBeDefined();
		expect(tool.schema.shape).toHaveProperty('param1');
		expect(tool.schema.shape).toHaveProperty('subparam');
		expect(tool.schema.shape).not.toHaveProperty('param2');
	});

	it('should handle fromAI arguments correctly', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.subparam).toBeInstanceOf(z.ZodString);
	});

	it('should create a function that wraps the node execution', async () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		const result = await tool.func({ param1: 'test value', subparam: 'nested value' });

		expect(mockCtx.addInputData).toHaveBeenCalledWith(NodeConnectionType.AiTool, [
			[{ json: { param1: 'test value', subparam: 'nested value' } }],
		]);
		expect(mockNode.execute).toHaveBeenCalled();
		expect(mockCtx.addOutputData).toHaveBeenCalledWith(NodeConnectionType.AiTool, 0, [
			[{ json: { response: [{ result: 'test' }] } }],
		]);
		expect(result).toBe(JSON.stringify([{ result: 'test' }]));
	});

	it('should throw an error for invalid parameter names', () => {
		mockNodeParameters.invalidParam = "$fromAI('invalid param', 'Invalid parameter', 'string')";

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			'Parameter name `invalid param` is invalid.',
		);
	});

	it('should handle different data types correctly', () => {
		mockNodeParameters = {
			stringParam: "={{ $fromAI('stringParam', 'A string parameter', 'string') }}",
			numberParam: "={{ $fromAI('numberParam', 'A number parameter', 'number') }}",
			booleanParam: "={{ $fromAI('booleanParam', 'A boolean parameter', 'boolean') }}",
			jsonParam: "={{ $fromAI('jsonParam', 'A JSON parameter', 'json') }}",
			dateParam: "={{ $fromAI('dateParam', 'A date parameter', 'date') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.stringParam).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.numberParam).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.booleanParam).toBeInstanceOf(z.ZodBoolean);
		expect(tool.schema.shape.jsonParam).toBeInstanceOf(z.ZodRecord);
		expect(tool.schema.shape.dateParam).toBeInstanceOf(z.ZodDate);
	});

	it('should handle default values correctly', () => {
		mockNodeParameters = {
			paramWithDefault:
				"={{ $fromAI('paramWithDefault', 'Parameter with default', 'string', 'default value') }}",
			numberWithDefault: "={{ $fromAI('numberWithDefault', 'Number with default', 'number', 42) }}",
			booleanWithDefault:
				"={{ $fromAI('booleanWithDefault', 'Boolean with default', 'boolean', true) }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramWithDefault.description).toBe('Parameter with default');
		expect(tool.schema.shape.numberWithDefault.description).toBe('Number with default');
		expect(tool.schema.shape.booleanWithDefault.description).toBe('Boolean with default');
	});

	it('should handle nested parameters correctly', () => {
		mockNodeParameters = {
			topLevel: "={{ $fromAI('topLevel', 'Top level parameter', 'string') }}",
			nested: {
				level1: "={{ $fromAI('level1', 'Nested level 1', 'string') }}",
				deeperNested: {
					level2: "={{ $fromAI('level2', 'Nested level 2', 'number') }}",
				},
			},
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.topLevel).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.level1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.level2).toBeInstanceOf(z.ZodNumber);
	});

	it('should handle array parameters correctly', () => {
		mockNodeParameters = {
			arrayParam: [
				"={{ $fromAI('item1', 'First item', 'string') }}",
				"={{ $fromAI('item2', 'Second item', 'number') }}",
			],
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.item1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.item2).toBeInstanceOf(z.ZodNumber);
	});

	it('should handle error during node execution', async () => {
		mockNode.execute = jest.fn().mockRejectedValue(new Error('Execution failed'));
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		const result = await tool.func({ param1: 'test value' });

		expect(result).toContain('Error during node execution:');
		expect(mockCtx.addOutputData).toHaveBeenCalledWith(
			NodeConnectionType.AiTool,
			0,
			expect.any(NodeOperationError),
		);
	});

	it('should handle empty parameters', () => {
		mockNodeParameters = {};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape).toEqual({});
	});

	it('should handle parameters with no fromAI calls', () => {
		mockNodeParameters = {
			param1: 'static value 1',
			param2: 'static value 2',
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape).toEqual({});
	});

	it('should handle multiple fromAI calls in a single parameter', () => {
		mockNodeParameters = {
			complexParam:
				"={{ $fromAI('param1', 'First part', 'string') }} - {{ $fromAI('param2', 'Second part', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.param2).toBeInstanceOf(z.ZodNumber);
	});

	it('should handle $fromAI calls in the middle of strings and check descriptions', () => {
		mockNodeParameters = {
			value: {
				article_Id: "={{ $fromAI('article_id', 'Article ID, with a comma') }}",
				author: "=Author: {{ $fromAI('author') }}",
				submit_time: "={{ $fromAI('submit_time', 'Submit date', 'string') }}",
				url: "={{ `URL: ${$fromAI('url')}` }}",
				content: "=Content: {{ $fromAI('content', 'Content type') }} End of content",
				upvotes: "={{ $fromAI('upvotes', 'Upvotes count(only positive, please)', 'number', 10) }}",
			},
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.article_id).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.article_id.description).toBe('Article ID, with a comma');
		expect(tool.schema.shape.author).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.author.description).toBe(undefined);
		expect(tool.schema.shape.submit_time).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.submit_time.description).toBe('Submit date');
		expect(tool.schema.shape.url).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.url.description).toBe(undefined);
		expect(tool.schema.shape.content).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.content.description).toBe('Content type');
		expect(tool.schema.shape.upvotes).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.upvotes.description).toBe('Upvotes count(only positive, please)');
	});

	it('should handle $fromAI calls with complex expressions', () => {
		mockNodeParameters = {
			complexExpression:
				"={{ `Result: ${$fromAI('param1')} + ${$fromAI('param2')} = ${$fromAI('param1') + $fromAI('param2')}` }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.param1).toBeDefined();
		expect(tool.schema.shape.param2).toBeDefined();
	});

	it('should handle $fromAI calls with unicode characters', () => {
		mockNodeParameters = {
			unicodeParam: "={{ $fromAI('unicodeParam', '🌈 Unicode parameter 你好', 'string') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.unicodeParam).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.unicodeParam.description).toBe('🌈 Unicode parameter 你好');
	});

	it('should handle $fromAI calls with very long descriptions', () => {
		const longDescription = 'A'.repeat(1000);
		mockNodeParameters = {
			longParam: `={{ $fromAI('longParam', '${longDescription}', 'string') }}`,
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.longParam).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.longParam.description).toBe(longDescription);
	});

	it('should handle $fromAI calls with empty parameters', () => {
		mockNodeParameters = {
			emptyParam: "={{ $fromAI('', '', '') }}",
		};

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			'Parameter name `` is invalid.',
		);
	});

	it('should handle $fromAI calls with only some parameters', () => {
		mockNodeParameters = {
			partialParam1: "={{ $fromAI('partial1') }}",
			partialParam2: "={{ $fromAI('partial2', 'Description only') }}",
			partialParam3: "={{ $fromAI('partial3', '', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.partial1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.partial2).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.partial3).toBeInstanceOf(z.ZodNumber);
	});

	it('should handle $fromAI calls with malformed JSON', () => {
		mockNodeParameters = {
			malformedJson: "={{ $fromAI('jsonParam', 'Malformed JSON', 'json') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.jsonParam).toBeInstanceOf(z.ZodRecord);
	});

	it('should handle $fromAI calls with very large numbers', () => {
		mockNodeParameters = {
			largeNumber: `={{ $fromAI('largeNumber', 'Very large number', 'number', ${Number.MAX_SAFE_INTEGER}) }}`,
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.largeNumber).toBeInstanceOf(z.ZodNumber);
	});

	it('should handle multiple $fromAI calls with the same parameter name', () => {
		mockNodeParameters = {
			duplicateParam1: "={{ $fromAI('duplicate', 'First duplicate', 'string') }}",
			duplicateParam2: "={{ $fromAI('duplicate', 'Second duplicate', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.duplicate).toBeDefined();
	});
});
