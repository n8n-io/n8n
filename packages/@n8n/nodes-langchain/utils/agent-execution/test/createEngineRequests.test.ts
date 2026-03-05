import { DynamicStructuredTool } from '@langchain/classic/tools';
import { NodeConnectionTypes } from 'n8n-workflow';
import { z } from 'zod';

import { createEngineRequests } from '../createEngineRequests';
import type { ToolCallRequest, ToolMetadata } from '../types';

describe('createEngineRequests', () => {
	const createMockTool = (name: string, metadata?: ToolMetadata) => {
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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 1, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].nodeName).toBe('Calculator');
		});

		it('should handle empty tool calls array', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];
			const toolCalls: ToolCallRequest[] = [];

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 5, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

	describe('HITL (Human-in-the-Loop) tools handling', () => {
		it('should extract HITL metadata when gatedToolNodeName is present', async () => {
			const tools = [
				createMockTool('gated_tool', {
					sourceNodeName: 'ToolNode',
					gatedToolNodeName: 'HITLNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_tool',
					toolInput: {
						toolParameters: {
							param1: 'value1',
							param2: 'value2',
						},
						hitlParameters: {
							hitlParam1: 'hitlValue1',
						},
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.hitl).toEqual({
				gatedToolNodeName: 'HITLNode',
				toolName: 'gated_tool',
				originalInput: {
					param1: 'value1',
					param2: 'value2',
				},
			});
		});

		it('should merge hitlParameters into input when HITL metadata is present', async () => {
			const tools = [
				createMockTool('gated_tool', {
					sourceNodeName: 'ToolNode',
					gatedToolNodeName: 'HITLNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_tool',
					toolInput: {
						toolParameters: {
							param1: 'value1',
						},
						hitlParameters: {
							hitlParam1: 'hitlValue1',
							hitlParam2: 'hitlValue2',
						},
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				toolParameters: { param1: 'value1' },
				hitlParam1: 'hitlValue1',
				hitlParam2: 'hitlValue2',
			});
		});

		it('should not extract HITL metadata when gatedToolNodeName is not present', async () => {
			const tools = [
				createMockTool('regular_tool', {
					sourceNodeName: 'ToolNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'regular_tool',
					toolInput: {
						param1: 'value1',
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.hitl).toBeUndefined();
			expect(result[0].input).toEqual({
				param1: 'value1',
			});
		});

		it('should handle HITL tool with toolkit flag', async () => {
			const tools = [
				createMockTool('gated_toolkit_tool', {
					sourceNodeName: 'ToolkitNode',
					gatedToolNodeName: 'HITLNode',
					isFromToolkit: true,
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_toolkit_tool',
					toolInput: {
						toolParameters: {
							param1: 'value1',
						},
						hitlParameters: {
							hitlParam1: 'hitlValue1',
						},
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].input).toEqual({
				toolParameters: { param1: 'value1' },
				tool: 'gated_toolkit_tool',
				hitlParam1: 'hitlValue1',
			});
			expect(result[0].metadata.hitl).toEqual({
				gatedToolNodeName: 'HITLNode',
				toolName: 'gated_toolkit_tool',
				originalInput: {
					param1: 'value1',
				},
			});
		});

		it('should handle HITL tool without hitlParameters', async () => {
			const tools = [
				createMockTool('gated_tool', {
					sourceNodeName: 'ToolNode',
					gatedToolNodeName: 'HITLNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_tool',
					toolInput: {
						toolParameters: {
							param1: 'value1',
						},
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.hitl).toEqual({
				gatedToolNodeName: 'HITLNode',
				toolName: 'gated_tool',
				originalInput: {
					param1: 'value1',
				},
			});
			// Input should remain the same when hitlParameters is missing
			expect(result[0].input).toEqual({
				toolParameters: { param1: 'value1' },
			});
		});

		it('should handle multiple tool calls with mixed HITL and non-HITL tools', async () => {
			const tools = [
				createMockTool('gated_tool', {
					sourceNodeName: 'GatedNode',
					gatedToolNodeName: 'HITLNode',
				}),
				createMockTool('regular_tool', {
					sourceNodeName: 'RegularNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_tool',
					toolInput: {
						toolParameters: { param1: 'value1' },
						hitlParameters: { hitlParam1: 'hitlValue1' },
					},
					toolCallId: 'call_123',
				},
				{
					tool: 'regular_tool',
					toolInput: { param2: 'value2' },
					toolCallId: 'call_124',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(2);
			expect(result[0].metadata.hitl).toBeDefined();
			expect(result[0].metadata.hitl?.gatedToolNodeName).toBe('HITLNode');
			expect(result[1].metadata.hitl).toBeUndefined();
		});

		it('should preserve originalInput structure in HITL metadata', async () => {
			const tools = [
				createMockTool('gated_tool', {
					sourceNodeName: 'ToolNode',
					gatedToolNodeName: 'HITLNode',
				}),
			];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'gated_tool',
					toolInput: {
						toolParameters: {
							nested: {
								level1: {
									level2: 'value',
								},
							},
							array: [1, 2, 3],
							string: 'test',
						},
						hitlParameters: {
							hitlNested: { data: 'hitlData' },
						},
					},
					toolCallId: 'call_123',
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.hitl?.originalInput).toEqual({
				nested: {
					level1: {
						level2: 'value',
					},
				},
				array: [1, 2, 3],
				string: 'test',
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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

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

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google?.thoughtSignature).toBe('Gemini thought signature');
			expect(result[0].metadata.anthropic?.thinkingContent).toBe('Anthropic thinking content');
			expect(result[0].metadata.anthropic?.thinkingType).toBe('thinking');
			expect(result[0].metadata.anthropic?.thinkingSignature).toBe('anthropic_sig_456');
		});
	});

	describe('Gemini thought_signature from additionalKwargs', () => {
		it('should extract thought_signature from additionalKwargs on toolCall', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					additionalKwargs: {
						__gemini_function_call_thought_signatures__: {
							call_123: 'gemini_signature_from_kwargs',
						},
					},
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google?.thoughtSignature).toBe('gemini_signature_from_kwargs');
		});

		it('should extract thought_signature from message additional_kwargs', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_456',
					messageLog: [
						{
							content: 'Some content',
							additional_kwargs: {
								__gemini_function_call_thought_signatures__: {
									call_456: 'gemini_signature_from_message_kwargs',
								},
							},
						},
					],
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google?.thoughtSignature).toBe(
				'gemini_signature_from_message_kwargs',
			);
		});

		it('should prefer additionalKwargs over content block thoughtSignature', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					additionalKwargs: {
						__gemini_function_call_thought_signatures__: {
							call_123: 'signature_from_kwargs',
						},
					},
					messageLog: [
						{
							content: [
								{
									thoughtSignature: 'signature_from_content_block',
								},
							],
						},
					],
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			// Should prefer additionalKwargs over content block
			expect(result[0].metadata.google?.thoughtSignature).toBe('signature_from_kwargs');
		});

		it('should fallback to any available signature for parallel tool calls', async () => {
			// For parallel tool calls, Gemini only provides thought_signature on the first call.
			// When a different call_id is in the map, we should still use that signature
			// because all parallel calls need the same signature.
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					additionalKwargs: {
						__gemini_function_call_thought_signatures__: {
							different_call_id: 'some_signature',
						},
					},
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			// Should use the available signature even though call ID doesn't match
			// This supports parallel tool calls where only first call has the signature
			expect(result[0].metadata.google?.thoughtSignature).toBe('some_signature');
		});

		it('should handle truly missing thought_signature gracefully', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					additionalKwargs: {
						__gemini_function_call_thought_signatures__: {},
					},
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google).toBeUndefined();
		});
	});

	describe('Parallel tool calls signature sharing', () => {
		it('should share messageLog from first tool call to subsequent calls', async () => {
			const tools = [
				createMockTool('calculator', { sourceNodeName: 'Calculator' }),
				createMockTool('weather', { sourceNodeName: 'Weather' }),
			];

			// Simulates LangChain behavior where only first tool call has messageLog
			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_1',
					messageLog: [
						{
							content: [{ type: 'text', text: 'thinking...' }],
							additional_kwargs: {
								signatures: ['', 'shared_signature'],
							},
						},
					],
				},
				{
					tool: 'weather',
					toolInput: { location: 'NYC' },
					toolCallId: 'call_2',
					messageLog: [], // Empty messageLog on second call
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(2);
			// Both should get the signature from the shared messageLog
			expect(result[0].metadata.google?.thoughtSignature).toBe('shared_signature');
			expect(result[1].metadata.google?.thoughtSignature).toBe('shared_signature');
		});

		it('should share additionalKwargs from first tool call to subsequent calls', async () => {
			const tools = [
				createMockTool('calculator', { sourceNodeName: 'Calculator' }),
				createMockTool('weather', { sourceNodeName: 'Weather' }),
			];

			// Simulates case where additionalKwargs is only on first call
			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_1',
					additionalKwargs: {
						signatures: ['', 'shared_sig_from_kwargs'],
					},
				},
				{
					tool: 'weather',
					toolInput: { location: 'NYC' },
					toolCallId: 'call_2',
					// No additionalKwargs on second call
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(2);
			// Both should get the signature from the shared additionalKwargs
			expect(result[0].metadata.google?.thoughtSignature).toBe('shared_sig_from_kwargs');
			expect(result[1].metadata.google?.thoughtSignature).toBe('shared_sig_from_kwargs');
		});

		it('should extract signature from signatures array format', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_1',
					additionalKwargs: {
						signatures: ['first_signature', 'second_signature'],
					},
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			// Should get the first non-empty signature
			expect(result[0].metadata.google?.thoughtSignature).toBe('first_signature');
		});

		it('should skip empty strings when finding signature in array', async () => {
			const tools = [createMockTool('calculator', { sourceNodeName: 'Calculator' })];

			const toolCalls: ToolCallRequest[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_1',
					additionalKwargs: {
						signatures: ['', '', 'actual_signature'],
					},
				},
			];

			const result = createEngineRequests(toolCalls, 0, tools);

			expect(result).toHaveLength(1);
			expect(result[0].metadata.google?.thoughtSignature).toBe('actual_signature');
		});
	});
});
