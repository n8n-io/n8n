import type { INodeProperties, IWebhookDescription } from 'n8n-workflow';
import { fromParameter, fromFunction, webhookDescriptionFields } from 'n8n-workflow';

import type { ApiRouterParameters, RouteSpec } from './types';

/**
 * One labelled main output per endpoint, in declaration order, so the fired output
 * index is the endpoint index. Stringified into `outputs`, so it must stay
 * self-contained (see `fromFunction` in n8n-workflow).
 */
export const configuredOutputs = (parameters: ApiRouterParameters) => {
	const endpoints = parameters.endpoints?.endpoint ?? [];

	const outputs = endpoints.map((endpoint, index) => ({
		type: 'main',
		displayName: `${endpoint.method ?? 'GET'} ${endpoint.path ?? ''}`.trim() || `${index}`,
	}));

	if (parameters.options?.fallbackOutput) {
		outputs.push({ type: 'main', displayName: 'Fallback' });
	}

	return outputs.length > 0 ? outputs : [{ type: 'main', displayName: 'No endpoints' }];
};

/**
 * The webhook rows this node claims. Stringified into the `routes` description
 * field, so it must stay self-contained — no imports, no shared constants.
 */
export const configuredRoutes = (parameters: ApiRouterParameters): RouteSpec[] => {
	const trim = (value: string) => value.replace(/^\/+/, '').replace(/\/+$/, '');
	const base = trim(parameters.basePath || parameters.__webhookId || '');
	const join = (suffix: string) => [base, trim(suffix)].filter((part) => part.length > 0).join('/');

	const routes: RouteSpec[] = (parameters.endpoints?.endpoint ?? []).map((endpoint, index) => {
		const responseMode = endpoint.options?.responseMode;

		return {
			name: `ep:${index}`,
			path: join(endpoint.path ?? ''),
			httpMethod: endpoint.method ?? 'GET',
			...(responseMode === undefined || responseMode === 'inherit' ? {} : { responseMode }),
		};
	});

	const options = parameters.options ?? {};

	if (options.serveSpec) {
		routes.push({
			name: 'spec',
			path: join('openapi.json'),
			httpMethod: 'GET',
			responseMode: 'onReceived',
		});
	}

	if (options.fallbackOutput) {
		const allMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];
		const depth = options.catchAllDepth ?? 6;

		routes.push({ name: 'catchall:0', path: base, httpMethod: allMethods });

		for (let d = 1; d <= depth; d++) {
			const wildcards = Array.from({ length: d }, (_, i) => `:s${i + 1}`).join('/');
			routes.push({ name: `catchall:${d}`, path: join(wildcards), httpMethod: allMethods });
		}
	}

	return routes;
};

export const apiRouterWebhookDescription: IWebhookDescription = {
	name: 'default',
	isFullPath: true,
	// Only consulted when `routes` resolves to an empty array.
	httpMethod: 'GET',
	...webhookDescriptionFields({
		namespace: fromParameter('basePath'),
		routes: fromFunction(configuredRoutes),
		path: fromParameter('basePath'),
		responseMode: fromParameter('responseMode', 'auto'),
		responseCode: fromParameter(['options', 'responseCode']),
		responseData: fromParameter(['options', 'responseData']),
	}),
};

const methodOptions = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'].map((method) => ({
	name: method,
	value: method,
}));

const responseModeOptions = [
	{
		name: 'Automatically',
		value: 'auto',
		description:
			"Responds via a 'Respond to Webhook' node when the fired branch has one, otherwise with the last node's data",
	},
	{ name: 'Immediately', value: 'onReceived', description: 'As soon as this node executes' },
	{
		name: 'When Last Node Finishes',
		value: 'lastNode',
		description: 'Returns data of the last-executed node',
	},
	{
		name: "Using 'Respond to Webhook' Node",
		value: 'responseNode',
		description: 'Response defined in that node',
	},
	{
		name: 'Streaming',
		value: 'streaming',
		description: 'Returns data in real time from streaming enabled nodes',
	},
];

export const basePathProperty: INodeProperties = {
	displayName: 'Base Path',
	name: 'basePath',
	type: 'string',
	default: '',
	placeholder: 'e.g. shop',
	description:
		'URL namespace shared by every endpoint. It must be unique across this n8n instance. Leave empty to serve the endpoints under a random, collision-free path instead.',
};

const endpointOptions: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Inherit',
					value: 'inherit',
					description: "Use the node's Authentication setting",
				},
				{ name: 'None', value: 'none', description: 'Leave this endpoint public' },
			],
			default: 'inherit',
			noDataExpression: true,
			description:
				'Whether this endpoint uses the authentication configured on the node. Endpoints cannot use different authentication schemes from each other.',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			placeholder: 'e.g. Get order',
			description:
				'Names this endpoint in error messages, in the route data of each request and as the OpenAPI operation ID. Defaults to the method and path.',
		},
		{
			displayName: 'Request Schema',
			name: 'requestSchema',
			type: 'json',
			default: '',
			description:
				'JSON Schema the request body must satisfy. Only enforced while the "Validate Requests" option is on. Populated automatically by an OpenAPI import.',
		},
		{
			displayName: 'Respond',
			name: 'responseMode',
			type: 'options',
			options: [
				{
					name: 'Inherit',
					value: 'inherit',
					description: "Use the node's Respond setting",
				},
				...responseModeOptions,
			],
			default: 'inherit',
			description: 'When and how to respond to requests on this endpoint',
		},
	],
};

