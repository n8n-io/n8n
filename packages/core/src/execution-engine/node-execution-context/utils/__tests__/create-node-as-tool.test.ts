import { mock } from 'jest-mock-extended';
import type { INodeType, ISupplyDataFunctions, INode } from 'n8n-workflow';
import { z } from 'zod';

import { createNodeAsTool } from '../create-node-as-tool';

jest.mock('@langchain/core/tools', () => ({
	DynamicStructuredTool: jest.fn().mockImplementation((config) => ({
		name: config.name,
		description: config.description,
		schema: config.schema,
		func: config.func,
	})),
}));

describe('createNodeAsTool', () => {
	const context = mock<ISupplyDataFunctions>({
		getNodeParameter: jest.fn(),
		addInputData: jest.fn(),
		addOutputData: jest.fn(),
		getNode: jest.fn(),
	});
	const handleToolInvocation = jest.fn();
	const nodeType = mock<INodeType>({
		description: {
			name: 'TestNode',
			description: 'Test node description',
			defaults: {
				name: 'Test Node',
			},
			properties: [],
		},
	});
	const node = mock<INode>({ name: 'Test_Node' });
	const options = { node, nodeType, handleToolInvocation };

	beforeEach(() => {
		jest.clearAllMocks();
		(context.addInputData as jest.Mock).mockReturnValue({ index: 0 });
		(context.getNode as jest.Mock).mockReturnValue(node);
		(nodeType.execute as jest.Mock).mockResolvedValue([[{ json: { result: 'test' } }]]);

		node.parameters = {
			param1: "={{$fromAI('param1', 'Test parameter', 'string') }}",
			param2: 'static value',
			nestedParam: {
				subParam: "={{ $fromAI('subparam', 'Nested parameter', 'string') }}",
			},
			descriptionType: 'auto',
			resource: 'testResource',
			operation: 'testOperation',
		};
	});

	describe('Tool Creation and Basic Properties', () => {
		it('should create a DynamicStructuredTool with correct properties', () => {
			const tool = createNodeAsTool(options).response;

			expect(tool).toBeDefined();
			expect(tool.name).toBe('Test_Node');
			expect(tool.description).toBe('testOperation testResource in Test Node');
			expect(tool.schema).toBeDefined();
		});

		it('should use toolDescription if provided', () => {
			node.parameters.descriptionType = 'manual';
			node.parameters.toolDescription = 'Custom tool description';

			const tool = createNodeAsTool(options).response;

			expect(tool.description).toBe('Custom tool description');
		});

		it('should use toolDescription when descriptionType is absent', () => {
			delete node.parameters.descriptionType;
			node.parameters.toolDescription = 'Another custom tool description';

			const tool = createNodeAsTool(options).response;

			expect(tool.description).toBe('Another custom tool description');
		});
	});

	describe('Schema Creation and Parameter Handling', () => {
		it('should create a schema based on fromAI arguments in nodeParameters', () => {
			const tool = createNodeAsTool(options).response;

			expect(tool.schema).toBeDefined();
			expect(tool.schema.shape).toHaveProperty('param1');
			expect(tool.schema.shape).toHaveProperty('subparam');
			expect(tool.schema.shape).not.toHaveProperty('param2');
		});

		it('should handle fromAI arguments correctly', () => {
			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.subparam).toBeInstanceOf(z.ZodString);
		});

		it('should handle default values correctly', () => {
			node.parameters = {
				paramWithDefault:
					"={{ $fromAI('paramWithDefault', 'Parameter with default', 'string', 'default value') }}",
				numberWithDefault:
					"={{ $fromAI('numberWithDefault', 'Number with default', 'number', 42) }}",
				booleanWithDefault:
					"={{ $fromAI('booleanWithDefault', 'Boolean with default', 'boolean', true) }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramWithDefault.description).toBe('Parameter with default');
			expect(tool.schema.shape.numberWithDefault.description).toBe('Number with default');
			expect(tool.schema.shape.booleanWithDefault.description).toBe('Boolean with default');
		});

		it('should handle nested parameters correctly', () => {
			node.parameters = {
				topLevel: "={{ $fromAI('topLevel', 'Top level parameter', 'string') }}",
				nested: {
					level1: "={{ $fromAI('level1', 'Nested level 1', 'string') }}",
					deeperNested: {
						level2: "={{ $fromAI('level2', 'Nested level 2', 'number') }}",
					},
				},
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.topLevel).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.level1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.level2).toBeInstanceOf(z.ZodNumber);
		});

		it('should handle array parameters correctly', () => {
			node.parameters = {
				arrayParam: [
					"={{ $fromAI('item1', 'First item', 'string') }}",
					"={{ $fromAI('item2', 'Second item', 'number') }}",
				],
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.item1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.item2).toBeInstanceOf(z.ZodNumber);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle error during node execution', async () => {
			nodeType.execute = jest.fn().mockRejectedValue(new Error('Execution failed'));
			const tool = createNodeAsTool(options).response;
			handleToolInvocation.mockReturnValue('Error during node execution: some random issue.');

			const result = await tool.func({ param1: 'test value' });

			expect(result).toContain('Error during node execution:');
		});

		it('should throw an error for invalid parameter names', () => {
			node.parameters.invalidParam = "$fromAI('invalid param', 'Invalid parameter', 'string')";

			expect(() => createNodeAsTool(options)).toThrow('Parameter key `invalid param` is invalid');
		});

		it('should throw an error for $fromAI calls with unsupported types', () => {
			node.parameters = {
				invalidTypeParam:
					"={{ $fromAI('invalidType', 'Param with unsupported type', 'unsupportedType') }}",
			};

			expect(() => createNodeAsTool(options)).toThrow('Invalid type: unsupportedType');
		});

		it('should handle empty parameters and parameters with no fromAI calls', () => {
			node.parameters = {
				param1: 'static value 1',
				param2: 'static value 2',
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape).toEqual({});
		});
	});

	describe('Parameter Name and Description Handling', () => {
		it('should accept parameter names with underscores and hyphens', () => {
			node.parameters = {
				validName1:
					"={{ $fromAI('param_name-1', 'Valid name with underscore and hyphen', 'string') }}",
				validName2: "={{ $fromAI('param_name_2', 'Another valid name', 'number') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape['param_name-1']).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape['param_name-1'].description).toBe(
				'Valid name with underscore and hyphen',
			);

			expect(tool.schema.shape.param_name_2).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.param_name_2.description).toBe('Another valid name');
		});

		it('should throw an error for parameter names with invalid special characters', () => {
			node.parameters = {
				invalidNameParam:
					"={{ $fromAI('param@name!', 'Invalid name with special characters', 'string') }}",
			};

			expect(() => createNodeAsTool(options)).toThrow('Parameter key `param@name!` is invalid');
		});

		it('should throw an error for empty parameter name', () => {
			node.parameters = {
				invalidNameParam: "={{ $fromAI('', 'Invalid name with special characters', 'string') }}",
			};

			expect(() => createNodeAsTool(options)).toThrow(
				'You must specify a key when using $fromAI()',
			);
		});

		it('should handle parameter names with exact and exceeding character limits', () => {
			const longName = 'a'.repeat(64);
			const tooLongName = 'a'.repeat(65);
			node.parameters = {
				longNameParam: `={{ $fromAI('${longName}', 'Param with 64 character name', 'string') }}`,
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape[longName]).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape[longName].description).toBe('Param with 64 character name');

			node.parameters = {
				tooLongNameParam: `={{ $fromAI('${tooLongName}', 'Param with 65 character name', 'string') }}`,
			};
			expect(() => createNodeAsTool(options)).toThrow(
				`Parameter key \`${tooLongName}\` is invalid`,
			);
		});

		it('should handle $fromAI calls with empty description', () => {
			node.parameters = {
				emptyDescriptionParam: "={{ $fromAI('emptyDescription', '', 'number') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.emptyDescription).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.emptyDescription.description).toBeUndefined();
		});

		it('should throw an error for calls with the same parameter but different descriptions', () => {
			node.parameters = {
				duplicateParam1: "={{ $fromAI('duplicate', 'First duplicate', 'string') }}",
				duplicateParam2: "={{ $fromAI('duplicate', 'Second duplicate', 'number') }}",
			};

			expect(() => createNodeAsTool(options)).toThrow(
				"Duplicate key 'duplicate' found with different description or type",
			);
		});
		it('should throw an error for calls with the same parameter but different types', () => {
			node.parameters = {
				duplicateParam1: "={{ $fromAI('duplicate', 'First duplicate', 'string') }}",
				duplicateParam2: "={{ $fromAI('duplicate', 'First duplicate', 'number') }}",
			};

			expect(() => createNodeAsTool(options)).toThrow(
				"Duplicate key 'duplicate' found with different description or type",
			);
		});
	});

	describe('Complex Parsing Scenarios', () => {
		it('should correctly parse $fromAI calls with varying spaces, capitalization, and within template literals', () => {
			node.parameters = {
				varyingSpacing1: "={{$fromAI('param1','Description1','string')}}",
				varyingSpacing2: "={{  $fromAI (  'param2' , 'Description2' , 'number' )  }}",
				varyingSpacing3: "={{ $FROMai('param3', 'Description3', 'boolean') }}",
				wrongCapitalization: "={{$fromai('param4','Description4','number')}}",
				templateLiteralParam:
					// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
					"={{ `Value is: ${$fromAI('templatedParam', 'Templated param description', 'string')}` }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.param1.description).toBe('Description1');

			expect(tool.schema.shape.param2).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.param2.description).toBe('Description2');

			expect(tool.schema.shape.param3).toBeInstanceOf(z.ZodBoolean);
			expect(tool.schema.shape.param3.description).toBe('Description3');

			expect(tool.schema.shape.param4).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.param4.description).toBe('Description4');

			expect(tool.schema.shape.templatedParam).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.templatedParam.description).toBe('Templated param description');
		});

		it('should correctly parse multiple $fromAI calls interleaved with regular text', () => {
			node.parameters = {
				interleavedParams:
					"={{ 'Start ' + $fromAI('param1', 'First param', 'string') + ' Middle ' + $fromAI('param2', 'Second param', 'number') + ' End' }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.param1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.param1.description).toBe('First param');

			expect(tool.schema.shape.param2).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.param2.description).toBe('Second param');
		});

		it('should correctly parse $fromAI calls with complex JSON default values', () => {
			node.parameters = {
				complexJsonDefault:
					'={{ $fromAI(\'complexJson\', \'Param with complex JSON default\', \'json\', \'{"nested": {"key": "value"}, "array": [1, 2, 3]}\') }}',
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.complexJson._def.innerType).toBeInstanceOf(z.ZodEffects);
			expect(tool.schema.shape.complexJson.description).toBe('Param with complex JSON default');
			expect(tool.schema.shape.complexJson._def.defaultValue()).toEqual({
				nested: { key: 'value' },
				array: [1, 2, 3],
			});
		});

		it('should ignore $fromAI calls embedded in non-string node parameters', () => {
			node.parameters = {
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

			const tool = createNodeAsTool(options).response;

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

	describe('Escaping and Special Characters', () => {
		it('should handle escaped single quotes in parameter names and descriptions', () => {
			node.parameters = {
				escapedQuotesParam:
					"={{ $fromAI('paramName', 'Description with \\'escaped\\' quotes', 'string') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.paramName.description).toBe("Description with 'escaped' quotes");
		});

		it('should handle escaped double quotes in parameter names and descriptions', () => {
			node.parameters = {
				escapedQuotesParam:
					'={{ $fromAI("paramName", "Description with \\"escaped\\" quotes", "string") }}',
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.paramName.description).toBe('Description with "escaped" quotes');
		});

		it('should handle escaped backslashes in parameter names and descriptions', () => {
			node.parameters = {
				escapedBackslashesParam:
					"={{ $fromAI('paramName', 'Description with \\\\ backslashes', 'string') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.paramName.description).toBe('Description with \\ backslashes');
		});

		it('should handle mixed escaped characters in parameter names and descriptions', () => {
			node.parameters = {
				mixedEscapesParam:
					'={{ $fromAI(`paramName`, \'Description with \\\'mixed" characters\', "number") }}',
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramName).toBeInstanceOf(z.ZodNumber);
			expect(tool.schema.shape.paramName.description).toBe('Description with \'mixed" characters');
		});
	});

	describe('Edge Cases and Limitations', () => {
		it('should ignore excess arguments in $fromAI calls beyond the fourth argument', () => {
			node.parameters = {
				excessArgsParam:
					"={{ $fromAI('excessArgs', 'Param with excess arguments', 'string', 'default', 'extraArg1', 'extraArg2') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.excessArgs._def.innerType).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.excessArgs.description).toBe('Param with excess arguments');
			expect(tool.schema.shape.excessArgs._def.defaultValue()).toBe('default');
		});

		it('should correctly parse $fromAI calls with nested parentheses', () => {
			node.parameters = {
				nestedParenthesesParam:
					"={{ $fromAI('paramWithNested', 'Description with ((nested)) parentheses', 'string') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.paramWithNested).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.paramWithNested.description).toBe(
				'Description with ((nested)) parentheses',
			);
		});

		it('should handle $fromAI calls with very long descriptions', () => {
			const longDescription = 'A'.repeat(1000);
			node.parameters = {
				longParam: `={{ $fromAI('longParam', '${longDescription}', 'string') }}`,
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.longParam).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.longParam.description).toBe(longDescription);
		});

		it('should handle $fromAI calls with only some parameters', () => {
			node.parameters = {
				partialParam1: "={{ $fromAI('partial1') }}",
				partialParam2: "={{ $fromAI('partial2', 'Description only') }}",
				partialParam3: "={{ $fromAI('partial3', '', 'number') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.partial1).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.partial2).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.partial3).toBeInstanceOf(z.ZodNumber);
		});
	});

	describe('Unicode and Internationalization', () => {
		it('should handle $fromAI calls with unicode characters', () => {
			node.parameters = {
				unicodeParam: "={{ $fromAI('unicodeParam', '🌈 Unicode parameter 你好', 'string') }}",
			};

			const tool = createNodeAsTool(options).response;

			expect(tool.schema.shape.unicodeParam).toBeInstanceOf(z.ZodString);
			expect(tool.schema.shape.unicodeParam.description).toBe('🌈 Unicode parameter 你好');
		});
	});
});
