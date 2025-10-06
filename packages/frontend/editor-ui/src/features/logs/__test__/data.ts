import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import {
	AGENT_NODE_TYPE,
	AI_CATEGORY_AGENTS,
	AI_SUBCATEGORY,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
} from '@/constants';
import { type IExecutionResponse } from '@/Interface';
import { WorkflowOperationError, type IRunData, type Workflow } from 'n8n-workflow';
import type { LogTreeCreationContext } from '../logs.types';

export function createTestLogTreeCreationContext(
	workflow: Workflow,
	runData: IRunData,
): LogTreeCreationContext {
	return {
		parent: undefined,
		workflow,
		workflows: {},
		subWorkflowData: {},
		executionId: 'test-execution-id',
		ancestorRunIndexes: [],
		data: {
			resultData: {
				runData,
			},
		},
		isSubExecution: false,
	};
}

export const nodeTypes = [
	mockNodeTypeDescription({
		name: CHAT_TRIGGER_NODE_TYPE,
		version: 1,
		group: ['trigger'],
	}),
	mockNodeTypeDescription({
		name: MANUAL_TRIGGER_NODE_TYPE,
		version: 1,
		group: ['trigger'],
	}),
	mockNodeTypeDescription({
		name: AGENT_NODE_TYPE,
		codex: {
			subcategories: {
				[AI_SUBCATEGORY]: [AI_CATEGORY_AGENTS],
			},
		},
		version: 1,
	}),
];

export const chatTriggerNode = createTestNode({ name: 'Chat', type: CHAT_TRIGGER_NODE_TYPE });
export const manualTriggerNode = createTestNode({ name: 'Manual' });
export const aiAgentNode = createTestNode({ name: 'AI Agent', type: AGENT_NODE_TYPE });
export const aiModelNode = createTestNode({ name: 'AI Model' });

export const aiManualWorkflow = createTestWorkflow({
	nodes: [manualTriggerNode, aiAgentNode, aiModelNode],
	connections: {
		Manual: {
			main: [[{ node: 'AI Agent', index: 0, type: 'main' }]],
		},
		'AI Model': {
			ai_languageModel: [[{ node: 'AI Agent', index: 0, type: 'ai_languageModel' }]],
		},
	},
});

export const aiChatWorkflow = createTestWorkflow({
	nodes: [chatTriggerNode, aiAgentNode, aiModelNode],
	connections: {
		Chat: {
			main: [[{ node: 'AI Agent', index: 0, type: 'main' }]],
		},
		'AI Model': {
			ai_languageModel: [[{ node: 'AI Agent', index: 0, type: 'ai_languageModel' }]],
		},
	},
});

export const aiChatExecutionResponse: IExecutionResponse = {
	id: 'test-exec-id',
	finished: true,
	mode: 'manual',
	status: 'success',
	data: {
		resultData: {
			lastNodeExecuted: 'AI Agent',
			runData: {
				'AI Agent': [
					{
						executionStatus: 'success',
						startTime: Date.parse('2025-03-26T00:00:00.002Z'),
						executionIndex: 0,
						executionTime: 1778,
						source: [],
						data: {
							main: [[{ json: { output: 'AI response message' } }]],
						},
					},
				],
				'AI Model': [
					{
						executionStatus: 'error',
						startTime: Date.parse('2025-03-26T00:00:00.003Z'),
						executionIndex: 1,
						executionTime: 1777,
						source: [],
						error: new WorkflowOperationError('Test error', aiModelNode, 'Test error description'),
						data: {
							ai_languageModel: [
								[
									{
										json: {
											tokenUsage: {
												completionTokens: 222,
												promptTokens: 333,
												totalTokens: 555,
											},
										},
									},
								],
							],
						},
					},
				],
			},
		},
	},
	workflowData: aiChatWorkflow,
	createdAt: new Date('2025-03-26T00:00:00.000Z'),
	startedAt: new Date('2025-03-26T00:00:00.001Z'),
	stoppedAt: new Date('2025-03-26T00:00:02.000Z'),
};

export const aiManualExecutionResponse: IExecutionResponse = {
	id: 'test-exec-id-2',
	finished: true,
	mode: 'manual',
	status: 'success',
	data: {
		resultData: {
			runData: {
				'AI Agent': [
					{
						executionStatus: 'success',
						startTime: Date.parse('2025-03-30T00:00:00.002Z'),
						executionIndex: 0,
						executionTime: 12,
						source: [],
						data: {},
					},
				],
				'AI Model': [
					{
						executionStatus: 'success',
						startTime: Date.parse('2025-03-30T00:00:00.003Z'),
						executionIndex: 1,
						executionTime: 3456,
						source: [],
						data: {
							ai_languageModel: [
								[
									{
										json: {
											tokenUsage: {
												completionTokens: 4,
												promptTokens: 5,
												totalTokens: 6,
											},
										},
									},
								],
							],
						},
					},
				],
			},
		},
	},
	workflowData: aiManualWorkflow,
	createdAt: new Date('2025-03-30T00:00:00.000Z'),
	startedAt: new Date('2025-03-30T00:00:00.001Z'),
	stoppedAt: new Date('2025-03-30T00:00:02.000Z'),
};
