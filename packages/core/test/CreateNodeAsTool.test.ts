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
		expect(tool.schema.shape.dateParam).toBeInstanceOf(z.ZodString);
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
				upvotes: "={{ $fromAI('upvotes', 'Upvotes count(only positive, please)', 'number') }}",
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
	it('should handle $fromAI calls with long parameter name', () => {
		const longParam = 'A'.repeat(65);
		mockNodeParameters = {
			longParam: `={{ $fromAI('${longParam}') }}`,
		};

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			`Parameter name \`${longParam}\` is invalid.`,
		);
	});

	it('should handle $fromAI calls with empty parameters', () => {
		mockNodeParameters = {
			emptyParam: "={{ $fromAI('', 'Some description', '') }}",
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

	it('should handle multiple $fromAI calls with the same parameter name', () => {
		mockNodeParameters = {
			duplicateParam1: "={{ $fromAI('duplicate', 'First duplicate', 'string') }}",
			duplicateParam2: "={{ $fromAI('duplicate', 'Second duplicate', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.duplicate).toBeDefined();
		expect(tool.schema.shape.duplicate.description).toBe('Second duplicate');
		expect(tool.schema.shape.duplicate).toBeInstanceOf(z.ZodNumber);
	});
	it('should handle escaped single quotes in parameter names and descriptions', () => {
		mockNodeParameters = {
			escapedQuotesParam:
				"={{ $fromAI('paramName', 'Description with \\'escaped\\' quotes', 'string') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.paramName.description).toBe("Description with 'escaped' quotes");
	});

	it('should handle escaped double quotes in parameter names and descriptions', () => {
		mockNodeParameters = {
			escapedQuotesParam:
				'={{ $fromAI("paramName", "Description with \\"escaped\\" quotes", "string") }}',
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.paramName.description).toBe('Description with "escaped" quotes');
	});

	it('should handle escaped backslashes in parameter names and descriptions', () => {
		mockNodeParameters = {
			escapedBackslashesParam:
				"={{ $fromAI('paramName', 'Description with \\\\ backslashes', 'string') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.paramName.description).toBe('Description with \\ backslashes');
	});

	it('should handle mixed escaped characters in parameter names and descriptions', () => {
		mockNodeParameters = {
			mixedEscapesParam:
				"={{ $fromAI('paramName', 'Description with \\'mixed\" characters', 'string') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.paramName.description).toBe('Description with \'mixed" characters');
	});

	it('should ignore excess arguments in $fromAI calls beyond the fourth argument', () => {
		mockNodeParameters = {
			excessArgsParam:
				"={{ $fromAI('excessArgs', 'Param with excess arguments', 'string', 'default', 'extraArg1', 'extraArg2') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.excessArgs._def.innerType).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.excessArgs.description).toBe('Param with excess arguments');
		expect(tool.schema.shape.excessArgs._def.defaultValue()).toBe('default');
	});
	it('should ignore non-string parameters containing $fromAI-like syntax', () => {
		mockNodeParameters = {
			numericParam: 12345,
			booleanParam: true,
			objectParam: {
				nestedNumeric: 67890,
			},
			fakeFromAI: 'This is not a valid $fromAI call',
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape).toEqual({});
	});
	it('should correctly parse $fromAI calls with nested parentheses', () => {
		mockNodeParameters = {
			nestedParenthesesParam:
				"={{ $fromAI('paramWithNested', 'Description with ((nested)) parentheses', 'string') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.paramWithNested).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.paramWithNested.description).toBe(
			'Description with ((nested)) parentheses',
		);
	});
	it('should throw an error for $fromAI calls with unsupported types', () => {
		mockNodeParameters = {
			invalidTypeParam:
				"={{ $fromAI('invalidType', 'Param with unsupported type', 'unsupportedType') }}",
		};

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			'Invalid type: unsupportedType',
		);
	});
	it('should accept parameter names with underscores and hyphens', () => {
		mockNodeParameters = {
			validName1:
				"={{ $fromAI('param_name-1', 'Valid name with underscore and hyphen', 'string') }}",
			validName2: "={{ $fromAI('param_name_2', 'Another valid name', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape['param_name-1']).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape['param_name-1'].description).toBe(
			'Valid name with underscore and hyphen',
		);

		expect(tool.schema.shape.param_name_2).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.param_name_2.description).toBe('Another valid name');
	});

	it('should throw an error for parameter names with invalid special characters', () => {
		mockNodeParameters = {
			invalidNameParam:
				"={{ $fromAI('param@name!', 'Invalid name with special characters', 'string') }}",
		};

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			'Parameter name `param@name!` is invalid.',
		);
	});
	it('should accept parameter names with exactly 64 characters', () => {
		const longName = 'a'.repeat(64);
		mockNodeParameters = {
			longNameParam: `={{ $fromAI('${longName}', 'Param with 64 character name', 'string') }}`,
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape[longName]).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape[longName].description).toBe('Param with 64 character name');
	});

	it('should throw an error for parameter names exceeding 64 characters', () => {
		const tooLongName = 'a'.repeat(65);
		mockNodeParameters = {
			tooLongNameParam: `={{ $fromAI('${tooLongName}', 'Param with 65 character name', 'string') }}`,
		};

		expect(() => createNodeAsTool(mockNode, mockCtx, mockNodeParameters)).toThrow(
			`Parameter name \`${tooLongName}\` is invalid.`,
		);
	});
	it('should handle $fromAI calls with empty description', () => {
		mockNodeParameters = {
			emptyDescriptionParam: "={{ $fromAI('emptyDescription', '', 'number') }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.emptyDescription).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.emptyDescription.description).toBeUndefined();
	});
	it('should correctly parse $fromAI calls with varying spaces and capitalization', () => {
		mockNodeParameters = {
			varyingSpacing1: "={{$fromAI('param1','Description1','string')}}",
			varyingSpacing2: "={{  $fromAI (  'param2' , 'Description2' , 'number' )  }}",
			varyingSpacing3: "={{ $FROMai('param3', 'Description3', 'boolean') }}",
		};

		// $fromAI is case-sensitive; 'FROMai' should not be recognized
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.param1.description).toBe('Description1');

		expect(tool.schema.shape.param2).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.param2.description).toBe('Description2');

		expect(tool.schema.shape).not.toHaveProperty('param3');
	});
	it('should correctly parse $fromAI calls within template literals', () => {
		mockNodeParameters = {
			templateLiteralParam:
				"={{ `Value is: ${$fromAI('templatedParam', 'Templated param description', 'string')}` }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.templatedParam).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.templatedParam.description).toBe('Templated param description');
	});
	it('should correctly parse multiple $fromAI calls interleaved with regular text', () => {
		mockNodeParameters = {
			interleavedParams:
				"={{ 'Start ' + $fromAI('param1', 'First param', 'string') + ' Middle ' + $fromAI('param2', 'Second param', 'number') + ' End' }}",
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.param1.description).toBe('First param');

		expect(tool.schema.shape.param2).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.param2.description).toBe('Second param');
	});
	it('should correctly parse $fromAI calls with complex JSON default values', () => {
		mockNodeParameters = {
			complexJsonDefault:
				'={{ $fromAI(\'complexJson\', \'Param with complex JSON default\', \'json\', \'{"nested": {"key": "value"}, "array": [1, 2, 3]}\') }}',
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.complexJson._def.innerType).toBeInstanceOf(z.ZodRecord);
		expect(tool.schema.shape.complexJson.description).toBe('Param with complex JSON default');
		expect(tool.schema.shape.complexJson._def.defaultValue()).toEqual({
			nested: { key: 'value' },
			array: [1, 2, 3],
		});
	});
	it('should ignore $fromAI calls embedded in non-string node parameters', () => {
		mockNodeParameters = {
			numberParam: 42,
			booleanParam: false,
			objectParam: {
				innerString: "={{ $fromAI('innerParam', 'Inner param', 'string') }}",
				innerNumber: 100,
				innerObject: {
					deepParam: "={{ $fromAI('deepParam', 'Deep param', 'number') }}",
				},
			},
			arrayParam: [
				"={{ $fromAI('arrayParam1', 'First array param', 'string') }}",
				200,
				"={{ $fromAI('nestedArrayParam', 'Nested array param', 'boolean') }}",
			],
		};

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.innerParam).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.innerParam.description).toBe('Inner param');

		expect(tool.schema.shape.deepParam).toBeInstanceOf(z.ZodNumber);
		expect(tool.schema.shape.deepParam.description).toBe('Deep param');

		expect(tool.schema.shape.arrayParam1).toBeInstanceOf(z.ZodString);
		expect(tool.schema.shape.arrayParam1.description).toBe('First array param');

		expect(tool.schema.shape.nestedArrayParam).toBeInstanceOf(z.ZodBoolean);
		expect(tool.schema.shape.nestedArrayParam.description).toBe('Nested array param');
	});
});
