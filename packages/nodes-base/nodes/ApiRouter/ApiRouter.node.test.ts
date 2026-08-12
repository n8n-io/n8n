import type { Request, Response } from 'express';
import type { IWebhookFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ApiRouter } from './ApiRouter.node';
import type { ApiRouterEndpoint, ApiRouterOptions } from './types';

const endpoints: ApiRouterEndpoint[] = [
	{ method: 'GET', path: '/orders' },
	{ method: 'POST', path: '/orders', options: { name: 'Create order' } },
	{ method: 'GET', path: '/orders/:id' },
];

type Setup = {
	webhookName: string;
	method?: string;
	params?: Record<string, string>;
	options?: ApiRouterOptions;
	endpoints?: ApiRouterEndpoint[];
	basePath?: string;
	body?: unknown;
	authentication?: string;
	mode?: 'manual' | 'trigger';
};

const setup = (config: Setup) => {
	const node = new ApiRouter();
	const context = mock<IWebhookFunctions>({ nodeHelpers: mock() });

	const req = mock<Request>({ path: '/shop/orders', ips: [], ip: '10.0.0.1' });
	req.method = config.method ?? 'GET';
	req.headers = { authorization: 'Bearer secret', 'user-agent': 'vitest' };
	req.query = { include: 'items' };
	req.body = config.body ?? { sku: 'a1' };

	const res = mock<Response>();

	context.getRequestObject.mockReturnValue(req);
	context.getHeaderData.mockReturnValue(req.headers);
	context.getResponseObject.mockReturnValue(res);
	context.getWebhookName.mockReturnValue(config.webhookName);
	context.getParamsData.mockReturnValue(config.params ?? {});
	context.getMode.mockReturnValue(config.mode ?? 'trigger');
	context.getNodeWebhookUrl.mockReturnValue('https://n8n.test/webhook/shop');

	context.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
		if (name === 'basePath') return config.basePath ?? 'shop';
		if (name === 'endpoints') return { endpoint: config.endpoints ?? endpoints } as object;
		if (name === 'options') return (config.options ?? {}) as object;
		if (name === 'authentication') return config.authentication ?? 'none';
		if (name === 'responseMode') return 'auto';
		return fallback as string;
	});

	return { node, context, req, res };
};

