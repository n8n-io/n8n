import { describe, expect, it } from 'vitest';

import { convertWorkflow } from '../index.ts';

const workflow = (path: string, webhookId: string | undefined) => ({
	id: 'wf1',
	name: 'Hook',
	nodes: [
		{
			id: 'w',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			...(webhookId === undefined ? {} : { webhookId }),
			parameters: { path, httpMethod: 'POST' },
		},
		{
			id: 's',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0],
			parameters: {
				assignments: { assignments: [{ id: 'a', name: 'n', value: 1, type: 'number' }] },
			},
		},
	],
	connections: { Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
	settings: { executionOrder: 'v1' },
});

const webhookUrls = {
	production: 'https://n8n.example.com/webhook',
	test: 'https://n8n.example.com/webhook-test',
};

describe('the item of a Webhook trigger', () => {
	it('has no URL fields when the converter does not know the URLs of n8n', () => {
		const converted = convertWorkflow(workflow('orders', 'id-1'));
		expect(converted.ok).toBe(true);
		expect(converted.source).not.toContain('webhookUrl');
		expect(converted.source).not.toContain('executionMode');
	});

	it('has the production URL and the test URL of the path, and the mode', () => {
		const converted = convertWorkflow(workflow('/orders', 'id-1'), { webhookUrls });
		expect(converted.ok).toBe(true);
		expect(converted.source).toContain("'https://n8n.example.com/webhook/orders'");
		expect(converted.source).toContain("'https://n8n.example.com/webhook-test/orders'");
		expect(converted.source).toContain("executionMode: trigger.executionMode ?? 'production'");
	});

	it('puts the webhook id before a path with a parameter, as n8n does', () => {
		const converted = convertWorkflow(workflow('orders/:id', 'id-1'), { webhookUrls });
		expect(converted.source).toContain("'https://n8n.example.com/webhook/id-1/orders/:id'");
	});

	it('uses the workflow id and the node name for a node without a webhook id', () => {
		const converted = convertWorkflow(workflow('orders', undefined), { webhookUrls });
		expect(converted.source).toContain("'https://n8n.example.com/webhook/wf1/webhook/orders'");
	});
});
