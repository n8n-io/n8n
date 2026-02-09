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
								input: '2+2',
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
					toolInput: { input: '2+2' },
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
								input: '2+2',
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
								input: 'TypeScript',
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
								input: '2+2',
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
								input: 'TypeScript',
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

	describe('Tool name resolution', () => {
		it('should use HITL toolName when HITL metadata is present', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'HITL Node',
							input: {
								id: 'call_123',
								input: { query: 'test' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								hitl: {
									toolName: 'custom_search_tool',
									gatedToolNodeName: 'Search API',
									originalInput: { query: 'test' },
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { results: ['result1'] } }]],
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
			// Should use the toolName from HITL metadata
			expect(result[0].action.tool).toBe('custom_search_tool');
		});

		it('should convert nodeName to toolName when HITL metadata is not present', () => {
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
			// Should convert node name using nodeNameToToolName
			expect(result[0].action.tool).toBe('Calculator_Node');
		});

		it('should use HITL toolName in message content', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'HITL Node',
							input: {
								id: 'call_123',
								input: { query: 'test' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								hitl: {
									toolName: 'custom_tool',
									gatedToolNodeName: 'Custom Tool',
									originalInput: { query: 'test' },
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: 'success' } }]],
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
			// Message content should use the HITL toolName
			expect(message.content).toContain('Calling custom_tool');
			expect(message.content).not.toContain('HITL Node');
			// Tool call should also use the HITL toolName
			expect(message.tool_calls?.[0].name).toBe('custom_tool');
		});

		it('should use converted nodeName in message content when HITL metadata is absent', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'My Custom Node',
							input: {
								id: 'call_123',
								input: { data: 'test' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: 'success' } }]],
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
			// Message content should use the converted tool name
			expect(message.content).toContain('Calling My_Custom_Node');
			expect(message.tool_calls?.[0].name).toBe('My_Custom_Node');
		});

		it('should handle HITL toolName in Anthropic thinking blocks', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'HITL Node',
							input: {
								id: 'call_123',
								input: { query: 'test' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
								hitl: {
									toolName: 'hitl_tool',
									gatedToolNodeName: 'Gated Tool',
									originalInput: { query: 'test' },
								},
								anthropic: {
									thinkingContent: 'I will use the HITL tool',
									thinkingType: 'thinking',
									thinkingSignature: 'sig_123',
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: 'approved' } }]],
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
			const content = message.content;
			// Content should be an array with thinking and tool_use blocks
			expect(Array.isArray(content)).toBe(true);
			expect(content).toHaveLength(2);
			// Tool use block should use the HITL toolName
			expect(content[1]).toMatchObject({
				type: 'tool_use',
				id: 'call_123',
				name: 'hitl_tool',
			});
		});
	});

	describe('Tool input extraction', () => {
		it('should extract toolInput as object with string input property', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_123',
								input: '5*343',
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_123',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { response: '1715' } }]],
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
			// toolInput is always an object for type consistency with LangChain ToolCall
			expect(result[0].action.toolInput).toEqual({ input: '5*343' });
		});

		it('should extract toolInput with multiple arguments (new format)', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'save_result',
							input: {
								id: 'call_456',
								result: 1715,
								equation: '5*343',
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_456',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { equation: '5*343', result: 1715 } }]],
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
			expect(result[0].action.toolInput).toEqual({
				result: 1715,
				equation: '5*343',
			});
			// Should not include id, which is metadata
			expect(result[0].action.toolInput).not.toHaveProperty('id');
		});

		it('should exclude metadata fields (id, log, type) from toolInput', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'custom_tool',
							input: {
								id: 'call_789',
								log: 'Custom log message',
								type: 'tool_call',
								arg1: 'value1',
								arg2: 'value2',
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_789',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { success: true } }]],
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
			expect(result[0].action.toolInput).toEqual({
				arg1: 'value1',
				arg2: 'value2',
			});
			// Metadata fields should be excluded from toolInput
			expect(result[0].action.toolInput).not.toHaveProperty('id');
			expect(result[0].action.toolInput).not.toHaveProperty('log');
			expect(result[0].action.toolInput).not.toHaveProperty('type');
		});

		it('should handle tools with non-string input property as full object', () => {
			// When input property exists but is not a string (e.g., object), extract all properties
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'hybrid_tool',
							input: {
								id: 'call_mixed',
								input: { expression: '2+2' },
								extra: 'should be included',
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_mixed',
							metadata: {
								itemIndex: 0,
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { result: 4 } }]],
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
			// Should extract all properties except metadata (id, log, type)
			expect(result[0].action.toolInput).toEqual({
				input: { expression: '2+2' },
				extra: 'should be included',
			});
			expect(result[0].action.toolInput).not.toHaveProperty('id');
		});
	});

	describe('Gemini thought_signature in additional_kwargs', () => {
		it('should include thought_signature in AIMessage additional_kwargs', () => {
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
									thoughtSignature: 'gemini_thought_sig_abc123',
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
			// Verify additional_kwargs contains the thought signature
			expect(message.additional_kwargs).toBeDefined();
			expect(message.additional_kwargs.__gemini_function_call_thought_signatures__).toEqual({
				call_123: 'gemini_thought_sig_abc123',
			});
		});

		it('should group parallel tool calls into shared AIMessage with Gemini signature', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_1',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_1',
							metadata: {
								itemIndex: 0,
								google: {
									thoughtSignature: 'shared_gemini_sig',
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
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Weather',
							input: {
								id: 'call_2',
								input: { location: 'NYC' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_2',
							metadata: {
								itemIndex: 0,
								google: {
									thoughtSignature: 'shared_gemini_sig',
								},
							},
						},
						data: {
							data: {
								ai_tool: [[{ json: { temp: '72F' } }]],
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

			// First step should have the shared AIMessage with ALL tool calls
			const firstMessage = result[0].action.messageLog![0];
			expect(firstMessage).toBeDefined();
			expect(firstMessage.tool_calls).toHaveLength(2);
			expect(firstMessage.tool_calls![0].name).toBe('Calculator');
			expect(firstMessage.tool_calls![1].name).toBe('Weather');

			// Signature should only be on the first tool call in the map
			const sigMap = firstMessage.additional_kwargs
				.__gemini_function_call_thought_signatures__ as Record<string, string>;
			expect(sigMap).toEqual({ call_1: 'shared_gemini_sig' });

			// Signatures array should have: ['', 'sig', ''] (text part, first func call, second func call)
			const sigArray = firstMessage.additional_kwargs.signatures as string[];
			expect(sigArray).toEqual(['', 'shared_gemini_sig', '']);

			// Second step should have EMPTY messageLog (no duplicate AIMessage)
			expect(result[1].action.messageLog).toEqual([]);

			// Both steps should have correct observations
			expect(result[0].observation).toBe(JSON.stringify([{ result: '4' }]));
			expect(result[1].observation).toBe(JSON.stringify([{ temp: '72F' }]));
		});

		it('should NOT group parallel tool calls without Gemini signature', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					{
						action: {
							actionType: 'ExecutionNodeAction',
							nodeName: 'Calculator',
							input: {
								id: 'call_1',
								input: { expression: '2+2' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_1',
							metadata: { itemIndex: 0 },
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
							nodeName: 'Weather',
							input: {
								id: 'call_2',
								input: { location: 'NYC' },
							},
							type: NodeConnectionTypes.AiTool,
							id: 'call_2',
							metadata: { itemIndex: 0 },
						},
						data: {
							data: {
								ai_tool: [[{ json: { temp: '72F' } }]],
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

			// Without Gemini signature, each step should have its own AIMessage
			expect(result[0].action.messageLog).toHaveLength(1);
			expect(result[0].action.messageLog![0].tool_calls).toHaveLength(1);
			expect(result[1].action.messageLog).toHaveLength(1);
			expect(result[1].action.messageLog![0].tool_calls).toHaveLength(1);
		});

		it('should not include additional_kwargs when no thought_signature present', () => {
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
			const message = result[0].action.messageLog![0];
			// Should not have __gemini_function_call_thought_signatures__ when no signature
			expect(
				message.additional_kwargs?.__gemini_function_call_thought_signatures__,
			).toBeUndefined();
		});
	});
});
