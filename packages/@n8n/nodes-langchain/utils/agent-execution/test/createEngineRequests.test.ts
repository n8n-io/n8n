import { DynamicStructuredTool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import { z } from 'zod';

import { createEngineRequests } from '../createEngineRequests';
import type { ToolCallRequest } from '../types';

describe('createEngineRequests', () => {
	const createMockTool = (
		name: string,
		metadata?: {
			sourceNodeName?: string;
			isFromToolkit?: boolean;
		},
	) => {
		return new DynamicStructuredTool({
			name,
			description: `A test tool named ${name}`,
			schema: z.object({
				input: z.string(),
			}),
			func: async () => 'result',
			metadata,
		});
	};

	describe('Basic functionality', () => {
		it('should create engine requests from tool calls', async () => {
			const tools = [
				createMockTool('calculator', { sourceNodeName: 'Calculator' }),
				createMockTool('search', { sourceNodeName: 'Search' }),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				actionType: 'ExecutionNodeAction',
				nodeName: 'Calculator',
				input: { expression: '2+2' },
				type: NodeConnectionTypes.AiTool,
				id: 'call_123',
				metadata: {
					itemIndex: 0,
				},
			});
		});

		it('should handle multiple tool calls', async () => {
			const tools = [
				createMockTool('calculator', { sourceNodeName: 'Calculator' }),
				createMockTool('search', { sourceNodeName: 'Search' }),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
				{
					tool: 'search',
					toolInput: { query: 'TypeScript' },
					toolCallId: 'call_124',
				},
			];

			const result = await createEngineRequests(toolCalls, 1, tools);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				actionType: 'ExecutionNodeAction',
				nodeName: 'Calculator',
				input: { expression: '2+2' },
				type: NodeConnectionTypes.AiTool,
				id: 'call_123',
				metadata: {
					itemIndex: 1,
				},
			});
			expect(result[1]).toEqual({
				actionType: 'ExecutionNodeAction',
				nodeName: 'Search',
				input: { query: 'TypeScript' },
				type: NodeConnectionTypes.AiTool,
				id: 'call_124',
				metadata: {
					itemIndex: 1,
				},
			});
		});

		it('should filter out tool calls for tools that are not found', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
				{
					tool: 'nonexistent',
					toolInput: { input: 'test' },
					toolCallId: 'call_124',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].nodeName).toBe('Calculator');
		});

		it('should filter out tool calls when sourceNodeName is missing', async () => {
			const tools = [
				createMockTool('calculator', { sourceNodeName: 'Calculator' }),
				createMockTool('tool_without_node', {}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
				{
					tool: 'tool_without_node',
					toolInput: { input: 'test' },
					toolCallId: 'call_124',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].nodeName).toBe('Calculator');
		});

		it('should handle empty tool calls array', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];
			const toolCalls: ToolCallRequest[] = [];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(0);
		});

		it('should handle empty tools array', async () => {
			const tools: DynamicStructuredTool[] = [];
			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(0);
		});
	});

	describe('Toolkit tools handling', () => {
		it('should include tool name in input for toolkit tools', async () => {
			const tools = [
				createMockTool('toolkit_tool', {
					sourceNodeName: 'ToolkitNode',
					isFromToolkit: true,
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'toolkit_tool',
					toolInput: { input: 'test' },
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				input: 'test',
				tool: 'toolkit_tool',
			});
		});

		it('should not include tool name in input for non-toolkit tools', async () => {
			const tools = [
				createMockTool('regular_tool', {
					sourceNodeName: 'RegularNode',
					isFromToolkit: false,
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'regular_tool',
					toolInput: { input: 'test' },
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				input: 'test',
			});
		});

		it('should handle mixed toolkit and regular tools', async () => {
			const tools = [
				createMockTool('toolkit_tool', {
					sourceNodeName: 'ToolkitNode',
					isFromToolkit: true,
				}),
				createMockTool('regular_tool', {
					sourceNodeName: 'RegularNode',
					isFromToolkit: false,
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'toolkit_tool',
					toolInput: { input: 'toolkit test' },
					toolCallId: 'call_123',
				},
				{
					tool: 'regular_tool',
					toolInput: { input: 'regular test' },
					toolCallId: 'call_124',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(2);
			expect(result[0].input).toEqual({
				input: 'toolkit test',
				tool: 'toolkit_tool',
			});
			expect(result[1].input).toEqual({
				input: 'regular test',
			});
		});
	});

	describe('Item index handling', () => {
		it('should correctly set itemIndex in metadata', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 5, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.itemIndex).toBe(5);
		});
	});

	describe('Complex tool inputs', () => {
		it('should handle complex nested objects in tool input', async () => {
			const tools = [createMockTool('complex_tool', { sourceNodeName: 'ComplexNode' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'complex_tool',
					toolInput: {
						nested: {
							level1: {
								level2: 'value',
							},
						},
						array: [1, 2, 3],
						string: 'test',
					},
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				nested: {
					level1: {
						level2: 'value',
					},
				},
				array: [1, 2, 3],
				string: 'test',
			});
		});

		it('should preserve all properties in toolInput', async () => {
			const tools = [createMockTool('tool', { sourceNodeName: 'Node' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'tool',
					toolInput: {
						param1: 'value1',
						param2: 42,
						param3: true,
						param4: null,
						param5: undefined,
					},
					toolCallId: 'call_123',
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				param1: 'value1',
				param2: 42,
				param3: true,
				param4: null,
				param5: undefined,
			});
		});
	});

	describe('Anthropic thinking blocks extraction', () => {
		it('should extract thinking content from Anthropic message with thinking blocks', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					messageLog: [
						{
							content: [
								{
									type: 'thinking',
									thinking: 'I need to calculate 2+2 using the calculator tool.',
									signature: 'test_signature_123',
								},
								{
									type: 'tool_use',
									id: 'call_123',
									name: 'calculator',
									input: { expression: '2+2' },
								},
							],
						},
					],
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.anthropic?.thinkingContent).toBe(
				'I need to calculate 2+2 using the calculator tool.',
			);
			expect(result[0].metadata.anthropic?.thinkingType).toBe('thinking');
			expect(result[0].metadata.anthropic?.thinkingSignature).toBe('test_signature_123');
		});

		it('should extract redacted_thinking content from Anthropic message', async () => {
			const tools = [createMockTool('search', { sourceNodeName: 'Search' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'search',
					toolInput: { query: 'sensitive search' },
					toolCallId: 'call_456',
					messageLog: [
						{
							content: [
								{
									type: 'redacted_thinking',
									data: 'This thinking was redacted by safety systems.',
								},
								{
									type: 'tool_use',
									id: 'call_456',
									name: 'search',
									input: { query: 'sensitive search' },
								},
							],
						},
					],
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.anthropic?.thinkingContent).toBe(
				'This thinking was redacted by safety systems.',
			);
			expect(result[0].metadata.anthropic?.thinkingType).toBe('redacted_thinking');
		});

		it('should not extract thinking when content is string format', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					messageLog: [
						{
							content: 'Simple string content',
						},
					],
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.anthropic).toBeUndefined();
		});

		it('should not extract thinking when no thinking blocks present', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					messageLog: [
						{
							content: [
								{
									type: 'text',
									text: 'Just some text',
								},
								{
									type: 'tool_use',
									id: 'call_123',
									name: 'calculator',
									input: { expression: '2+2' },
								},
							],
						},
					],
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.anthropic).toBeUndefined();
		});

		it('should work with both Gemini thoughtSignature and Anthropic thinking blocks', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					messageLog: [
						{
							content: [
								{
									type: 'thinking',
									thinking: 'Anthropic thinking content',
									signature: 'anthropic_sig_456',
								},
								{
									thoughtSignature: 'Gemini thought signature',
								},
							],
						},
					],
				},
			];

			const result = await createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google?.thoughtSignature).toBe('Gemini thought signature');
			expect(result[0].metadata.anthropic?.thinkingContent).toBe('Anthropic thinking content');
			expect(result[0].metadata.anthropic?.thinkingType).toBe('thinking');
			expect(result[0].metadata.anthropic?.thinkingSignature).toBe('anthropic_sig_456');
		});
	});
});
