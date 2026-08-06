import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { computeTriggerEndpoints } from '../trigger-endpoints';

const BASES = {
	webhookBaseUrl: 'https://acme.app.n8n.cloud/webhook',
	formBaseUrl: 'https://acme.app.n8n.cloud/form',
};

function workflowWith(nodes: WorkflowJSON['nodes']): WorkflowJSON {
	return { name: 'Test', nodes, connections: {} };
}

describe('computeTriggerEndpoints', () => {
	it('builds webhook URLs from the webhook base and path', () => {
		const endpoints = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Incoming',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2.1,
					position: [0, 0],
					parameters: { path: 'orders', httpMethod: 'POST' },
				},
			]),
			BASES,
		);

		expect(endpoints).toEqual([
			{ nodeName: 'Incoming', kind: 'webhook', url: 'https://acme.app.n8n.cloud/webhook/orders' },
		]);
	});

	it('serves form triggers from the form base, falling back to webhookId', () => {
		const endpoints = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Intake Form',
					type: 'n8n-nodes-base.formTrigger',
					typeVersion: 2.2,
					position: [0, 0],
					parameters: {},
					webhookId: 'wh-123',
				},
			]),
			BASES,
		);

		expect(endpoints).toEqual([
			{ nodeName: 'Intake Form', kind: 'form', url: 'https://acme.app.n8n.cloud/form/wh-123' },
		]);
	});

	it('returns editor guidance instead of a URL for private chat triggers', () => {
		const endpoints = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Chat',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: {},
					webhookId: 'wh-chat',
				},
			]),
			BASES,
		);

		expect(endpoints).toHaveLength(1);
		expect(endpoints[0].url).toBeUndefined();
		expect(endpoints[0].guidance).toContain('Open chat');
	});

	it('builds the /chat URL for public chat triggers', () => {
		const endpoints = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Chat',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { public: true },
					webhookId: 'wh-chat',
				},
			]),
			BASES,
		);

		expect(endpoints[0].url).toBe('https://acme.app.n8n.cloud/webhook/wh-chat/chat');
	});

	it('reports guidance when the webhook path is a placeholder or expression', () => {
		const endpoints = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Incoming',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2.1,
					position: [0, 0],
					parameters: { path: '<__PLACEHOLDER_VALUE__Pick a path__>' },
				},
			]),
			BASES,
		);

		expect(endpoints[0].url).toBeUndefined();
		expect(endpoints[0].guidance).toContain('not a concrete value');
	});

	it('returns nothing for schedule or manual triggers and missing base URLs', () => {
		const scheduleOnly = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Every day',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: {},
				},
			]),
			BASES,
		);
		expect(scheduleOnly).toEqual([]);

		const noBases = computeTriggerEndpoints(
			workflowWith([
				{
					id: '1',
					name: 'Incoming',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2.1,
					position: [0, 0],
					parameters: { path: 'orders' },
				},
			]),
			{},
		);
		expect(noBases).toEqual([]);
	});
});
