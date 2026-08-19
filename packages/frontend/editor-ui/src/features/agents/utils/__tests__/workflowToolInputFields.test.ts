import { describe, expect, it } from 'vitest';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import type { IWorkflowDb } from '@/Interface';
import { listWorkflowToolInputFields } from '../utils/workflowToolInputFields';

function workflowWithTrigger(parameters: Record<string, unknown>): IWorkflowDb {
	return {
		id: 'wf-1',
		name: 'Tool Workflow',
		active: false,
		createdAt: '',
		updatedAt: '',
		nodes: [
			{
				id: 't1',
				name: 'When Executed by Another Workflow',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1.1,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		settings: {},
		versionId: 'v1',
	} as unknown as IWorkflowDb;
}

describe('listWorkflowToolInputFields', () => {
	it('returns declared workflowInputs fields', () => {
		expect(
			listWorkflowToolInputFields(
				workflowWithTrigger({
					inputSource: 'workflowInputs',
					workflowInputs: {
						values: [
							{ name: 'chatId', type: 'string' },
							{ name: 'botName', type: 'string' },
						],
					},
				}),
			),
		).toEqual([
			{ name: 'chatId', type: 'string' },
			{ name: 'botName', type: 'string' },
		]);
	});

	it('returns empty for passthrough', () => {
		expect(
			listWorkflowToolInputFields(
				workflowWithTrigger({
					inputSource: 'passthrough',
					workflowInputs: {
						values: [{ name: 'chatId', type: 'string' }],
					},
				}),
			),
		).toEqual([]);
	});

	it('returns jsonExample keys when selected', () => {
		expect(
			listWorkflowToolInputFields(
				workflowWithTrigger({
					inputSource: 'jsonExample',
					jsonExample: JSON.stringify({ orderId: 'x', qty: 1 }),
				}),
			),
		).toEqual([
			{ name: 'orderId', type: 'string' },
			{ name: 'qty', type: 'number' },
		]);
	});
});
