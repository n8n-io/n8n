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
});
