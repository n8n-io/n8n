import { createNodeAsTool } from '@/CreateNodeAsTool';
import type { IExecuteFunctions, INodeParameters, INodeType } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
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
			addInputData: jest.fn(),
			addOutputData: jest.fn(),
		} as unknown as IExecuteFunctions;

		mockNode = {
			description: {
				name: 'TestNode',
				description: 'Test node description',
			},
			execute: jest.fn().mockResolvedValue([[{ json: { result: 'test' } }]]),
		} as unknown as INodeType;

		mockNodeParameters = {
			param1: "{{ '__PLACEHOLDER: Test parameter' }}",
			param2: 'static value',
			nestedParam: {
				subParam: "{{ '__PLACEHOLDER: Nested parameter' }}",
			},
		};
		jest.clearAllMocks();
	});

	it('should create a DynamicStructuredTool with correct properties', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool).toBeDefined();
		expect(tool.name).toBe('TestNode');
		expect(tool.description).toBe('Test node description');
		expect(tool.schema).toBeDefined();
	});

	it('should use toolDescription if provided', () => {
		const customDescription = 'Custom tool description';
		(mockCtx.getNodeParameter as jest.Mock).mockReturnValue(customDescription);

		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.description).toBe(customDescription);
	});

	it('should create a schema based on placeholder values in nodeParameters', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema).toBeDefined();
		expect(tool.schema.shape).toHaveProperty('param1');
		expect(tool.schema.shape).toHaveProperty('nestedParam__subParam');
		expect(tool.schema.shape).not.toHaveProperty('param2');
	});

	it('should handle nested parameters correctly', () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		expect(tool.schema.shape.nestedParam__subParam).toBeInstanceOf(z.ZodString);
	});

	it('should create a function that wraps the node execution', async () => {
		const tool = createNodeAsTool(mockNode, mockCtx, mockNodeParameters);

		const result = await tool.func({ param1: 'test value', nestedParam__subParam: 'nested value' });

		expect(mockCtx.addInputData).toHaveBeenCalledWith(NodeConnectionType.AiTool, [
			[{ json: { param1: 'test value', nestedParam__subParam: 'nested value' } }],
		]);
		expect(mockNode.execute).toHaveBeenCalled();
		expect(mockCtx.addOutputData).toHaveBeenCalledWith(NodeConnectionType.AiTool, 0, [
			[{ json: { response: [{ result: 'test' }] } }],
		]);
		expect(result).toBe(JSON.stringify([{ result: 'test' }]));
	});
});