export const endpointsProperty: INodeProperties = {
	displayName: 'Endpoints',
	name: 'endpoints',
	type: 'fixedCollection',
	placeholder: 'Add Endpoint',
	typeOptions: {
		multipleValues: true,
		sortable: true,
		fixedCollection: {
			itemTitle: '={{ $collection.item.value.method }} {{ $collection.item.value.path }}',
		},
	},
	default: { endpoint: [{ method: 'GET', path: '/' }] },
	description: 'The HTTP endpoints this router serves. Each one gets its own output.',
	options: [
		{
			name: 'endpoint',
			displayName: 'Endpoint',
			values: [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					options: methodOptions,
					default: 'GET',
					description: 'The HTTP method to listen to',
				},
				{
					displayName: 'Path',
					name: 'path',
					type: 'string',
					default: '/',
					placeholder: 'e.g. /orders/:orderId',
					description:
						"Path relative to the base path. A segment starting with ':' captures the value at that position, e.g. '/orders/:orderId'.",
				},
				endpointOptions,
			],
		},
	],
};

export const responseModeProperty: INodeProperties = {
	displayName: 'Respond',
	name: 'responseMode',
	type: 'options',
	options: responseModeOptions,
	default: 'auto',
	description: 'When and how to respond to requests, unless an endpoint overrides it',
};

export const optionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			displayName: 'Allowed Origins (CORS)',
			name: 'allowedOrigins',
			type: 'string',
			default: '*',
			description: 'Comma-separated list of URLs allowed for cross-origin non-preflight requests',
		},
		{
			displayName: 'Catch-All Depth',
			name: 'catchAllDepth',
			type: 'number',
			default: 6,
			typeOptions: { minValue: 1, maxValue: 10 },
			displayOptions: { show: { fallbackOutput: [true] } },
			description:
				'How many path segments below the base path reach the Fallback output. Deeper requests are not served by this router at all.',
		},
		{
			displayName: 'Fallback Output',
			name: 'fallbackOutput',
			type: 'boolean',
			default: false,
			description:
				'Whether to add an output that receives requests under the base path that match no endpoint. Without it those requests get a 404 from n8n.',
		},
		{
			displayName: 'Field Name for Binary Data',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			description:
				'The name of the output field to put any binary file data in. Only relevant if binary data is received.',
		},
		{
			displayName: 'IP(s) Allowlist',
			name: 'ipWhitelist',
			type: 'string',
			placeholder: 'e.g. 127.0.0.1, 192.168.1.0/24',
			default: '',
			description:
				'Comma-separated list of allowed IP addresses or CIDR ranges. Leave empty to allow all IPs.',
		},
		{
			displayName: 'OpenAPI Title',
			name: 'specTitle',
			type: 'string',
			default: '',
			placeholder: 'e.g. Shop API',
			displayOptions: { show: { serveSpec: [true] } },
			description: 'Title of the served OpenAPI document',
		},
		{
			displayName: 'OpenAPI Version',
			name: 'specVersion',
			type: 'string',
			default: '1.0.0',
			displayOptions: { show: { serveSpec: [true] } },
			description: 'Version of the served OpenAPI document',
		},
		{
			displayName: 'Raw Body',
			name: 'rawBody',
			type: 'boolean',
			default: false,
			description: 'Whether to return the raw body alongside the parsed one',
		},
		{
			displayName: 'Response Code',
			name: 'responseCode',
			type: 'number',
			default: 200,
			typeOptions: { minValue: 100, maxValue: 599 },
			description: 'The HTTP response code to return on a successful request',
		},
		{
			displayName: 'Response Data',
			name: 'responseData',
			type: 'options',
			options: [
				{
					name: 'All Entries',
					value: 'allEntries',
					description: 'Returns all the entries of the last node. Always returns an array.',
				},
				{
					name: 'First Entry JSON',
					value: 'firstEntryJson',
					description:
						'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
				},
				{
					name: 'First Entry Binary',
					value: 'firstEntryBinary',
					description:
						'Returns the binary data of the first entry of the last node. Always returns a binary file.',
				},
				{ name: 'No Response Body', value: 'noData', description: 'Returns without a body' },
			],
			default: 'firstEntryJson',
			description: 'What data to return when responding with the last node data',
		},
		{
			displayName: 'Send Validation Errors to Fallback Output',
			name: 'validationErrorsToFallback',
			type: 'boolean',
			default: false,
			displayOptions: { show: { validateRequests: [true], fallbackOutput: [true] } },
			description:
				'Whether a request that fails schema validation runs the Fallback branch instead of getting an automatic 400',
		},
		{
			displayName: 'Serve OpenAPI Spec',
			name: 'serveSpec',
			type: 'boolean',
			default: false,
			description:
				'Whether to serve a spec generated from the endpoints, at the "openapi" document under the base path',
		},
		{
			displayName: 'Validate Requests',
			name: 'validateRequests',
			type: 'boolean',
			default: false,
			description:
				'Whether to check request bodies against the Request Schema of the endpoint they hit',
		},
	],
};
