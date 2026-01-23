import type { EngineResponse } from 'n8n-workflow';

import * as agentExecution from '../buildSteps';

import type { RequestResponseMetadata } from '../types';
import { buildResponseMetadata } from '../buildResponseMetadata';

// Mock the buildSteps function from agent-execution
jest.mock('../buildSteps', () => ({
	buildSteps: jest.fn((response) => {
		// Mock implementation: return previous requests if they exist
		if (response?.actionResponses) {
			return response.actionResponses.map((ar: any) => ({
				action: {
					tool: ar.action.nodeName,
					toolInput: ar.action.input,
					log: 'mock log',
					toolCallId: ar.action.id,
					type: 'tool_call',
				},
				observation: JSON.stringify(ar.data),
			}));
		}
		return [];
	}),
}));

describe('buildIterationMetadata', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return metadata with iterationCount 1 when response is undefined', () => {
		const result = buildResponseMetadata(undefined, 0);

		expect(result).toEqual({
			previousRequests: [],
			itemIndex: 0,
			iterationCount: 1,
		});
	});

	it('should return metadata with iterationCount 1 when response has no metadata', () => {
		const response = {
			actionResponses: [],
		} as unknown as EngineResponse<RequestResponseMetadata>;

		const result = buildResponseMetadata(response, 0);

		expect(result).toEqual({
			previousRequests: [],
			itemIndex: 0,
			iterationCount: 1,
		});
	});

	it('should return metadata with iterationCount 1 when response metadata has no iterationCount', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {},
		};

		const result = buildResponseMetadata(response, 0);

		expect(result).toEqual({
			previousRequests: [],
			itemIndex: 0,
			iterationCount: 1,
		});
	});

	it('should increment iterationCount when response has existing iterationCount', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 3,
			},
		};

		const result = buildResponseMetadata(response, 0);

		expect(result).toEqual({
			previousRequests: [],
			itemIndex: 0,
			iterationCount: 4,
		});
	});

	it('should include previousRequests when response has actionResponses', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [
				{
					action: {
						id: 'call_123',
						nodeName: 'TestTool',
						input: { input: 'test data', id: 'call_123' },
						metadata: { itemIndex: 0 },
						actionType: 'ExecutionNodeAction',
						type: 'ai_tool',
					},
					data: {
						data: { ai_tool: [[{ json: { result: 'tool result' } }]] },
						executionTime: 0,
						startTime: 0,
						executionIndex: 0,
						source: [],
					},
				},
			],
			metadata: {
				iterationCount: 1,
			},
		};

		const result = buildResponseMetadata(response, 0);

		expect(result.itemIndex).toBe(0);
		expect(result.iterationCount).toBe(2);
		expect(result.previousRequests).toHaveLength(1);
		expect(result.previousRequests?.[0]).toMatchObject({
			action: {
				tool: 'TestTool',
				toolCallId: 'call_123',
				type: 'tool_call',
			},
		});
	});

	it('should handle multiple iterations correctly', () => {
		// First iteration
		const result1 = buildResponseMetadata(undefined, 0);
		expect(result1.iterationCount).toBe(1);

		// Second iteration
		const response2: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { iterationCount: 1 },
		};
		const result2 = buildResponseMetadata(response2, 0);
		expect(result2.iterationCount).toBe(2);

		// Third iteration
		const response3: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { iterationCount: 2 },
		};
		const result3 = buildResponseMetadata(response3, 0);
		expect(result3.iterationCount).toBe(3);
	});

	it('should pass correct itemIndex to buildSteps', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { iterationCount: 1 },
		};

		buildResponseMetadata(response, 5);

		expect(agentExecution.buildSteps).toHaveBeenCalledWith(response, 5);
	});

	it('should handle iterationCount starting from 0', () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: {
				iterationCount: 0,
			},
		};

		const result = buildResponseMetadata(response, 0);

		expect(result).toEqual({
			previousRequests: [],
			itemIndex: 0,
			iterationCount: 1,
		});
	});
});
