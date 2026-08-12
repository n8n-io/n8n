import { UserError, jsonParse } from 'n8n-workflow';

import { exportSpec, importSpec, routePathToTemplate, templateToRoutePath } from './openapi';
import type { ApiRouterEndpoint } from './types';

const spec = {
	openapi: '3.0.3',
	info: { title: 'Shop', version: '2.1.0' },
	paths: {
		'/orders': {
			get: { operationId: 'listOrders' },
			post: {
				summary: 'Create an order',
				requestBody: {
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['sku'],
								properties: { sku: { type: 'string' } },
							},
						},
					},
				},
			},
		},
		'/orders/{orderId}': {
			get: { operationId: 'getOrder' },
			delete: {},
			parameters: [{ name: 'orderId', in: 'path' }],
		},
	},
};

describe('templateToRoutePath', () => {
	test.each([
		['/orders/{orderId}', '/orders/:orderId'],
		['/orders/{a}/items/{b}', '/orders/:a/items/:b'],
		['orders', '/orders'],
		['/orders/', '/orders'],
	])('%s -> %s', (template, route) => {
		expect(templateToRoutePath(template)).toBe(route);
	});
});

describe('routePathToTemplate', () => {
	test.each([
		['/orders/:orderId', '/orders/{orderId}'],
		['/orders/:a/items/:b', '/orders/{a}/items/{b}'],
		['orders/', '/orders'],
	])('%s -> %s', (route, template) => {
		expect(routePathToTemplate(route)).toBe(template);
	});
});

describe('importSpec', () => {
	it('maps every operation to an endpoint', () => {
		const { endpoints } = importSpec(spec);

		expect(endpoints).toEqual([
			expect.objectContaining({
				method: 'GET',
				path: '/orders',
				options: expect.objectContaining({ name: 'listOrders' }),
			}),
			expect.objectContaining({
				method: 'POST',
				path: '/orders',
				options: expect.objectContaining({ name: 'Create an order' }),
			}),
			expect.objectContaining({
				method: 'GET',
				path: '/orders/:orderId',
				options: expect.objectContaining({ name: 'getOrder' }),
			}),
			expect.objectContaining({ method: 'DELETE', path: '/orders/:orderId', options: {} }),
		]);
	});

	it('imports the JSON request body schema', () => {
		const { endpoints } = importSpec(spec);
		const post = endpoints.find((e) => e.method === 'POST');

		expect(jsonParse(post!.options!.requestSchema!)).toEqual({
			type: 'object',
			required: ['sku'],
			properties: { sku: { type: 'string' } },
		});
	});

	it('accepts a JSON string', () => {
		expect(importSpec(JSON.stringify(spec)).endpoints).toHaveLength(4);
	});

	it('rejects a string that is not JSON', () => {
		expect(() => importSpec('openapi: 3.0.0')).toThrow(UserError);
	});

	it('rejects a document without paths', () => {
		expect(() => importSpec({ openapi: '3.0.0' })).toThrow(UserError);
	});

	it('warns about a non-3.x document', () => {
		const { warnings } = importSpec({ swagger: '2.0', paths: { '/a': { get: {} } } });

		expect(warnings).toContainEqual(expect.stringContaining('OpenAPI 3.x'));
	});

	it('warns and skips a $ref request body', () => {
		const { endpoints, warnings } = importSpec({
			openapi: '3.1.0',
			paths: { '/a': { post: { requestBody: { $ref: '#/components/requestBodies/A' } } } },
		});

		expect(endpoints[0].options?.requestSchema).toBeUndefined();
		expect(warnings).toContainEqual(expect.stringContaining('references are not resolved'));
	});

	it('warns about a non-JSON request body', () => {
		const { warnings } = importSpec({
			openapi: '3.1.0',
			paths: { '/a': { post: { requestBody: { content: { 'text/csv': {} } } } } },
		});

		expect(warnings).toContainEqual(expect.stringContaining('text/csv'));
	});

	it('ignores keys that are not operations', () => {
		const { endpoints } = importSpec(spec);

		expect(endpoints.map((e) => e.method)).not.toContain('PARAMETERS');
	});

	it('warns when nothing could be imported', () => {
		const { endpoints, warnings } = importSpec({ openapi: '3.1.0', paths: {} });

		expect(endpoints).toEqual([]);
		expect(warnings).toContainEqual(expect.stringContaining('No importable operations'));
	});
});

describe('exportSpec', () => {
	const endpoints: ApiRouterEndpoint[] = [
		{ method: 'GET', path: '/orders', options: { name: 'listOrders' } },
		{
			method: 'POST',
			path: '/orders',
			options: { requestSchema: JSON.stringify({ type: 'object' }) },
		},
		{ method: 'GET', path: '/orders/:orderId', options: { name: 'getOrder' } },
	];

	it('groups operations by templated path', () => {
		const document = exportSpec({ endpoints });

		expect(Object.keys(document.paths)).toEqual(['/orders', '/orders/{orderId}']);
		expect(Object.keys(document.paths['/orders'])).toEqual(['get', 'post']);
	});

	it('emits a 3.1 document with the configured info', () => {
		const document = exportSpec({ endpoints, title: 'Shop API', version: '2.0.0' });

		expect(document.openapi).toBe('3.1.0');
		expect(document.info).toEqual({ title: 'Shop API', version: '2.0.0' });
	});

	it('falls back to a default title and version', () => {
		expect(exportSpec({ endpoints: [] }).info).toEqual({
			title: 'n8n API Router',
			version: '1.0.0',
		});
	});

	it('declares path parameters', () => {
		const document = exportSpec({ endpoints });

		expect(document.paths['/orders/{orderId}'].get.parameters).toEqual([
			{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
		]);
	});

	it('carries the request schema into a JSON request body', () => {
		const document = exportSpec({ endpoints });

		expect(document.paths['/orders'].post.requestBody).toEqual({
			required: true,
			content: { 'application/json': { schema: { type: 'object' } } },
		});
	});

	it('omits a request body for an unparseable schema', () => {
		const document = exportSpec({
			endpoints: [{ method: 'POST', path: '/a', options: { requestSchema: '{ broken' } }],
		});

		expect(document.paths['/a'].post.requestBody).toBeUndefined();
	});

	it('includes the server url when given', () => {
		const document = exportSpec({ endpoints: [], serverUrl: 'https://n8n.test/webhook/shop' });

		expect(document.servers).toEqual([{ url: 'https://n8n.test/webhook/shop' }]);
	});

	it('round-trips an imported spec', () => {
		const imported = importSpec(spec);
		const exported = exportSpec({ endpoints: imported.endpoints });

		expect(Object.keys(exported.paths)).toEqual(['/orders', '/orders/{orderId}']);
		expect(importSpec(exported).endpoints.map((e) => `${e.method} ${e.path}`)).toEqual(
			imported.endpoints.map((e) => `${e.method} ${e.path}`),
		);
	});
});
