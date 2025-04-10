import { createTestNode, createTestTaskData, createTestWorkflow } from '@/__tests__/mocks';
import { restoreChatHistory } from '@/components/CanvasChat/utils';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { NodeConnectionTypes } from 'n8n-workflow';

describe(restoreChatHistory, () => {
	it('should return extracted chat input and bot message from workflow execution data', () => {
		expect(
			restoreChatHistory({
				id: 'test-exec-id',
				workflowData: createTestWorkflow({
					nodes: [
						createTestNode({ name: 'A', type: CHAT_TRIGGER_NODE_TYPE }),
						createTestNode({ name: 'B', type: AGENT_NODE_TYPE }),
					],
				}),
				data: {
					resultData: {
						lastNodeExecuted: 'B',
						runData: {
							A: [
								createTestTaskData({
									startTime: Date.parse('2025-04-20T00:00:01.000Z'),
									data: { [NodeConnectionTypes.Main]: [[{ json: { chatInput: 'test input' } }]] },
								}),
							],
							B: [
								createTestTaskData({
									startTime: Date.parse('2025-04-20T00:00:02.000Z'),
									executionTime: 999,
									data: { [NodeConnectionTypes.Main]: [[{ json: { output: 'test output' } }]] },
								}),
							],
						},
					},
				},
				finished: true,
				mode: 'manual',
				status: 'success',
				startedAt: '2025-04-20T00:00:00.000Z',
				createdAt: '2025-04-20T00:00:00.000Z',
			}),
		).toEqual([
			{ id: expect.any(String), sender: 'user', text: 'test input' },
			{ id: 'test-exec-id', sender: 'bot', text: 'test output' },
		]);
	});
});
