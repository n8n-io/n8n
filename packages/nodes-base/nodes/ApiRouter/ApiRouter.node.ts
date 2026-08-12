import type {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { BINARY_ENCODING, Node } from 'n8n-workflow';

import {
	apiRouterWebhookDescription,
	basePathProperty,
	configuredOutputs,
	endpointsProperty,
	optionsProperty,
	responseModeProperty,
} from './description';
import { exportSpec } from './openapi';
import {
	buildRouteTable,
	matchRoute,
	segmentsFromCatchAll,
	validateConfiguration,
	type CompiledRoute,
	type RouteMatch,
} from './router';
import {
	CATCH_ALL_ROUTE_PREFIX,
	ENDPOINT_ROUTE_PREFIX,
	SPEC_ROUTE_NAME,
	type ApiRouterEndpoint,
	type ApiRouterOptions,
} from './types';
import { authenticationProperty, credentialsProperty } from '../Webhook/description';
import { WebhookAuthorizationError } from '../Webhook/error';
import {
	handleBinaryData,
	handleFormData,
	isIpAllowed,
	validateWebhookAuthentication,
} from '../Webhook/utils';

type PrepareOutput = (data: INodeExecutionData) => INodeExecutionData[][];

export class ApiRouter extends Node {
	authPropertyName = 'authentication';

	description: INodeTypeDescription = {
		displayName: 'API Router',
		icon: 'fa:route',
		iconColor: 'azure',
		name: 'apiRouter',
		group: ['trigger'],
		version: 1,
		description: 'Serves several HTTP endpoints from one trigger, each with its own output',
		eventTriggerDescription: 'Waiting for you to call one of the Test URLs',
		activationMessage: 'You can now make calls to your production API Router URLs.',
		defaults: {
			name: 'API Router',
		},
		// The outputs are derived from `endpoints` at runtime, so a generated type
		// cannot say how many there are or which is which. Connections land on the
		// wrong branch without this.
		builderHint: {
			searchHint:
				'One trigger serving several HTTP endpoints, each on its own output. Output index is the endpoint index in `endpoints.endpoint`, in declaration order; enabling the fallback appends one more output after them.',
			relatedNodes: [
				{
					nodeType: 'n8n-nodes-base.uiBuilder',
					relationHint: 'Serves an interactive app from one endpoint, with the rest as its actions',
				},
			],
			extraTypeDefContent: [
				{
					content: `<patterns>
<pattern title="Endpoint order is output order">
Each entry of \`endpoints.endpoint\` gets one main output, in the order written.
Connect endpoint N to output index N. With \`options.fallbackOutput\` enabled, an
extra "Fallback" output is appended after the last endpoint.

endpoints: { endpoint: [
  { method: 'GET',  path: '/' },        // -> output 0
  { method: 'GET',  path: '/orders' },  // -> output 1
  { method: 'POST', path: '/orders' },  // -> output 2
] }                                     // -> output 3 if fallbackOutput is on

A branch's own output is \`{ route, params, query, body, headers }\`, so a POSTed
body reaches the next node at \`$json.body\`, not \`$json\`.

With the default "Respond: Automatically" a branch answers with its last node's
JSON, so most branches need no Respond to Webhook node at all.
</pattern>
</patterns>`,
				},
			],
		},
		supportsCORS: true,
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"API Routers have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'listen' button, then call one of the test URLs. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Publish the workflow, then call the production URLs. These executions will show up in the executions list, but not in the editor.",
				active:
					'API Routers have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then call one of the test URLs. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can call the production URLs. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				"Once you've finished building your workflow, run it without having to click this button by using the production URLs.",
		},
		inputs: [],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		credentials: credentialsProperty(this.authPropertyName),
		webhooks: [apiRouterWebhookDescription],
		sensitiveOutputFields: ['headers.authorization', 'headers.cookie'],
		properties: [
			basePathProperty,
			endpointsProperty,
			authenticationProperty(this.authPropertyName),
			responseModeProperty,
			optionsProperty,
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const basePath = context.getNodeParameter('basePath', '') as string;
		const endpoints = readEndpoints(context);
		const options = context.getNodeParameter('options', {}) as ApiRouterOptions;

		validateConfiguration(basePath, endpoints);

		const req = context.getRequestObject();
		const resp = context.getResponseObject();

		if (!isIpAllowed(options.ipWhitelist, req.ips, req.ip)) {
			resp.writeHead(403);
			resp.end('IP is not allowed to access this API');
			return { noWebhookResponse: true };
		}

		const webhookName = context.getWebhookName();

		if (webhookName === SPEC_ROUTE_NAME) {
			return {
				webhookResponse: exportSpec({
					endpoints,
					title: options.specTitle,
					version: options.specVersion,
					serverUrl: context.getNodeWebhookUrl('default'),
				}),
			};
		}

		const table = buildRouteTable(endpoints);
		const resolved = resolveRoute(context, table, webhookName);

		if (resolved.type === 'methodNotAllowed') {
			resp.writeHead(405, { Allow: resolved.allow.join(', ') });
			resp.end(JSON.stringify({ error: 'Method Not Allowed', allow: resolved.allow }));
			return { noWebhookResponse: true };
		}

		const fallbackIndex = options.fallbackOutput === true ? endpoints.length : undefined;

		if (resolved.type === 'notFound') {
			if (fallbackIndex === undefined) {
				resp.writeHead(404, { 'Content-Type': 'application/json' });
				resp.end(
					JSON.stringify({
						error: 'Not Found',
						method: req.method,
						path: req.path,
					}),
				);
				return { noWebhookResponse: true };
			}

			return await this.emit(context, {
				outputIndex: fallbackIndex,
				outputCount: endpoints.length + 1,
				route: { name: 'Fallback', method: req.method, path: req.path },
				params: {},
				options,
			});
		}

		const endpoint = endpoints[resolved.route.index];

		if (endpoint.options?.authentication !== 'none') {
			const authError = await this.authenticate(context);
			if (authError !== undefined) return authError;
		}

		if (options.validateRequests === true && endpoint.options?.requestSchema) {
			const { validateRequestBody } = await import('./validation.js');
			const outcome = await validateRequestBody(endpoint.options.requestSchema, req.body);

			if (!outcome.valid) {
				if (options.validationErrorsToFallback === true && fallbackIndex !== undefined) {
					return await this.emit(context, {
						outputIndex: fallbackIndex,
						outputCount: endpoints.length + 1,
						route: routeInfo(resolved.route),
						params: resolved.params,
						options,
						validationErrors: outcome.errors,
					});
				}

				resp.writeHead(400, { 'Content-Type': 'application/json' });
				resp.end(JSON.stringify({ error: 'Bad Request', details: outcome.errors }));
				return { noWebhookResponse: true };
			}
		}

		return await this.emit(context, {
			outputIndex: resolved.route.index,
			outputCount: endpoints.length + (fallbackIndex === undefined ? 0 : 1),
			route: routeInfo(resolved.route),
			params: resolved.params,
			options,
			endpoint,
		});
	}

	private async authenticate(
		context: IWebhookFunctions,
	): Promise<IWebhookResponseData | undefined> {
		try {
			await validateWebhookAuthentication(context, this.authPropertyName);
			return undefined;
		} catch (error) {
			if (error instanceof WebhookAuthorizationError) {
				const resp = context.getResponseObject();
				resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });
				resp.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}
	}

	private async emit(
		context: IWebhookFunctions,
		args: {
			outputIndex: number;
			outputCount: number;
			route: { name: string; method: string; path: string };
			params: Record<string, string>;
			options: ApiRouterOptions;
			endpoint?: ApiRouterEndpoint;
			validationErrors?: Array<{ path: string; message: string }>;
		},
	): Promise<IWebhookResponseData> {
		const req = context.getRequestObject();
		const { options } = args;

		const webhookUrl = endpointUrl(context, args.endpoint?.path);
		const executionMode = context.getMode() === 'manual' ? 'test' : 'production';

		const prepareOutput: PrepareOutput = (data) => {
			data.json = {
				route: args.route,
				params: args.params,
				query: req.query,
				body: data.json.body,
				headers: req.headers,
				webhookUrl,
				executionMode,
				...(args.validationErrors === undefined ? {} : { validationErrors: args.validationErrors }),
			};

			const outputs: INodeExecutionData[][] = Array.from({ length: args.outputCount }, () => []);
			outputs[args.outputIndex] = [data];
			return outputs;
		};

		if (req.contentType === 'multipart/form-data') {
			return await handleFormData(context, prepareOutput);
		}

		if (!req.body && options.rawBody !== true) {
			try {
				return await handleBinaryData(context, prepareOutput);
			} catch {}
		}

		if (options.rawBody === true && !req.rawBody) {
			await req.readRawBody();
		}

		const item: INodeExecutionData = {
			json: { body: req.body as IDataObject },
			binary:
				options.rawBody === true
					? {
							data: {
								data: (req.rawBody ?? '').toString(BINARY_ENCODING),
								mimeType: req.contentType ?? 'application/json',
							},
						}
					: undefined,
		};

		const responseMode = resolveResponseMode(context, args.endpoint);

		if (responseMode === 'streaming') {
			const resp = context.getResponseObject();
			resp.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			resp.flushHeaders();

			return { noWebhookResponse: true, workflowData: prepareOutput(item) };
		}

		return { workflowData: prepareOutput(item) };
	}
}

