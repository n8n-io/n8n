import type { EngineResponse } from 'n8n-workflow';

import { buildSteps } from '@utils/agent-execution';

import type { RequestResponseMetadata } from '../types';

describe('buildSteps', () => {
	it('should return empty array when no response is provided', () => {
		const result = buildSteps(undefined, 0);

		expect(result).toEqual([]);
	});

	it('should return empty array when response has no actionResponses', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result).toEqual([]);
	});

	it('should build steps from actionResponses', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(1);
		expect(result[0].action.tool).toBe('Test_Tool');
		expect(result[0].action.toolInput).toEqual('test data');
		expect(result[0].action.toolCallId).toBe('call_123');
		expect(result[0].observation).toBe('{"result":"tool result"}');
	});

	it('should skip actionResponses with different itemIndex', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 1 }, // Different itemIndex
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(0);
	});

	it('should include previousRequests from metadata', () => {
		const previousRequest = {
			action: {
				tool: 'previous_tool',
				toolInput: { input: 'previous input' },
				log: 'previous log',
				toolCallId: 'call_previous',
				type: 'tool_call',
			},
			observation: '{"result":"previous result"}',
		};

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				itemIndex: 0,
				previousRequests: [previousRequest],
			},
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(previousRequest);
	});

	it('should combine previousRequests and new actionResponses', () => {
		const previousRequest = {
			action: {
				tool: 'previous_tool',
				toolInput: { input: 'previous input' },
				log: 'previous log',
				toolCallId: 'call_previous',
				type: 'tool_call',
			},
			observation: '{"result":"previous result"}',
		};

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: {
				itemIndex: 0,
				previousRequests: [previousRequest],
			},
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual(previousRequest);
		expect(result[1].action.tool).toBe('Test_Tool');
	});

	it('should skip duplicate tool calls based on toolCallId', () => {
		const previousRequest = {
			action: {
				tool: 'test_tool',
				toolInput: { input: 'test data', id: 'call_123' },
				log: 'log',
				toolCallId: 'call_123',
				type: 'tool_call',
			},
			observation: '{"result":"previous result"}',
		};

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123', // Same ID as previous request
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: {
				itemIndex: 0,
				previousRequests: [previousRequest],
			},
		};

		const result = buildSteps(response, 0);

		// Should only have the previous request, not the duplicate
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual(previousRequest);
	});

	it('should create synthetic AI message when building step', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [[{ json: { result: 'tool result' } }]],
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result[0].action.log).toContain('Calling Test Tool with input');
		expect(result[0].action.log).toContain('test data');
	});

	it('should handle missing tool data gracefully', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: undefined as any, // Missing input
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: undefined as any, // Missing data
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(0);
	});

	it('should handle tool result with no data', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'Test Tool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: {
							ai_tool: [null], // No tool data
						},
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = buildSteps(response, 0);

		expect(result).toHaveLength(1);
		expect(result[0].observation).toBe('""');
	});
});
