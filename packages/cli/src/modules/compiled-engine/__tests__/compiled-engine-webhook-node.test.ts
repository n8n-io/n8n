import type { IConnections, INode } from 'n8n-workflow';

import { runtimeServesWebhookNode } from '../compiled-engine.service';

const webhook = (parameters: INode['parameters'], type = 'n8n-nodes-base.webhook'): INode => ({
	id: 'w',
	name: 'Webhook',
	type,
	typeVersion: 2,
	position: [0, 0],
	parameters,
});

const node = (name: string, type: string, disabled = false): INode => ({
	id: name,
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	disabled,
});

const chain = (...names: string[]): IConnections =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, i) => [name, { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] }]),
	);

/** Webhook, Set, Respond to Webhook. */
const withRespondNode = (
	hook: INode,
	respond = node('Respond', 'n8n-nodes-base.respondToWebhook'),
) => ({
	nodes: [hook, node('Set', 'n8n-nodes-base.set'), respond],
	connections: chain('Webhook', 'Set', 'Respond'),
});

const serves = (parameters: INode['parameters'], type?: string) => {
	const hook = webhook(parameters, type);
	return runtimeServesWebhookNode(hook, withRespondNode(hook));
};

describe('runtimeServesWebhookNode', () => {
	const responseMode = 'responseNode';

	it('lets wfrt serve a Webhook node without authentication', () => {
		expect(serves({ path: 'orders', responseMode })).toBe(true);
		expect(serves({ path: 'orders', responseMode, authentication: 'none' })).toBe(true);
		expect(serves({ path: 'orders', responseMode, options: { rawBody: true } })).toBe(true);
	});

	it('gives the request to the Webhook node of n8n when the node checks the sender', () => {
		for (const authentication of ['basicAuth', 'headerAuth', 'jwtAuth']) {
			expect(serves({ path: 'orders', responseMode, authentication })).toBe(false);
		}
	});

	it('gives the request to the Webhook node of n8n for an option that wfrt does not read', () => {
		expect(serves({ path: 'orders', responseMode, options: { ipWhitelist: '10.0.0.1' } })).toBe(
			false,
		);
		expect(serves({ path: 'orders', responseMode, options: { allowedOrigins: '*' } })).toBe(false);
	});

	it('gives the request to the Webhook node of n8n for a response mode that wfrt does not have', () => {
		expect(serves({ path: 'orders' })).toBe(false);
		for (const mode of ['onReceived', 'lastNode', 'streaming', '={{ $json.mode }}']) {
			expect(serves({ path: 'orders', responseMode: mode })).toBe(false);
		}
	});

	it('gives the request to the Webhook node of n8n when no Respond to Webhook node comes after it', () => {
		const hook = webhook({ path: 'orders', responseMode });
		const set = node('Set', 'n8n-nodes-base.set');
		const respond = node('Respond', 'n8n-nodes-base.respondToWebhook');

		expect(
			runtimeServesWebhookNode(hook, { nodes: [hook, set], connections: chain('Webhook', 'Set') }),
		).toBe(false);
		// A Respond to Webhook node without a connection from the Webhook node.
		expect(
			runtimeServesWebhookNode(hook, {
				nodes: [hook, set, respond],
				connections: chain('Webhook', 'Set'),
			}),
		).toBe(false);
		expect(
			runtimeServesWebhookNode(
				hook,
				withRespondNode(hook, node('Respond', 'n8n-nodes-base.respondToWebhook', true)),
			),
		).toBe(false);
	});

	it('is false for another node type', () => {
		expect(serves({ responseMode }, 'n8n-nodes-base.formTrigger')).toBe(false);
	});
});