describe('routing', () => {
	it('emits on the output of the endpoint the platform matched', async () => {
		const { node, context } = setup({ webhookName: 'ep:1', method: 'POST' });

		const result = await node.webhook(context);

		expect(result.workflowData).toHaveLength(3);
		expect(result.workflowData?.[0]).toEqual([]);
		expect(result.workflowData?.[2]).toEqual([]);
		expect(result.workflowData?.[1]?.[0].json).toMatchObject({
			route: { name: 'Create order', method: 'POST', path: '/orders' },
		});
	});

	it('builds the documented item shape', async () => {
		const { node, context } = setup({
			webhookName: 'ep:2',
			params: { id: '42' },
		});

		const item = (await node.webhook(context)).workflowData?.[2]?.[0].json;

		expect(item).toEqual({
			route: { name: 'GET /orders/:id', method: 'GET', path: '/orders/:id' },
			params: { id: '42' },
			query: { include: 'items' },
			body: { sku: 'a1' },
			headers: { authorization: 'Bearer secret', 'user-agent': 'vitest' },
			webhookUrl: 'https://n8n.test/webhook/shop/orders/:id',
			executionMode: 'production',
		});
	});

	it('reports the test url and mode on a manual run', async () => {
		const { node, context } = setup({ webhookName: 'ep:0', mode: 'manual' });

		expect((await node.webhook(context)).workflowData?.[0]?.[0].json).toMatchObject({
			webhookUrl: 'https://n8n.test/webhook-test/shop/orders',
			executionMode: 'test',
		});
	});

	it('answers 405 with an Allow header when a catch-all sees a known path', async () => {
		const { node, context, res } = setup({
			webhookName: 'catchall:1',
			method: 'PATCH',
			params: { s1: 'orders' },
		});

		expect(await node.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(res.writeHead).toHaveBeenCalledWith(405, { Allow: 'GET, POST' });
	});

	it('answers 404 when nothing matches and there is no fallback output', async () => {
		const { node, context, res } = setup({
			webhookName: 'catchall:1',
			params: { s1: 'customers' },
		});

		expect(await node.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
	});

	it('routes an unmatched request to the fallback output when enabled', async () => {
		const { node, context, res } = setup({
			webhookName: 'catchall:1',
			params: { s1: 'customers' },
			options: { fallbackOutput: true },
		});

		const result = await node.webhook(context);

		expect(res.writeHead).not.toHaveBeenCalled();
		expect(result.workflowData).toHaveLength(4);
		expect(result.workflowData?.[3]?.[0].json).toMatchObject({ route: { name: 'Fallback' } });
	});

	it('re-matches a catch-all request that does hit an endpoint', async () => {
		const { node, context } = setup({
			webhookName: 'catchall:2',
			params: { s1: 'orders', s2: '7' },
			options: { fallbackOutput: true },
		});

		expect((await node.webhook(context)).workflowData?.[2]?.[0].json).toMatchObject({
			params: { id: '7' },
		});
	});

	it('rejects a misconfigured endpoint table before touching the request', async () => {
		const { node, context } = setup({
			webhookName: 'ep:0',
			endpoints: [
				{ method: 'GET', path: '/orders/:id' },
				{ method: 'GET', path: '/orders/:orderId' },
			],
		});

		await expect(node.webhook(context)).rejects.toThrow(UserError);
	});
});

describe('access control', () => {
	it('answers 403 for a disallowed IP', async () => {
		const { node, context, res } = setup({
			webhookName: 'ep:0',
			options: { ipWhitelist: '192.168.1.0/24' },
		});

		expect(await node.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(res.writeHead).toHaveBeenCalledWith(403);
	});

	it('answers 403 when the node credential does not match', async () => {
		const { node, context, res } = setup({ webhookName: 'ep:0', authentication: 'headerAuth' });
		context.getCredentials.mockResolvedValue({ name: 'x-api-key', value: 'expected' });

		expect(await node.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(res.writeHead).toHaveBeenCalledWith(403, expect.anything());
	});

	it('skips authentication for an endpoint marked as public', async () => {
		const { node, context } = setup({
			webhookName: 'ep:0',
			authentication: 'headerAuth',
			endpoints: [{ method: 'GET', path: '/orders', options: { authentication: 'none' } }],
		});

		expect((await node.webhook(context)).workflowData).toBeDefined();
		expect(context.getCredentials).not.toHaveBeenCalled();
	});
});

describe('request validation', () => {
	const schema = JSON.stringify({ type: 'object', required: ['sku'] });
	const validated: ApiRouterEndpoint[] = [
		{ method: 'POST', path: '/orders', options: { requestSchema: schema } },
	];

	it('answers 400 with the violations', async () => {
		const { node, context, res } = setup({
			webhookName: 'ep:0',
			method: 'POST',
			endpoints: validated,
			options: { validateRequests: true },
			body: {},
		});

		expect(await node.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({
				error: 'Bad Request',
				details: [{ path: '/', message: "must have required property 'sku'" }],
			}),
		);
	});

	it('lets a conforming body through', async () => {
		const { node, context } = setup({
			webhookName: 'ep:0',
			method: 'POST',
			endpoints: validated,
			options: { validateRequests: true },
		});

		expect((await node.webhook(context)).workflowData?.[0]).toHaveLength(1);
	});

	it('does nothing while the option is off', async () => {
		const { node, context } = setup({
			webhookName: 'ep:0',
			method: 'POST',
			endpoints: validated,
			body: {},
		});

		expect((await node.webhook(context)).workflowData?.[0]).toHaveLength(1);
	});

	it('routes violations to the fallback output when asked', async () => {
		const { node, context, res } = setup({
			webhookName: 'ep:0',
			method: 'POST',
			endpoints: validated,
			options: {
				validateRequests: true,
				validationErrorsToFallback: true,
				fallbackOutput: true,
			},
			body: {},
		});

		const result = await node.webhook(context);

		expect(res.writeHead).not.toHaveBeenCalled();
		expect(result.workflowData?.[1]?.[0].json).toMatchObject({
			validationErrors: [{ path: '/', message: "must have required property 'sku'" }],
		});
	});
});

describe('openapi.json', () => {
	it('answers the spec itself without running the workflow', async () => {
		const { node, context } = setup({
			webhookName: 'spec',
			options: { serveSpec: true, specTitle: 'Shop API', specVersion: '2.0.0' },
		});

		const result = await node.webhook(context);

		expect(result.workflowData).toBeUndefined();
		expect(result.webhookResponse).toMatchObject({
			openapi: '3.1.0',
			info: { title: 'Shop API', version: '2.0.0' },
			servers: [{ url: 'https://n8n.test/webhook/shop' }],
			paths: {
				'/orders': { get: {}, post: {} },
				'/orders/{id}': { get: {} },
			},
		});
	});
});

describe('streaming', () => {
	it('writes chunked headers itself', async () => {
		const { node, context, res } = setup({
			webhookName: 'ep:0',
			endpoints: [{ method: 'GET', path: '/orders', options: { responseMode: 'streaming' } }],
		});

		const result = await node.webhook(context);

		expect(res.writeHead).toHaveBeenCalledWith(
			200,
			expect.objectContaining({
				'Transfer-Encoding': 'chunked',
			}),
		);
		expect(result.noWebhookResponse).toBe(true);
		expect(result.workflowData?.[0]).toHaveLength(1);
	});
});
