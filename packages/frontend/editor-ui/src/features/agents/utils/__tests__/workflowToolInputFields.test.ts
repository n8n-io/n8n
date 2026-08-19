import { describe, expect, it } from 'vitest';
import { CHAT_TRIGGER_NODE_TYPE, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import type { IWorkflowDb } from '@/Interface';
import {
	detectWorkflowToolTrigger,
	formatWorkflowToolFixedValue,
	listWorkflowToolInputFields,
	parseWorkflowToolFixedValue,
} from '../workflowToolInputFields';

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

function workflowWithNodes(
	...nodes: Array<{
		id: string;
		name: string;
		type: string;
		typeVersion: number;
		position: number[];
		parameters: Record<string, unknown>;
	}>
): IWorkflowDb {
	return {
		id: 'wf-1',
		name: 'Tool Workflow',
		active: false,
		createdAt: '',
		updatedAt: '',
		nodes,
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

	it('returns no fields when a supported trigger precedes the Execute Workflow Trigger', () => {
		const chatTrigger = {
			id: 'c1',
			name: 'Chat Trigger',
			type: CHAT_TRIGGER_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const executeWorkflowTrigger = {
			id: 'e1',
			name: 'When Executed by Another Workflow',
			type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
			typeVersion: 1.1,
			position: [200, 0],
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: { values: [{ name: 'chatId', type: 'string' }] },
			},
		};
		const workflow = workflowWithNodes(chatTrigger, executeWorkflowTrigger);

		expect(detectWorkflowToolTrigger(workflow)?.type).toBe(CHAT_TRIGGER_NODE_TYPE);
		expect(listWorkflowToolInputFields(workflow)).toEqual([]);
	});
});

describe('parseWorkflowToolFixedValue', () => {
	it('keeps string fields as text', () => {
		expect(parseWorkflowToolFixedValue('3', 'string')).toBe('3');
		expect(parseWorkflowToolFixedValue('  hi  ', 'string')).toBe('  hi  ');
	});

	it('parses numbers and booleans', () => {
		expect(parseWorkflowToolFixedValue('3', 'number')).toBe(3);
		expect(parseWorkflowToolFixedValue('false', 'boolean')).toBe(false);
		expect(parseWorkflowToolFixedValue('TRUE', 'boolean')).toBe(true);
	});

	it('parses JSON arrays and objects, and keeps in-progress text', () => {
		expect(parseWorkflowToolFixedValue('[1,2]', 'array')).toEqual([1, 2]);
		expect(parseWorkflowToolFixedValue('{"a":1}', 'object')).toEqual({ a: 1 });
		expect(parseWorkflowToolFixedValue('[1', 'array')).toBe('[1');
		expect(parseWorkflowToolFixedValue('[1,2]', 'object')).toBe('[1,2]');
	});

	it('treats an empty non-string value as null', () => {
		expect(parseWorkflowToolFixedValue('', 'number')).toBeNull();
		expect(parseWorkflowToolFixedValue('  ', 'object')).toBeNull();
	});
});

describe('formatWorkflowToolFixedValue', () => {
	it('renders stored typed values back as editable text', () => {
		expect(formatWorkflowToolFixedValue(null)).toBe('');
		expect(formatWorkflowToolFixedValue(3)).toBe('3');
		expect(formatWorkflowToolFixedValue(false)).toBe('false');
		expect(formatWorkflowToolFixedValue({ a: 1 })).toBe('{"a":1}');
		expect(formatWorkflowToolFixedValue([1, 2])).toBe('[1,2]');
	});
});
