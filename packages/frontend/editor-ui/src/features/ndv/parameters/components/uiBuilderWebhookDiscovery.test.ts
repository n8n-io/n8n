import { describe, expect, it } from 'vitest';

import { API_ROUTER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants/nodeTypes';

import {
	apiRouterEndpointsOf,
	endpointsOf,
	liveWebhookCandidatesOf,
	webhookEndpointsOf,
	type WebhookDiscoveryNode,
} from './uiBuilderWebhookDiscovery';

describe('webhookEndpointsOf', () => {
	it('defaults to GET when httpMethod is unset', () => {
		expect(webhookEndpointsOf({ type: WEBHOOK_NODE_TYPE, parameters: { path: 'hook' } })).toEqual([
			{ path: 'hook', method: 'GET' },
		]);
	});

	it('keeps a single configured method as itself', () => {
		expect(
			webhookEndpointsOf({ type: WEBHOOK_NODE_TYPE, parameters: { path: 'hook', httpMethod: 'DELETE' } }),
		).toEqual([{ path: 'hook', method: 'DELETE' }]);
	});

	it('contributes one endpoint per method in "multiple methods" mode', () => {
		expect(
			webhookEndpointsOf({
				type: WEBHOOK_NODE_TYPE,
				parameters: { path: 'hook', multipleMethods: true, httpMethod: ['get', 'POST'] },
			}),
		).toEqual([
			{ path: 'hook', method: 'GET' },
			{ path: 'hook', method: 'POST' },
		]);
	});

	it('drops methods an action cannot call with', () => {
		expect(
			webhookEndpointsOf({
				type: WEBHOOK_NODE_TYPE,
				parameters: { path: 'hook', multipleMethods: true, httpMethod: ['HEAD', 'GET'] },
			}),
		).toEqual([{ path: 'hook', method: 'GET' }]);
	});

	it('contributes nothing when no configured method is callable', () => {
		expect(
			webhookEndpointsOf({ type: WEBHOOK_NODE_TYPE, parameters: { path: 'hook', httpMethod: 'HEAD' } }),
		).toEqual([]);
	});

	it('contributes nothing without a path', () => {
		expect(webhookEndpointsOf({ type: WEBHOOK_NODE_TYPE, parameters: {} })).toEqual([]);
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
			{ path: 'shop/orders', method: 'GET', name: undefined },
			{ path: 'shop/orders', method: 'POST', name: undefined },
		]);
	});

	it('carries the name the author gave the endpoint', () => {
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
			{ path: 'shop/orders/:id', method: 'GET', name: 'Get order' },
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
			{ path: 'random-id-123/ping', method: 'GET', name: undefined },
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

describe('endpointsOf', () => {
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

		expect(endpointsOf(nodes)).toEqual([
			{ path: 'hook', method: 'POST' },
			{ path: 'get-hook', method: 'GET' },
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

		expect(endpointsOf(nodes)).toEqual([
			{ path: 'hook', method: 'GET' },
			{ path: 'shop/orders', method: 'GET', name: undefined },
			{ path: 'shop/orders/:id', method: 'DELETE', name: undefined },
		]);
	});

	it('tells sibling endpoints on one path apart by their method', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{
				type: API_ROUTER_NODE_TYPE,
				name: 'Shop API',
				parameters: {
					basePath: 'shop',
					endpoints: {
						endpoint: [
							{ method: 'GET', path: 'orders' },
							{ method: 'POST', path: 'orders' },
						],
					},
				},
			},
		];

		const result = endpointsOf(nodes);

		expect(new Set(result.map((entry) => `${entry.method} ${entry.path}`)).size).toBe(result.length);
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

	it('offers a multi-method Webhook trigger that answers GET among others', () => {
		const nodes: WebhookDiscoveryNode[] = [
			{
				type: WEBHOOK_NODE_TYPE,
				name: 'Webhook',
				parameters: { path: 'hook', multipleMethods: true, httpMethod: ['POST', 'GET'] },
			},
		];

		expect(liveWebhookCandidatesOf(nodes)).toEqual([{ node: nodes[0], path: 'hook' }]);
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
