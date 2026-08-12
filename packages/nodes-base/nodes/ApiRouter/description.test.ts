import type { IDataObject, INodeParameters, INodeType, INodeTypes } from 'n8n-workflow';
import { WEBHOOK_RESOLVERS, Workflow, webhookDescriptionIsNativelyResolvable } from 'n8n-workflow';

import { ApiRouter } from './ApiRouter.node';
import { apiRouterWebhookDescription, configuredOutputs, configuredRoutes } from './description';
import type { ApiRouterParameters } from './types';

const apiRouterNode = new ApiRouter();

const nodeTypes: INodeTypes = {
	getByName: () => apiRouterNode as unknown as INodeType,
	getByNameAndVersion: () => apiRouterNode as unknown as INodeType,
	getKnownTypes: () => ({}) as IDataObject,
};

const nodeWithParameters = (parameters: INodeParameters) => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'API Router',
				type: 'n8n-nodes-base.apiRouter',
				typeVersion: 1,
				id: 'api-router-1',
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: true,
		nodeTypes,
	});

	return { workflow, node: workflow.getNode('API Router')! };
};

const shop: ApiRouterParameters = {
	basePath: 'shop',
	endpoints: {
		endpoint: [
			{ method: 'GET', path: '/orders' },
			{ method: 'POST', path: '/orders', name: 'Create order', responseMode: 'responseNode' },
			{ method: 'GET', path: '/orders/:id', responseMode: 'inherit' },
		],
	},
};

describe('configuredOutputs', () => {
	it('labels one output per endpoint', () => {
		expect(configuredOutputs(shop)).toEqual([
			{ type: 'main', displayName: 'GET /orders' },
			{ type: 'main', displayName: 'Create order' },
			{ type: 'main', displayName: 'GET /orders/:id' },
		]);
	});

	it('appends a Fallback output when enabled', () => {
		expect(configuredOutputs({ ...shop, options: { fallbackOutput: true } })).toHaveLength(4);
		expect(configuredOutputs({ ...shop, options: { fallbackOutput: true } }).at(-1)).toEqual({
			type: 'main',
			displayName: 'Fallback',
		});
	});

	it('always produces at least one output', () => {
		expect(configuredOutputs({})).toEqual([{ type: 'main', displayName: 'No endpoints' }]);
	});
});

describe('configuredRoutes', () => {
	it('registers one namespaced route per endpoint', () => {
		expect(configuredRoutes(shop)).toEqual([
			{ name: 'ep:0', path: 'shop/orders', httpMethod: 'GET' },
			{ name: 'ep:1', path: 'shop/orders', httpMethod: 'POST', responseMode: 'responseNode' },
			{ name: 'ep:2', path: 'shop/orders/:id', httpMethod: 'GET' },
		]);
	});

	it('omits the namespace when there is no base path and no webhook id', () => {
		expect(configuredRoutes({ endpoints: shop.endpoints })[0]).toEqual({
			name: 'ep:0',
			path: 'orders',
			httpMethod: 'GET',
		});
	});

	it('uses the node webhook id as the namespace when the base path is empty', () => {
		expect(configuredRoutes({ ...shop, basePath: '', __webhookId: 'abc-123' })[0]).toEqual({
			name: 'ep:0',
			path: 'abc-123/orders',
			httpMethod: 'GET',
		});
	});

	it('accepts a multi-segment base path', () => {
		expect(configuredRoutes({ ...shop, basePath: '/billing/v2/' })[0].path).toBe(
			'billing/v2/orders',
		);
	});

	it('registers the spec route only when serving the spec', () => {
		expect(configuredRoutes(shop).map((route) => route.name)).not.toContain('spec');
		expect(configuredRoutes({ ...shop, options: { serveSpec: true } })).toContainEqual({
			name: 'spec',
			path: 'shop/openapi.json',
			httpMethod: 'GET',
			responseMode: 'onReceived',
		});
	});

	it('claims the whole subtree with depth-bucketed catch-alls when the fallback is on', () => {
		const routes = configuredRoutes({ ...shop, options: { fallbackOutput: true } });
		const catchAlls = routes.filter((route) => route.name.startsWith('catchall:'));

		expect(catchAlls).toHaveLength(7);
		expect(catchAlls[0]).toEqual({
			name: 'catchall:0',
			path: 'shop',
			httpMethod: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'],
		});
		expect(catchAlls.at(-1)?.path).toBe('shop/:s1/:s2/:s3/:s4/:s5/:s6');
	});

	it('honours a custom catch-all depth', () => {
		const routes = configuredRoutes({
			...shop,
			options: { fallbackOutput: true, catchAllDepth: 2 },
		});

		expect(routes.filter((route) => route.name.startsWith('catchall:'))).toHaveLength(3);
	});

	it('registers nothing when there are no endpoints', () => {
		expect(configuredRoutes({ basePath: 'shop' })).toEqual([]);
	});
});

// Pins what lets the webhook layer resolve this description without the expression
// engine: every field declares a native resolver, and each resolver returns exactly
// what its generated template returns through the engine.
describe('apiRouterWebhookDescription', () => {
	it('is fully resolvable without the expression engine', () => {
		expect(webhookDescriptionIsNativelyResolvable(apiRouterWebhookDescription)).toBe(true);
	});

	it('derives the routing namespace from the base path', () => {
		expect(apiRouterWebhookDescription.namespace).toBe('={{$parameter["basePath"]}}');
	});

	it('inlines the routes function source', () => {
		expect(apiRouterWebhookDescription.routes).toMatch(/^=\{\{\(.+\)\(\$parameter\)\}\}$/s);
	});

	describe('resolvers match their templates', () => {
		const parameterSets: Array<{ case: string; parameters: INodeParameters }> = [
			{ case: 'defaults only', parameters: {} },
			{ case: 'a namespaced static api', parameters: { ...shop } },
			{
				case: 'with a fallback output',
				parameters: { ...shop, options: { fallbackOutput: true } },
			},
			{
				case: 'with a custom catch-all depth',
				parameters: { ...shop, options: { fallbackOutput: true, catchAllDepth: 2 } },
			},
			{ case: 'serving the spec', parameters: { ...shop, options: { serveSpec: true } } },
			{ case: 'no base path', parameters: { ...shop, basePath: '' } },
			{
				case: 'explicit response options',
				parameters: {
					...shop,
					responseMode: 'lastNode',
					options: { responseCode: 201, responseData: 'allEntries' },
				},
			},
		];

		const resolvers = apiRouterWebhookDescription[WEBHOOK_RESOLVERS]!;

		describe.each(parameterSets)('$case', ({ parameters }) => {
			const { workflow, node } = nodeWithParameters(parameters);

			test.each(Object.keys(resolvers))('%s', (field) => {
				const native = resolvers[field].resolve(node.parameters);

				const viaEngine = workflow.expression.getSimpleParameterValue(
					node,
					apiRouterWebhookDescription[field] as string,
					'internal',
					{},
				);

				expect(native).toEqual(viaEngine);
			});
		});
	});
});
