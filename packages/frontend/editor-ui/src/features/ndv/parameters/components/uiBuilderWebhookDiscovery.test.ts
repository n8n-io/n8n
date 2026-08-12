import { describe, expect, it } from 'vitest';

import { API_ROUTER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants/nodeTypes';

import {
	apiRouterEndpointsOf,
	liveWebhookCandidatesOf,
	webhookMethodOf,
	webhookPathsOf,
	type WebhookDiscoveryNode,
} from './uiBuilderWebhookDiscovery';

describe('webhookMethodOf', () => {
	it('defaults to GET when httpMethod is unset', () => {
		expect(webhookMethodOf({ type: WEBHOOK_NODE_TYPE, parameters: {} })).toBe('GET');
	});

	it('reports a single configured method other than GET as POST', () => {
		expect(webhookMethodOf({ type: WEBHOOK_NODE_TYPE, parameters: { httpMethod: 'DELETE' } })).toBe(
			'POST',
		);
	});

	it('falls back to POST in "multiple methods" mode', () => {
		expect(
			webhookMethodOf({ type: WEBHOOK_NODE_TYPE, parameters: { multipleMethods: true } }),
		).toBe('POST');
	});
});

describe('apiRouterEndpointsOf', () => {
	it('contributes one entry per endpoint, joining basePath and endpoint path', () => {
		const node: WebhookDiscoveryNode = {
			type: API_ROUTER_NODE_TYPE,
			name: 'Shop API',
			parameters: {
				basePath: '/shop/',
				endpoints: {
					endpoint: [
						{ method: 'GET', path: '/orders' },
						{ method: 'post', path: 'orders' },
					],
				},
			},
		};

		expect(apiRouterEndpointsOf(node)).toEqual([
			{ path: 'shop/orders', method: 'GET', label: 'Shop API — GET /orders' },
			{ path: 'shop/orders', method: 'POST', label: 'Shop API — POST orders' },
		]);
	});

	it('prefers the endpoint options name over the method/path fallback', () => {
		const node: WebhookDiscoveryNode = {
			type: API_ROUTER_NODE_TYPE,
			name: 'Shop API',
			parameters: {
				basePath: 'shop',
				endpoints: {
					endpoint: [{ method: 'GET', path: '/orders/:id', options: { name: 'Get order' } }],
				},
			},
		};

		expect(apiRouterEndpointsOf(node)).toEqual([
			{ path: 'shop/orders/:id', method: 'GET', label: 'Shop API — Get order' },
		]);
	});

	it('falls back to the node webhookId when basePath is empty', () => {
		const node: WebhookDiscoveryNode = {
			type: API_ROUTER_NODE_TYPE,
			name: 'Router',
			webhookId: 'random-id-123',
			parameters: {
				basePath: '',
				endpoints: { endpoint: [{ method: 'GET', path: 'ping' }] },
			},
		};

		expect(apiRouterEndpointsOf(node)).toEqual([
			{ path: 'random-id-123/ping', method: 'GET', label: 'Router — GET ping' },
		]);
	});

	it('drops endpoints whose combined path ends up empty', () => {
		const node: WebhookDiscoveryNode = {
			type: API_ROUTER_NODE_TYPE,
			name: 'Router',
			parameters: {
				basePath: '',
				endpoints: { endpoint: [{ method: 'GET', path: '' }] },
			},
		};

		expect(apiRouterEndpointsOf(node)).toEqual([]);
	});
});

describe('webhookPathsOf', () => {
	it('keeps existing plain-Webhook-node behavior unchanged', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{
				type: WEBHOOK_NODE_TYPE,
				name: 'Webhook',
				parameters: { path: '/hook', httpMethod: 'POST' },
			},
			{ type: WEBHOOK_NODE_TYPE, name: 'GET Webhook', parameters: { path: 'get-hook' } },
			// Nodes that aren't triggers contribute nothing.
			{ type: 'n8n-nodes-base.set', parameters: {} },
		];

		expect(webhookPathsOf(nodes)).toEqual([
			{ path: 'hook', method: 'POST', label: 'hook' },
			{ path: 'get-hook', method: 'GET', label: 'get-hook' },
		]);
	});

	it('contributes multiple targets from an API Router alongside plain webhooks', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{ type: WEBHOOK_NODE_TYPE, name: 'Webhook', parameters: { path: 'hook' } },
			{
				type: API_ROUTER_NODE_TYPE,
				name: 'Shop API',
				parameters: {
					basePath: 'shop',
					endpoints: {
						endpoint: [
							{ method: 'GET', path: 'orders' },
							{ method: 'DELETE', path: 'orders/:id' },
						],
					},
				},
			},
		];

		const result = webhookPathsOf(nodes);

		expect(result).toHaveLength(3);
		expect(result).toEqual([
			{ path: 'hook', method: 'GET', label: 'hook' },
			{ path: 'shop/orders', method: 'GET', label: 'Shop API — GET orders' },
			{ path: 'shop/orders/:id', method: 'DELETE', label: 'Shop API — DELETE orders/:id' },
		]);

		// Sibling endpoints on the same node get distinguishable labels.
		expect(new Set(result.map((entry) => entry.label)).size).toBe(result.length);
	});
});

describe('liveWebhookCandidatesOf', () => {
	it('offers a plain GET Webhook trigger as the sole candidate', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{ type: WEBHOOK_NODE_TYPE, name: 'Webhook', parameters: { path: 'hook' } },
		];

		expect(liveWebhookCandidatesOf(nodes)).toEqual([{ node: nodes[0], path: 'hook' }]);
	});

	it('excludes a Webhook trigger not configured for GET', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{
				type: WEBHOOK_NODE_TYPE,
				name: 'Webhook',
				parameters: { path: 'hook', httpMethod: 'POST' },
			},
		];

		expect(liveWebhookCandidatesOf(nodes)).toEqual([]);
	});

	it('offers only the GET endpoints of an API Router', () => {
		const node: WebhookDiscoveryNode = {
			type: API_ROUTER_NODE_TYPE,
			name: 'Shop API',
			parameters: {
				basePath: 'shop',
				endpoints: {
					endpoint: [
						{ method: 'GET', path: 'orders' },
						{ method: 'POST', path: 'orders' },
						{ method: 'GET', path: 'orders/:id' },
					],
				},
			},
		};

		expect(liveWebhookCandidatesOf([node])).toEqual([
			{ node, path: 'shop/orders' },
			{ node, path: 'shop/orders/:id' },
		]);
	});

	it('refuses when more than one GET candidate is reachable, same as before', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{ type: WEBHOOK_NODE_TYPE, name: 'A', parameters: { path: 'a' } },
			{ type: WEBHOOK_NODE_TYPE, name: 'B', parameters: { path: 'b' } },
		];

		expect(liveWebhookCandidatesOf(nodes)).toHaveLength(2);
	});
});
