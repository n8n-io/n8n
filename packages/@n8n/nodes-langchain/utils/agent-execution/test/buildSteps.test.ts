import type { EngineResponse } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { buildSteps } from '../buildSteps';
import type { RequestResponseMetadata } from '../types';

describe('buildSteps', () => {
	const itemIndex = 0;

	describe('Basic functionality', () => {
		it('should return empty array when response is undefined', () => {
			const result = buildSteps(undefined, itemIndex);

			expect(result).toEqual([]);
		});

		it('should build steps from engine response', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				action: {
					tool: 'Calculator',
					toolInput: { expression: '2+2' },
					toolCallId: 'call_123',
					type: 'tool_call',
				},
				observation: JSON.stringify([{ result: '4' }]),
			});
		});

		it('should handle multiple tool responses', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Search',
							input: {
								id: 'call_124',
								input: { query: 'TypeScript' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_124',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { results: ['result1', 'result2'] } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(2);
			expect(result[0].action.tool).toBe('Calculator');
			expect(result[1].action.tool).toBe('Search');
		});

		it('should filter out responses for different item indexes', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Search',
							input: {
								id: 'call_124',
								input: { query: 'TypeScript' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_124',
							metadata: {
								itemIndex: 1, // Different item index
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { results: ['result1', 'result2'] } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, 0);

			expect(result).toHaveLength(1);
			expect(result[0].action.tool).toBe('Calculator');
		});

		it('should handle responses with minimal toolInput', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								// Missing input property - will result in empty toolInput
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			// Even with minimal input, a step is created with empty toolInput
			expect(result).toHaveLength(1);
			expect(result[0].action.toolInput).toEqual({});
		});

		describe('Previous requests handling', () => {
			it('should include previous requests from metadata', () => {
				const previousRequests = [
					{
						action: {
							tool: 'previous_tool',
							toolInput: { input: 'previous' },
							log: 'Previous log',
							toolCallId: 'call_prev',
							type: 'tool_call',
						},
						observation: 'previous result',
					},
				];

				const response: EngineResponse<RequestResponseMetadata> = {
					actionResponses: [
						{
							action: {
								actionType: 'ExecutionNodeAction',
								nodeName: 'Calculator',
								input: {
									id: 'call_123',
									input: { expression: '2+2' },
								},
								type: NodeConnectionTypes.AiTool,
								id: 'call_123',
								metadata: {
									itemIndex: 0,
								},
							},
							data: {
								data: {
									ai_tool: [[{ json: { result: '4' } }]],
								},
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
							},
						},
					],
					metadata: {
						previousRequests,
					},
				};

				const result = buildSteps(response, itemIndex);

				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(previousRequests[0]);
				expect(result[1].action.tool).toBe('Calculator');
			});

			it('should not duplicate steps that already exist in previousRequests', () => {
				const previousRequests = [
					{
						action: {
							tool: 'calculator',
							toolInput: { expression: '2+2' },
							log: 'Previous log',
							toolCallId: 'call_123',
							type: 'tool_call',
						},
						observation: '4',
					},
				];

				const response: EngineResponse<RequestResponseMetadata> = {
					actionResponses: [
						{
							action: {
								actionType: 'ExecutionNodeAction',
								nodeName: 'Calculator',
								input: {
									id: 'call_123', // Same ID as in previousRequests
									input: { expression: '2+2' },
								},
								type: NodeConnectionTypes.AiTool,
								id: 'call_123',
								metadata: {
									itemIndex: 0,
								},
							},
							data: {
								data: {
									ai_tool: [[{ json: { result: '4' } }]],
								},
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
							},
						},
					],
					metadata: {
						previousRequests,
					},
				};

				const result = buildSteps(response, itemIndex);

				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(previousRequests[0]);
			});
		});

		describe('Synthetic AI message creation', () => {
			it('should create synthetic AI message with tool calls', () => {
				const response: EngineResponse<RequestResponseMetadata> = {
					actionResponses: [
						{
							action: {
								actionType: 'ExecutionNodeAction',
								nodeName: 'Calculator Node',
								input: {
									id: 'call_123',
									input: { expression: '2+2' },
								},
								type: NodeConnectionTypes.AiTool,
								id: 'call_123',
								metadata: {
									itemIndex: 0,
								},
							},
							data: {
								data: {
									ai_tool: [[{ json: { result: '4' } }]],
								},
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
							},
						},
					],
					metadata: {},
				};

				const result = buildSteps(response, itemIndex);

				expect(result).toHaveLength(1);
				expect(result[0].action.messageLog).toBeDefined();
				expect(result[0].action.messageLog).toHaveLength(1);

				const message = result[0].action.messageLog![0];
				expect(message).toHaveProperty('tool_calls');
				expect(message.tool_calls).toHaveLength(1);
				expect(message.tool_calls?.[0]).toMatchObject({
					id: 'call_123',
					name: 'Calculator_Node',
					type: 'tool_call',
				});
			});

			it('should use custom log if provided', () => {
				const response: EngineResponse<RequestResponseMetadata> = {
					actionResponses: [
						{
							action: {
								actionType: 'ExecutionNodeAction',
								nodeName: 'Calculator',
								input: {
									id: 'call_123',
									input: { expression: '2+2' },
									log: 'Custom log message',
								},
								type: NodeConnectionTypes.AiTool,
								id: 'call_123',
								metadata: {
									itemIndex: 0,
								},
							},
							data: {
								data: {
									ai_tool: [[{ json: { result: '4' } }]],
								},
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
							},
						},
					],
					metadata: {},
				};

				const result = buildSteps(response, itemIndex);

				expect(result).toHaveLength(1);
				expect(result[0].action.log).toBe('Custom log message');
			});

			it('should use custom type if provided', () => {
				const response: EngineResponse<RequestResponseMetadata> = {
					actionResponses: [
						{
							action: {
								actionType: 'ExecutionNodeAction',
								nodeName: 'Calculator',
								input: {
									id: 'call_123',
									input: { expression: '2+2' },
									type: 'custom_type',
								},
								type: NodeConnectionTypes.AiTool,
								id: 'call_123',
								metadata: {
									itemIndex: 0,
								},
							},
							data: {
								data: {
									ai_tool: [[{ json: { result: '4' } }]],
								},
								executionTime: 0,
								startTime: 0,
								executionIndex: 0,
								source: [],
							},
						},
					],
					metadata: {},
				};

				const result = buildSteps(response, itemIndex);

				expect(result).toHaveLength(1);
				expect(result[0].action.type).toBe('custom_type');
			});
		});
	});

	describe('Error handling', () => {
		it('should handle tool responses with error data structure', () => {
			// When a tool fails, the data structure contains error information
			// instead of the normal ai_tool data structure
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Call n8n Workflow Tool',
							input: {
								id: 'call_123',
								input: { test: {} },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							// Error data structure - no ai_tool property
							error: {
								message: 'Workflow execution failed',
								name: 'NodeOperationError',
							} as any, // Cast to satisfy ExecutionError type
							executionStatus: 'error',
							executionTime: 100,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			// Should still produce a step with error information in the observation
			expect(result).toHaveLength(1);
			expect(result[0].observation).toContain('error');
			expect(result[0].observation).not.toBe('""');
		});

		it('should handle tool responses with executionError passed directly', () => {
			// This simulates when WorkflowToolService passes ExecutionError directly
			// to addOutputData instead of wrapping it in the expected format
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Call n8n Workflow Tool',
							input: {
								id: 'call_456',
								input: { query: 'test' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_456',
							metadata: {
								itemIndex: 0,
							},
						},
						// When error is passed, data might have different structure
						data: {
							data: {
								// ai_tool might be missing or empty when there's an error
							},
							error: {
								message: 'Sub-workflow execution failed',
								name: 'NodeOperationError',
							} as any, // Cast to satisfy ExecutionError type
							executionStatus: 'error',
							executionTime: 50,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			// Should handle missing ai_tool gracefully and include error info
			expect(result).toHaveLength(1);
			// The observation should contain meaningful error information, not just empty string
			expect(result[0].observation).not.toBe('""');
		});

		it('should preserve error information when building observation from error response', () => {
			const errorMessage = 'Received tool input did not match expected schema';
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Call n8n Workflow Tool',
							input: {
								id: 'call_789',
								input: { test: 'invalid' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_789',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {},
							error: {
								message: errorMessage,
								name: 'ToolInputParsingException',
							} as any, // Cast to satisfy ExecutionError type
							executionStatus: 'error',
							executionTime: 10,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			// The observation should include the error message so the agent knows what went wrong
			expect(result[0].observation).toContain(errorMessage);
		});

		it('should handle error responses with ai_tool containing error wrapper', () => {
			// When WorkflowToolService correctly wraps error in INodeExecutionData format
			const errorMessage = 'Workflow execution failed';
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Call n8n Workflow Tool',
							input: {
								id: 'call_error',
								input: { test: {} },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_error',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { error: `There was an error: "${errorMessage}"` } }]],
							},
							executionStatus: 'error',
							executionTime: 100,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			// This test passes when error is properly wrapped - validates the expected format
			expect(result[0].observation).toContain(errorMessage);
		});
	});

	describe('Observation formatting', () => {
		it('should stringify tool result data correctly', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [
									[
										{ json: { result: '4', status: 'success' } },
										{ json: { metadata: { timestamp: 123456789 } } },
									],
								],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0].observation).toBe(
				JSON.stringify([
					{ result: '4', status: 'success' },
					{ metadata: { timestamp: 123456789 } },
				]),
			);
		});

		it('should handle empty ai_tool data', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0].observation).toBe('""');
		});
	});

	describe('Anthropic thinking blocks reconstruction', () => {
		it('should reconstruct AIMessage with thinking content blocks', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								anthropic: {
									thinkingContent: 'I need to calculate 2+2 using the calculator tool.',
									thinkingType: 'thinking',
									thinkingSignature: 'test_signature_123',
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0].action.messageLog).toBeDefined();
			expect(result[0].action.messageLog).toHaveLength(1);

			const message = result[0].action.messageLog![0];
			const content = message.content;
			expect(Array.isArray(content)).toBe(true);
			expect(content).toHaveLength(2);
			// First block should be thinking
			expect(content[0]).toEqual({
				type: 'thinking',
				thinking: 'I need to calculate 2+2 using the calculator tool.',
				signature: 'test_signature_123',
			});
			// Second block should be tool_use
			expect(content[1]).toMatchObject({
				type: 'tool_use',
				id: 'call_123',
				name: 'Calculator',
			});
		});

		it('should reconstruct AIMessage with redacted_thinking content blocks', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Search',
							input: {
								id: 'call_456',
								input: { query: 'sensitive search' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_456',
							metadata: {
								itemIndex: 0,
								anthropic: {
									thinkingContent: 'This thinking was redacted by safety systems.',
									thinkingType: 'redacted_thinking',
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { results: [] } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0].action.messageLog).toBeDefined();
			expect(result[0].action.messageLog).toHaveLength(1);

			const message = result[0].action.messageLog![0];
			const content = message.content;
			expect(Array.isArray(content)).toBe(true);
			expect(content).toHaveLength(2);
			// First block should be redacted_thinking
			expect(content[0]).toEqual({
				type: 'redacted_thinking',
				data: 'This thinking was redacted by safety systems.',
			});
			// Second block should be tool_use
			expect(content[1]).toMatchObject({
				type: 'tool_use',
				id: 'call_456',
				name: 'Search',
			});
		});

		it('should use string content when no thinking blocks present', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								// No thinking blocks
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			expect(result[0].action.messageLog).toBeDefined();
			expect(result[0].action.messageLog).toHaveLength(1);

			const message = result[0].action.messageLog![0];
			expect(typeof message.content).toBe('string');
			expect(message.content).toContain('Calling Calculator');
			expect(message).toHaveProperty('tool_calls');
		});

		it('should handle thinking content without thinkingType', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								anthropic: {
									thinkingContent: 'Some thinking content',
									// Missing thinkingType
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			const message = result[0].action.messageLog![0];
			// Should fall back to string content when thinkingType is missing
			expect(typeof message.content).toBe('string');
		});

		it('should work alongside Gemini thought_signature', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								google: {
									thoughtSignature: 'Gemini thought signature',
								},
								anthropic: {
									thinkingContent: 'Anthropic thinking content',
									thinkingType: 'thinking',
									thinkingSignature: 'anthropic_sig_456',
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: '4' } }]],
							},
							executionTime: 0,
							startTime: 0,
							executionIndex: 0,
							source: [],
						},
					},
				],
				metadata: {},
			};

			const result = buildSteps(response, itemIndex);

			expect(result).toHaveLength(1);
			const message = result[0].action.messageLog![0];
			// Should use Anthropic thinking blocks in content
			const content = message.content;
			expect(Array.isArray(content)).toBe(true);
			expect(content).toHaveLength(2);
			// First block should be thinking
			expect(content[0]).toEqual({
				type: 'thinking',
				thinking: 'Anthropic thinking content',
				signature: 'anthropic_sig_456',
			});
			// Second block should be tool_use
			expect(content[1]).toMatchObject({
				type: 'tool_use',
				id: 'call_123',
				name: 'Calculator',
			});
			// When thinking blocks are present, tool_calls is not used (everything is in content array)
			// Note: Anthropic thinking and Gemini thought_signature are mutually exclusive
		});
	});
});
