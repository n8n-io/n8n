import type { INode } from 'n8n-workflow';

import { runtimeServesWebhookNode } from '../compiled-engine.service';

const webhook = (parameters: INode['parameters'], type = 'n8n-nodes-base.webhook'): INode => ({
	id: 'w',
	name: 'Webhook',
	type,
	typeVersion: 2,
	position: [0, 0],
	parameters,
});

describe('runtimeServesWebhookNode', () => {
	it('lets wfrt serve a Webhook node without authentication', () => {
		expect(runtimeServesWebhookNode(webhook({ path: 'orders' }))).toBe(true);
		expect(runtimeServesWebhookNode(webhook({ path: 'orders', authentication: 'none' }))).toBe(
			true,
		);
		expect(runtimeServesWebhookNode(webhook({ path: 'orders', options: { rawBody: true } }))).toBe(
			true,
		);
	});

	it('gives the request to the Webhook node of n8n when the node checks the sender', () => {
		for (const authentication of ['basicAuth', 'headerAuth', 'jwtAuth']) {
			expect(runtimeServesWebhookNode(webhook({ path: 'orders', authentication }))).toBe(false);
		}
	});

	it('gives the request to the Webhook node of n8n for an option that wfrt does not read', () => {
		expect(
			runtimeServesWebhookNode(webhook({ path: 'orders', options: { ipWhitelist: '10.0.0.1' } })),
		).toBe(false);
		expect(
			runtimeServesWebhookNode(webhook({ path: 'orders', options: { allowedOrigins: '*' } })),
		).toBe(false);
	});

	it('is false for another node type', () => {
		expect(runtimeServesWebhookNode(webhook({}, 'n8n-nodes-base.formTrigger'))).toBe(false);
	});
});
