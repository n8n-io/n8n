import type { INodeTypeDescription } from 'n8n-workflow';

import { buildOperationsFromDescription } from '../operations';
import type { AppDefinition } from '../types';

const APP_DEF: AppDefinition = {
	kind: 'demo',
	nodeType: 'demo',
	nodeTypeVersion: 1,
	credentialType: 'demoApi',
};

const DESCRIPTION = {
	properties: [
		{
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
			displayName: 'Resource',
		},
		{
			name: 'operation',
			type: 'options',
			default: 'send',
			displayName: 'Operation',
			displayOptions: { show: { resource: ['message'] } },
			options: [
				{ name: 'Send', value: 'send', description: 'Send a message' },
				{ name: 'Get', value: 'get', description: 'Get a message' },
			],
		},
		{
			name: 'to',
			type: 'string',
			default: '',
			displayName: 'To',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
	],
} as unknown as INodeTypeDescription;

describe('buildOperationsFromDescription', () => {
	it('walks the node description into a list of OperationEntry', () => {
		const ops = buildOperationsFromDescription(DESCRIPTION, APP_DEF);

		expect(ops.map((o) => o.name)).toEqual(['message:send', 'message:get']);
		expect(ops[0].displayName).toBe('Send');
		expect(ops[0].description).toBe('Send a message');
		expect(ops[0].required).toEqual(['to']);
	});

	it('returns empty array for null/undefined description', () => {
		expect(buildOperationsFromDescription(null, APP_DEF)).toEqual([]);
		expect(buildOperationsFromDescription(undefined, APP_DEF)).toEqual([]);
	});

	it('emits one entry per resource when an operation group declares multiple', () => {
		const multi = {
			properties: [
				{
					name: 'resource',
					type: 'options',
					default: 'message',
					options: [
						{ name: 'Message', value: 'message' },
						{ name: 'Thread', value: 'thread' },
					],
					displayName: 'Resource',
				},
				{
					name: 'operation',
					type: 'options',
					default: 'reply',
					displayName: 'Operation',
					displayOptions: { show: { resource: ['message', 'thread'] } },
					options: [{ name: 'Reply', value: 'reply', description: 'Reply' }],
				},
			],
		} as unknown as INodeTypeDescription;

		const ops = buildOperationsFromDescription(multi, APP_DEF);

		expect(ops.map((o) => o.name)).toEqual(['message:reply', 'thread:reply']);
		expect(ops[0].resource).toBe('message');
		expect(ops[1].resource).toBe('thread');
	});

	it('dedupes when the same resource:operation pair appears in multiple operation groups', () => {
		const dup = {
			properties: [
				{
					name: 'resource',
					type: 'options',
					default: 'message',
					options: [{ name: 'Message', value: 'message' }],
					displayName: 'Resource',
				},
				{
					name: 'operation',
					type: 'options',
					default: 'send',
					displayName: 'Operation',
					displayOptions: { show: { resource: ['message'] } },
					options: [{ name: 'Send', value: 'send' }],
				},
				{
					name: 'operation',
					type: 'options',
					default: 'send',
					displayName: 'Operation',
					displayOptions: { show: { resource: ['message'] } },
					options: [{ name: 'Send', value: 'send' }],
				},
			],
		} as unknown as INodeTypeDescription;

		const ops = buildOperationsFromDescription(dup, APP_DEF);
		expect(ops.map((o) => o.name)).toEqual(['message:send']);
	});
});
