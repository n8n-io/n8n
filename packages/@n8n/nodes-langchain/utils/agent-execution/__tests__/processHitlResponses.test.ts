import { NodeConnectionTypes } from 'n8n-workflow';
import type { EngineResponse, ExecuteNodeResult, IDataObject, ITaskData } from 'n8n-workflow';

import { processHitlResponses } from '../processHitlResponses';
import type { HitlMetadata, RequestResponseMetadata } from '../types';

const createMockTaskData = (json: IDataObject): ITaskData => ({
	executionTime: 0,
	startTime: Date.now(),
	executionIndex: 0,
	source: [],
	data: {
		ai_tool: [[{ json }]],
	},
});

const createHitlActionResponse = (
	approved: boolean,
	hitlMetadata: HitlMetadata,
	actionId = 'action-1',
): ExecuteNodeResult<RequestResponseMetadata> => ({
	action: {
		actionType: 'ExecutionNodeAction',
		nodeName: 'HITL Node',
		input: {},
		type: NodeConnectionTypes.AiTool,
		id: actionId,
		metadata: { hitl: hitlMetadata },
	},
	data: createMockTaskData({ approved }),
});

const createNonHitlActionResponse = (
	actionId = 'action-2',
): ExecuteNodeResult<RequestResponseMetadata> => ({
	action: {
		actionType: 'ExecutionNodeAction',
		nodeName: 'Regular Tool',
		input: {},
		type: NodeConnectionTypes.AiTool,
		id: actionId,
		metadata: {},
	},
	data: createMockTaskData({ result: 'success' }),
});

describe('processHitlResponses', () => {
	const hitlMetadata = {
		gatedToolNodeName: 'Gated Tool Node',
		toolName: 'my_tool',
		originalInput: { query: 'test' },
	};

	describe('empty/undefined responses', () => {
		it('returns empty result for undefined response', () => {
			const result = processHitlResponses(undefined, 0);

			expect(result.hasApprovedHitlTools).toBe(false);
			expect(result.pendingGatedToolRequest).toBeUndefined();
			expect(result.processedResponse.actionResponses).toEqual([]);
		});

		it('returns empty result for response with no action responses', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(false);
			expect(result.pendingGatedToolRequest).toBeUndefined();
		});
	});

	describe('non-HITL responses', () => {
		it('passes through unchanged', () => {
			const actionResponse = createNonHitlActionResponse();
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [actionResponse],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(false);
			expect(result.processedResponse.actionResponses).toHaveLength(1);
			expect(result.processedResponse.actionResponses[0]).toEqual(actionResponse);
		});
	});

	describe('approved HITL responses', () => {
		it('creates pending gated tool request', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [createHitlActionResponse(true, hitlMetadata)],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(true);
			expect(result.pendingGatedToolRequest).toBeDefined();
			expect(result.pendingGatedToolRequest?.actions).toHaveLength(1);

			const action = result.pendingGatedToolRequest!.actions[0];
			expect(action.nodeName).toBe('Gated Tool Node');
			expect(action.input).toEqual({ query: 'test', tool: 'my_tool' });
			expect(action.id).toBe('action-1');
			expect(action.metadata?.parentNodeName).toBe('HITL Node');
		});

		it('removes approved HITL response from processed responses', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [createHitlActionResponse(true, hitlMetadata)],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.processedResponse.actionResponses).toHaveLength(0);
		});

		it('handles nested approval data format', () => {
			const actionResponse: ExecuteNodeResult<RequestResponseMetadata> = {
				action: {
					actionType: 'ExecutionNodeAction',
					nodeName: 'HITL Node',
					input: {},
					type: NodeConnectionTypes.AiTool,
					id: 'action-1',
					metadata: { hitl: hitlMetadata },
				},
				data: createMockTaskData({ data: { approved: true } }),
			};
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [actionResponse],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(true);
		});
	});

	describe('denied HITL responses', () => {
		it('modifies response with denial message', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [createHitlActionResponse(false, hitlMetadata)],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(false);
			expect(result.pendingGatedToolRequest).toBeUndefined();
			expect(result.processedResponse.actionResponses).toHaveLength(1);

			const processedData = result.processedResponse.actionResponses[0].data?.data
				?.ai_tool?.[0]?.[0]?.json as Record<string, unknown>;
			expect(processedData.approved).toBe(false);
			expect(processedData.response).toMatch(/reject/i);
		});
	});

	describe('mixed responses', () => {
		it('processes HITL and non-HITL responses correctly', () => {
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					createNonHitlActionResponse('regular-1'),
					createHitlActionResponse(true, hitlMetadata, 'hitl-approved'),
					createHitlActionResponse(
						false,
						{ ...hitlMetadata, toolName: 'denied_tool' },
						'hitl-denied',
					),
					createNonHitlActionResponse('regular-2'),
				],
				metadata: {},
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(true);
			expect(result.pendingGatedToolRequest?.actions).toHaveLength(1);
			// 2 non-HITL + 1 denied HITL = 3 (approved HITL is removed)
			expect(result.processedResponse.actionResponses).toHaveLength(3);
		});
	});

	describe('multiple approvals', () => {
		it('batches multiple gated tool actions', () => {
			const hitlMetadata2 = { ...hitlMetadata, gatedToolNodeName: 'Another Gated Tool' };
			const response: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [
					createHitlActionResponse(true, hitlMetadata, 'hitl-1'),
					createHitlActionResponse(true, hitlMetadata2, 'hitl-2'),
				],
				metadata: { previousRequests: [{ action: {} as never, observation: 'prev' }] },
			};

			const result = processHitlResponses(response, 0);

			expect(result.hasApprovedHitlTools).toBe(true);
			expect(result.pendingGatedToolRequest?.actions).toHaveLength(2);
			expect(result.pendingGatedToolRequest?.metadata?.previousRequests).toHaveLength(1);
		});
	});
});
