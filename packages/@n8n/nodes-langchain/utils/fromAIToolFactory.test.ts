import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { INode, INodeParameters } from 'n8n-workflow';

import {
	createToolFromNode,
	createZodSchemaFromArgs,
	extractFromAIParameters,
} from './fromAIToolFactory';

describe('fromAIToolFactory', () => {
	describe('extractFromAIParameters', () => {
		it('should extract $fromAI parameters from node parameters', () => {
			const nodeParameters: INodeParameters = {
				someField: '$fromAI("name", "The name of the user", "string")',
				nestedField: {
					value: '$fromAI("age", "The age of the user", "number")',
				},
			};

			const result = extractFromAIParameters(nodeParameters);

			expect(result).toHaveLength(2);
			expect(result).toContainEqual(
				expect.objectContaining({
					key: 'name',
					description: 'The name of the user',
					type: 'string',
				}),
			);
			expect(result).toContainEqual(
				expect.objectContaining({ key: 'age', description: 'The age of the user', type: 'number' }),
			);
		});

		it('should deduplicate parameters with the same key', () => {
			const nodeParameters: INodeParameters = {
				field1: '$fromAI("name", "First description")',
				field2: '$fromAI("name", "Second description")',
			};

			const result = extractFromAIParameters(nodeParameters);

			expect(result).toHaveLength(1);
			expect(result[0].key).toBe('name');
		});

		it('should return empty array when no $fromAI parameters exist', () => {
			const nodeParameters: INodeParameters = {
				someField: 'regular value',
				anotherField: 123,
			};

			const result = extractFromAIParameters(nodeParameters);

			expect(result).toHaveLength(0);
		});

		it('should handle arrays in node parameters', () => {
			const nodeParameters: INodeParameters = {
				items: ['$fromAI("item1", "First item")', '$fromAI("item2", "Second item")'],
			};

			const result = extractFromAIParameters(nodeParameters);

			expect(result).toHaveLength(2);
		});
	});

	describe('createZodSchemaFromArgs', () => {
		it('should create a Zod schema from arguments', () => {
			const args = [
				{ key: 'name', description: 'The name', type: 'string' as const },
				{ key: 'age', description: 'The age', type: 'number' as const },
			];

			const schema = createZodSchemaFromArgs(args);

			expect(schema.shape).toHaveProperty('name');
			expect(schema.shape).toHaveProperty('age');
		});

		it('should handle boolean type', () => {
			const args = [{ key: 'isActive', description: 'Is active', type: 'boolean' as const }];

			const schema = createZodSchemaFromArgs(args);
			const result = schema.safeParse({ isActive: true });

			expect(result.success).toBe(true);
		});

		it('should handle default values', () => {
			const args = [
				{ key: 'name', description: 'The name', type: 'string' as const, defaultValue: 'John' },
			];

			const schema = createZodSchemaFromArgs(args);
			const result = schema.safeParse({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe('John');
			}
		});
	});

	describe('createToolFromNode', () => {
		const createMockNode = (parameters: INodeParameters = {}): INode => ({
			id: 'test-node',
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters,
		});

		it('should create a DynamicTool when no $fromAI params and no extraArgs', () => {
			const node = createMockNode({ regularParam: 'value' });
			const tool = createToolFromNode(node, {
				name: 'test-tool',
				description: 'A test tool',
				func: async () => 'result',
			});

			expect(tool).toBeInstanceOf(DynamicTool);
			expect(tool.name).toBe('test-tool');
			expect(tool.description).toBe('A test tool');
		});

		it('should create a DynamicStructuredTool when $fromAI params exist', () => {
			const node = createMockNode({
				field: '$fromAI("query", "The search query")',
			});
			const tool = createToolFromNode(node, {
				name: 'search-tool',
				description: 'A search tool',
				func: async () => 'result',
			});

			expect(tool).toBeInstanceOf(DynamicStructuredTool);
			expect(tool.name).toBe('search-tool');
		});

		it('should create a DynamicStructuredTool when extraArgs are provided', () => {
			const node = createMockNode({});
			const tool = createToolFromNode(node, {
				name: 'tool-with-extra',
				description: 'A tool with extra args',
				func: async () => 'result',
				extraArgs: [{ key: 'input', description: 'The input query' }],
			});

			expect(tool).toBeInstanceOf(DynamicStructuredTool);
		});

		it('should combine $fromAI params with extraArgs', () => {
			const node = createMockNode({
				field: '$fromAI("filter", "Filter criteria")',
			});
			const tool = createToolFromNode(node, {
				name: 'combined-tool',
				description: 'A tool with combined args',
				func: async () => 'result',
				extraArgs: [{ key: 'input', description: 'The input query' }],
			}) as DynamicStructuredTool;

			expect(tool).toBeInstanceOf(DynamicStructuredTool);
			// Verify schema contains both keys by checking if parsing works
			const schema = tool.schema as unknown as { shape: Record<string, unknown> };
			expect(schema.shape).toHaveProperty('filter');
			expect(schema.shape).toHaveProperty('input');
		});

		it('should pass the func to the tool', async () => {
			const mockFunc = jest.fn().mockResolvedValue('test result');
			const node = createMockNode({});
			const tool = createToolFromNode(node, {
				name: 'func-test-tool',
				description: 'Testing func',
				func: mockFunc,
			});

			const result = await tool.invoke('test input');

			// Verify the function was called with the input as the first argument
			expect(mockFunc).toHaveBeenCalled();
			expect(mockFunc.mock.calls[0][0]).toBe('test input');
			expect(result).toBe('test result');
		});
	});
});