function readEndpoints(context: IWebhookFunctions): ApiRouterEndpoint[] {
	const collection = context.getNodeParameter('endpoints', {}) as {
		endpoint?: ApiRouterEndpoint[];
	};
	return collection.endpoint ?? [];
}

function routeInfo(route: CompiledRoute) {
	return { name: route.name, method: route.method, path: route.path };
}

function resolveResponseMode(
	context: IWebhookFunctions,
	endpoint: ApiRouterEndpoint | undefined,
): string {
	const responseMode = endpoint?.options?.responseMode;
	if (responseMode !== undefined && responseMode !== 'inherit') {
		return responseMode;
	}
	return context.getNodeParameter('responseMode', 'auto') as string;
}

function endpointUrl(context: IWebhookFunctions, path: string | undefined): string | undefined {
	const baseUrl = context.getNodeWebhookUrl('default');
	if (baseUrl === undefined) return undefined;

	const url =
		context.getMode() === 'manual' ? baseUrl.replace('/webhook/', '/webhook-test/') : baseUrl;
	const suffix = (path ?? '').replace(/^\/+/, '').replace(/\/+$/, '');

	return suffix.length === 0 ? url : `${url.replace(/\/+$/, '')}/${suffix}`;
}

/**
 * The platform names each registered route, so an exact endpoint is known without
 * looking at the URL. Only catch-all rows need matching, and only to tell a 404
 * from a 405.
 */
function resolveRoute(
	context: IWebhookFunctions,
	table: CompiledRoute[],
	webhookName: string,
): RouteMatch {
	if (webhookName.startsWith(ENDPOINT_ROUTE_PREFIX)) {
		const index = Number(webhookName.slice(ENDPOINT_ROUTE_PREFIX.length));
		const route = table[index];
		if (route !== undefined) {
			return { type: 'matched', route, params: stringParams(context.getParamsData()) };
		}
	}

	const segments = webhookName.startsWith(CATCH_ALL_ROUTE_PREFIX)
		? segmentsFromCatchAll(context.getParamsData())
		: [];

	return matchRoute(table, context.getRequestObject().method, segments);
}

function stringParams(params: object): Record<string, string> {
	return Object.fromEntries(
		Object.entries(params).flatMap(([key, value]) =>
			typeof value === 'string' ? [[key, value] as const] : [],
		),
	);
}
