import type { Tool } from 'langchain/tools';
import { DynamicStructuredTool } from 'langchain/tools';
import { NodeOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { z } from 'zod';

import type { ZodObjectAny } from '../../../../types/types';
import { checkForStructuredTools } from '../agents/utils';

describe('checkForStructuredTools', () => {
	let mockNode: INode;

	beforeEach(() => {
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	});

	it('should not throw error when no DynamicStructuredTools are present', async () => {
		const tools = [
			{
				name: 'regular-tool',
				constructor: { name: 'Tool' },
			} as Tool,
		];

		await expect(
			checkForStructuredTools(tools, mockNode, 'Conversation Agent'),
		).resolves.not.toThrow();
	});

	it('should throw NodeOperationError when DynamicStructuredTools are present', async () => {
		const dynamicTool = new DynamicStructuredTool({
			name: 'dynamic-tool',
			description: 'test tool',
			schema: z.object({}),
			func: async () => 'result',
		});

		const tools: Array<Tool | DynamicStructuredTool<ZodObjectAny>> = [dynamicTool];

		await expect(checkForStructuredTools(tools, mockNode, 'Conversation Agent')).rejects.toThrow(
			NodeOperationError,
		);

		await expect(
			checkForStructuredTools(tools, mockNode, 'Conversation Agent'),
		).rejects.toMatchObject({
			message:
				'The selected tools are not supported by "Conversation Agent", please use "Tools Agent" instead',
			description: 'Incompatible connected tools: "dynamic-tool"',
		});
	});

	it('should list multiple dynamic tools in error message', async () => {
		const dynamicTool1 = new DynamicStructuredTool({
			name: 'dynamic-tool-1',
			description: 'test tool 1',
			schema: z.object({}),
			func: async () => 'result',
		});

		const dynamicTool2 = new DynamicStructuredTool({
			name: 'dynamic-tool-2',
			description: 'test tool 2',
			schema: z.object({}),
			func: async () => 'result',
		});

		const tools = [dynamicTool1, dynamicTool2];

		await expect(
			checkForStructuredTools(tools, mockNode, 'Conversation Agent'),
		).rejects.toMatchObject({
			description: 'Incompatible connected tools: "dynamic-tool-1", "dynamic-tool-2"',
		});
	});

	it('should throw error with mixed tool types and list only dynamic tools in error message', async () => {
		const regularTool = {
			name: 'regular-tool',
			constructor: { name: 'Tool' },
		} as Tool;

		const dynamicTool = new DynamicStructuredTool({
			name: 'dynamic-tool',
			description: 'test tool',
			schema: z.object({}),
			func: async () => 'result',
		});

		const tools = [regularTool, dynamicTool];

		await expect(
			checkForStructuredTools(tools, mockNode, 'Conversation Agent'),
		).rejects.toMatchObject({
			message:
				'The selected tools are not supported by "Conversation Agent", please use "Tools Agent" instead',
			description: 'Incompatible connected tools: "dynamic-tool"',
		});
	});
});
