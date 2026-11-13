import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@test/utils';
import type { Request, Response } from 'express';
import { createHmac } from 'node:crypto';
import type {
	DeclarativeWebhookVerification,
	IDataObject,
	IDeclarativeWebhookTrigger,
	IHttpRequestOptions,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createDeclarativeWebhook, createDeclarativeWebhookMethods } from '../declarative-webhook';
import { HookContext, WebhookContext } from '../node-execution-context';

const httpRequest = vi.fn<(options: IHttpRequestOptions) => Promise<unknown>>();

vi.mock('../node-execution-context/utils/request-helper-functions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getRequestHelperFunctions: () => ({ httpRequest }),
}));

const makeNodeType = (trigger: IDeclarativeWebhookTrigger): INodeType => ({
	description: {
		displayName: 'Test Webhook',
		name: 'testWebhook',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		// The Workflow constructor drops parameters that no property declares.
		properties: [{ displayName: 'Event', name: 'event', type: 'string', default: '' }],
		webhooks: [
			{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
		],
		requestDefaults: { baseURL: 'https://api.example.com' },
		trigger,
	},
});

const listRouting = {
	request: { method: 'GET' as const, url: '/hooks' },
	output: {
		postReceive: [{ type: 'rootProperty' as const, properties: { property: 'hooks' } }],
	},
};

const registryTrigger: IDeclarativeWebhookTrigger = {
	type: 'webhook',
	lifecycle: {
		checkExists: {
			routing: listRouting,
			matchOn: [{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' }],
			store: { webhookId: '={{ $hook.id }}' },
		},
		create: {
			routing: {
				request: { method: 'POST', url: '/hooks', body: { target_url: '={{ $webhookUrl }}' } },
			},
			store: { webhookId: '={{ $response.id }}' },
		},
		delete: {
			routing: {
				request: { method: 'DELETE', url: '={{ "/hooks/" + $staticData.webhookId }}' },
			},
		},
	},
};

const byIdTrigger: IDeclarativeWebhookTrigger = {
	...registryTrigger,
	lifecycle: {
		...registryTrigger.lifecycle,
		checkExists: {
			routing: { request: { method: 'GET', url: '={{ "/hooks/" + $staticData.webhookId }}' } },
		},
	},
};

const logger = mockInstance(Logger);

function setup(
	trigger: IDeclarativeWebhookTrigger,
	parameters: INodeParameters = {},
	{ isTest = false, baseUrl = 'http://localhost:5678' } = {},
) {
	const nodeType = makeNodeType(trigger);
	const node: INode = {
		id: 'n1',
		name: 'Hook',
		type: 'testWebhook',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
	const nodeTypes = mock<INodeTypes>({ getByNameAndVersion: () => nodeType });
	const workflow = new Workflow({
		id: 'w1',
		nodes: [node],
		connections: {},
		active: true,
		nodeTypes,
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: 'e1',
		webhookBaseUrl: `${baseUrl}/webhook`,
		webhookTestBaseUrl: `${baseUrl}/webhook-test`,
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
	});
	const context = isTest
		? new HookContext(workflow, node, additionalData, 'manual', 'manual', {
				isTest: true,
			} as IWebhookData)
		: new HookContext(workflow, node, additionalData, 'trigger', 'init');
	const methods = createDeclarativeWebhookMethods(nodeType, trigger);
	return {
		webhookUrl: context.getNodeWebhookUrl('default'),
		checkExists: async () => await methods.checkExists.call(context),
		create: async () => await methods.create.call(context),
		delete: async () => await methods.delete.call(context),
		staticData: () => workflow.getStaticData('node', node),
		logger,
	};
}

const mockResponse = () => {
	const res = mock<Response>();
	res.status.mockReturnValue(res);
	return res;
};

const respond = (body: unknown) =>
	httpRequest.mockResolvedValueOnce({ body, headers: {}, statusCode: 200 });

const respondError = (status: number) =>
	httpRequest.mockRejectedValueOnce({
		isAxiosError: true,
		response: { status },
		message: `status ${status}`,
	});

beforeEach(() => {
	httpRequest.mockReset();
	vi.clearAllMocks();
});

describe('createDeclarativeWebhookMethods', () => {
	describe('checkExists with matchOn', () => {
		test('returns false when no hook matches', async () => {
			const { checkExists, staticData } = setup(registryTrigger);
			respond({ hooks: [{ id: 7, target_url: 'https://elsewhere.example.com' }] });

			expect(await checkExists()).toBe(false);
			expect(staticData().webhookId).toBeUndefined();
		});

		test('returns true and stores values from the matched hook', async () => {
			const { checkExists, staticData, webhookUrl } = setup(registryTrigger);
			respond({
				hooks: [
					{ id: 5, target_url: 'other' },
					{ id: 7, target_url: webhookUrl },
				],
			});

			expect(await checkExists()).toBe(true);
			expect(staticData().webhookId).toBe(7);
		});

		test('needs every clause to match', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					checkExists: {
						routing: listRouting,
						matchOn: [
							{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' },
							{ itemProperty: 'event', value: '={{ $parameter.event }}' },
						],
					},
				},
			};
			const { checkExists, webhookUrl } = setup(trigger, { event: 'created' });

			respond({ hooks: [{ target_url: webhookUrl, event: 'deleted' }] });
			expect(await checkExists()).toBe(false);

			respond({ hooks: [{ target_url: webhookUrl, event: 'created' }] });
			expect(await checkExists()).toBe(true);
		});

		test('compares with the test URL in a manual run', async () => {
			const { checkExists, webhookUrl } = setup(registryTrigger, {}, { isTest: true });
			respond({ hooks: [{ id: 7, target_url: webhookUrl }] });

			expect(webhookUrl).toContain('/webhook-test/');
			expect(await checkExists()).toBe(true);
		});

		test('can compare a hook with itself through $hook', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					checkExists: {
						routing: listRouting,
						matchOn: [{ itemProperty: 'id', value: '={{ $hook.config.id }}' }],
					},
				},
			};
			const { checkExists } = setup(trigger);
			respond({ hooks: [{ id: 3, config: { id: 3 } }] });

			expect(await checkExists()).toBe(true);
		});
	});

	describe('checkExists by ID', () => {
		test('returns false without a request when there is no ID', async () => {
			const { checkExists } = setup(byIdTrigger);

			expect(await checkExists()).toBe(false);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('returns true when the request succeeds', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			staticData().webhookId = 7;
			respond({ id: 7 });

			expect(await checkExists()).toBe(true);
			expect(httpRequest.mock.lastCall?.[0].url).toBe('/hooks/7');
		});

		test('clears the managed keys and returns false on 404', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			Object.assign(staticData(), { webhookId: 7, keep: 'me' });
			respondError(404);

			expect(await checkExists()).toBe(false);
			expect(staticData()).toEqual({ keep: 'me' });
		});

		test('uses notFoundHttpCodes', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...byIdTrigger,
				lifecycle: {
					...byIdTrigger.lifecycle,
					checkExists: {
						routing: { request: { method: 'GET', url: '/hooks/x' } },
						notFoundHttpCodes: [410],
					},
				},
			};
			const { checkExists, staticData } = setup(trigger);
			staticData().webhookId = 7;

			respondError(404);
			await expect(checkExists()).rejects.toThrow();
			expect(staticData().webhookId).toBe(7);

			respondError(410);
			expect(await checkExists()).toBe(false);
			expect(staticData().webhookId).toBeUndefined();
		});

		test('rethrows other errors and keeps the static data', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			staticData().webhookId = 7;
			respondError(500);

			await expect(checkExists()).rejects.toThrow();
			expect(staticData().webhookId).toBe(7);
		});

		test('uses idKey', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...byIdTrigger,
				lifecycle: {
					...byIdTrigger.lifecycle,
					checkExists: {
						routing: { request: { method: 'GET', url: '/hooks/x' } },
						idKey: 'hookId',
					},
				},
			};
			const { checkExists, staticData } = setup(trigger);
			staticData().webhookId = 7;
			expect(await checkExists()).toBe(false);

			staticData().hookId = 7;
			respond({});
			expect(await checkExists()).toBe(true);
		});

		test.each([
			['missing', undefined],
			['empty', ''],
		])(
			'deletes the stored hook and returns false when a required key is %s',
			async (_label, secret) => {
				const trigger: IDeclarativeWebhookTrigger = {
					...byIdTrigger,
					lifecycle: {
						...byIdTrigger.lifecycle,
						checkExists: {
							routing: { request: { method: 'GET', url: '/hooks/x' } },
							requireKeys: ['webhookSecret'],
						},
					},
				};
				const { checkExists, staticData } = setup(trigger);
				Object.assign(staticData(), { webhookId: 7, webhookSecret: secret });
				respond({});

				expect(await checkExists()).toBe(false);
				expect(httpRequest).toHaveBeenCalledTimes(1);
				expect(httpRequest.mock.lastCall?.[0]).toMatchObject({ method: 'DELETE', url: '/hooks/7' });
				expect(staticData().webhookId).toBeUndefined();
			},
		);

		test('checks requireKeys before matchOn', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					checkExists: {
						routing: listRouting,
						matchOn: [{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' }],
						requireKeys: ['webhookSecret'],
					},
				},
			};
			const { checkExists } = setup(trigger);

			expect(await checkExists()).toBe(false);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('clears managedKeys when create is a function', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...byIdTrigger,
				lifecycle: { ...byIdTrigger.lifecycle, create: async () => true },
				managedKeys: ['webhookId', 'webhookSecret'],
			};
			const { checkExists, staticData } = setup(trigger);
			Object.assign(staticData(), { webhookId: 7, webhookSecret: 's', keep: 'me' });
			respondError(404);

			expect(await checkExists()).toBe(false);
			expect(staticData()).toEqual({ keep: 'me' });
		});
	});

	describe('create', () => {
		test('sends the webhook URL and stores values from the response', async () => {
			const { create, staticData, webhookUrl } = setup(registryTrigger);
			respond({ id: 42 });

			expect(await create()).toBe(true);
			expect(staticData().webhookId).toBe(42);
			expect(httpRequest.mock.lastCall?.[0].body).toEqual({ target_url: webhookUrl });
		});

		test('resolves lifecycle values in one pass', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						store: { webhookId: '={{ $response.id }}', hook: '={{ $response }}' },
					},
				},
			};
			const { create, staticData } = setup(trigger);
			respond({ id: '={{ 1 + 1 }}', nested: { value: '={{ 2 + 2 }}' } });

			expect(await create()).toBe(true);
			expect(staticData().webhookId).toBe('={{ 1 + 1 }}');
			expect(staticData().hook).toEqual({
				id: '={{ 1 + 1 }}',
				nested: { value: '={{ 2 + 2 }}' },
			});
		});

		test('rethrows a failed request and keeps the static data', async () => {
			const { create, staticData } = setup(registryTrigger);
			staticData().keep = 'me';
			respondError(500);

			await expect(create()).rejects.toThrow();
			expect(staticData()).toEqual({ keep: 'me' });
		});

		test.each(['http://localhost:5678', 'http://127.0.0.1:5678', 'http://[::1]:5678'])(
			'rejectLocalhostUrl refuses %s without a request',
			async (host) => {
				const trigger: IDeclarativeWebhookTrigger = {
					type: 'webhook',
					lifecycle: {
						create: {
							routing: { request: { method: 'POST', url: '/hooks' } },
							rejectLocalhostUrl: true,
						},
					},
				};
				const { create } = setup(trigger, {}, { baseUrl: host });

				await expect(create()).rejects.toThrow('localhost');
				expect(httpRequest).not.toHaveBeenCalled();
			},
		);

		test('rejectLocalhostUrl accepts a host name that only starts with localhost', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						rejectLocalhostUrl: true,
					},
				},
			};
			const { create } = setup(trigger, {}, { baseUrl: 'https://localhost.example.com' });
			respond({});

			expect(await create()).toBe(true);
		});

		test.each([0, 1.5])('rejects a generate length of %s without a request', async (length) => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						generate: { secret: { type: 'hex', length } },
					},
				},
			};
			const { create } = setup(trigger);

			await expect(create()).rejects.toThrow('must be a whole number of 1 or more');
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('validateResponse fails on an unexpected response', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						validateResponse: '={{ $response.active === true }}',
						store: { webhookId: '={{ $response.id }}' },
					},
				},
			};

			const failing = setup(trigger);
			respond({ id: 7, active: false });
			await expect(failing.create()).rejects.toThrow('expected data');
			expect(failing.staticData().webhookId).toBe(7);

			const passing = setup(trigger);
			respond({ id: 7, active: true });
			expect(await passing.create()).toBe(true);
			expect(passing.staticData().webhookId).toBe(7);
		});

		test('deletes the new hook and lists only the response keys when validateResponse fails', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						validateResponse: '={{ $response.active === true }}',
						store: { webhookId: '={{ $response.id }}' },
					},
				},
			};
			const { create, staticData } = setup(trigger);
			respond({ id: 7, active: false, secret: 'value' });
			respond({});

			const error = await create().catch((e: unknown) => e);
			expect(error).toMatchObject({ description: 'Response keys: id, active, secret' });
			expect(httpRequest.mock.lastCall?.[0]).toMatchObject({ method: 'DELETE', url: '/hooks/7' });
			expect(staticData().webhookId).toBeUndefined();
		});

		test('fails and deletes the new hook when a store value is undefined', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						store: { webhookId: '={{ $response.id }}', webhookSecret: '={{ $response.secret }}' },
					},
				},
			};
			const { create, staticData } = setup(trigger);
			respond({ id: 7 });
			respond({});

			await expect(create()).rejects.toThrow('expected data');
			expect(httpRequest.mock.lastCall?.[0]).toMatchObject({ method: 'DELETE', url: '/hooks/7' });
			expect(staticData()).toEqual({});
		});

		test('generate makes values for the request and store', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: {
							request: {
								method: 'POST',
								url: '/hooks',
								body: {
									hex: '={{ $generated.hex }}',
									alnum: '={{ $generated.alnum }}',
									uuid: '={{ $generated.uuid }}',
								},
							},
						},
						generate: {
							hex: { type: 'hex', length: 16 },
							alnum: { type: 'alphanumericLower', prefix: 'n8n-' },
							uuid: { type: 'uuid' },
						},
						store: { webhookSecret: '={{ $generated.hex }}' },
					},
				},
			};
			const { create, staticData } = setup(trigger);
			respond({});

			expect(await create()).toBe(true);
			const sent = httpRequest.mock.lastCall?.[0].body as IDataObject;
			expect(sent.hex).toMatch(/^[0-9a-f]{32}$/);
			expect(sent.alnum).toMatch(/^n8n-[a-z0-9]{10}$/);
			expect(sent.uuid).toMatch(/^[0-9a-f-]{36}$/);
			expect(staticData().webhookSecret).toBe(sent.hex);
		});
	});

	describe('delete', () => {
		test('returns true without a request when there is no ID', async () => {
			const { delete: del } = setup(registryTrigger);

			expect(await del()).toBe(true);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('clears the managed keys on success', async () => {
			const { delete: del, staticData } = setup(registryTrigger);
			Object.assign(staticData(), { webhookId: 42, keep: 'me' });
			respond({});

			expect(await del()).toBe(true);
			expect(staticData()).toEqual({ keep: 'me' });
			expect(httpRequest.mock.lastCall?.[0].url).toBe('/hooks/42');
		});

		test('returns false and keeps the static data when the request fails', async () => {
			const { delete: del, staticData, logger } = setup(registryTrigger);
			staticData().webhookId = 42;
			respondError(500);

			expect(await del()).toBe(false);
			expect(staticData().webhookId).toBe(42);
			expect(logger.warn).toHaveBeenCalledWith(
				'Could not deregister the webhook of node "Hook"',
				expect.objectContaining({ workflowId: 'w1' }),
			);
		});

		test('clears managedKeys instead of the create.store keys', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				managedKeys: ['webhookId', 'webhookSecret'],
			};
			const { delete: del, staticData } = setup(trigger);
			Object.assign(staticData(), { webhookId: 42, webhookSecret: 's', keep: 'me' });
			respond({});

			expect(await del()).toBe(true);
			expect(staticData()).toEqual({ keep: 'me' });
		});
	});

	describe('defaults and functions', () => {
		test('an omitted checkExists deletes the stored hook and registers again', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: registryTrigger.lifecycle.create,
					delete: registryTrigger.lifecycle.delete,
				},
			};
			const { checkExists, staticData } = setup(trigger);
			staticData().webhookId = 42;
			respond({});

			expect(await checkExists()).toBe(false);
			expect(httpRequest.mock.lastCall?.[0]).toMatchObject({ method: 'DELETE', url: '/hooks/42' });
			expect(staticData().webhookId).toBeUndefined();
		});

		test('an omitted checkExists registers again, an omitted delete does nothing', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: { create: registryTrigger.lifecycle.create },
			};
			const { checkExists, delete: del } = setup(trigger);

			expect(await checkExists()).toBe(false);
			expect(await del()).toBe(true);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('an omitted checkExists calls a function delete before it registers again', async () => {
			const del = vi.fn(async () => true);
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: { create: registryTrigger.lifecycle.create, delete: del },
			};
			const { checkExists } = setup(trigger);

			expect(await checkExists()).toBe(false);
			expect(del).toHaveBeenCalledTimes(1);
		});

		test('a failed registration calls a function delete', async () => {
			const del = vi.fn(async () => true);
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						store: { webhookId: '={{ $response.id }}' },
					},
					delete: del,
				},
			};
			const { create } = setup(trigger);
			respond({});

			await expect(create()).rejects.toThrow('does not contain the expected data');
			expect(del).toHaveBeenCalledTimes(1);
		});

		test('uses a function method as it is', async () => {
			const own = vi.fn(async () => true);
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: { checkExists: own, create: own, delete: own },
			};
			const methods = createDeclarativeWebhookMethods(makeNodeType(trigger), trigger);

			expect(methods).toEqual({ checkExists: own, create: own, delete: own });
		});
	});
});

describe('createDeclarativeWebhook', () => {
	function webhookSetup(
		handler: IDeclarativeWebhookTrigger['handler'],
		body: unknown,
		{
			headers = {},
			query = {},
			webhookName = 'default',
			staticData = {},
			res = mockResponse(),
			rawBody,
			unreadBody,
			contentType,
			credentials,
		}: {
			headers?: IDataObject;
			query?: IDataObject;
			webhookName?: string;
			staticData?: IDataObject;
			res?: Response;
			rawBody?: Buffer;
			/** The body that `readRawBody` reads, for a request that the server did not read. */
			unreadBody?: Buffer;
			contentType?: string;
			credentials?: INodeCredentials;
		} = {},
	) {
		const trigger = { ...registryTrigger, handler };
		const node: INode = {
			id: 'n1',
			name: 'Hook',
			type: 'testWebhook',
			typeVersion: 1,
			position: [0, 0],
			parameters: { event: 'created' },
			credentials,
		};
		const nodeType = makeNodeType(trigger);
		const workflow = new Workflow({
			id: 'w1',
			nodes: [node],
			connections: {},
			active: true,
			nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => nodeType }),
			staticData,
		});
		// Set after `mock()`, which would wrap the request data in proxies.
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const request = { body, headers, query, rawBody, contentType } as unknown as Request;
		request.readRawBody = vi.fn(async () => {
			request.rawBody = unreadBody ?? request.rawBody;
		});
		additionalData.httpRequest = request;
		additionalData.httpResponse = res;
		const context = new WebhookContext(
			workflow,
			node,
			additionalData,
			'webhook',
			{ webhookDescription: { name: webhookName } } as IWebhookData,
			[],
			null,
		);
		return async () => await createDeclarativeWebhook(trigger).call(context);
	}

	const eventFilter = {
		allowed: '={{ $parameter.event }}',
		actual: '={{ $webhookRequest.body.event }}',
	};

	test('emits the request body', async () => {
		const run = webhookSetup(undefined, { event: 'created' });

		expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
	});

	test('emits one item for each element of an array body', async () => {
		const run = webhookSetup(undefined, [{ n: 1 }, { n: 2 }]);

		expect(await run()).toEqual({ workflowData: [[{ json: { n: 1 } }, { json: { n: 2 } }]] });
	});

	test('emits body keys such as `json` and `binary` as data', async () => {
		const body = { json: 'x', binary: { file: { data: '' } }, other: 1 };
		const run = webhookSetup(undefined, body);

		expect(await run()).toStrictEqual({ workflowData: [[{ json: body }]] });
	});

	test('starts no workflow for an empty array body', async () => {
		expect(await webhookSetup(undefined, [])()).toStrictEqual({});
	});

	describe('a +json body', () => {
		const json = Buffer.from('{ "event": "created" }');

		test('is parsed when the server did not read it', async () => {
			const run = webhookSetup({ filter: eventFilter }, undefined, {
				contentType: 'application/vnd.api+json',
				unreadBody: json,
			});

			expect(await run()).toStrictEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('is parsed when the server read it but did not parse it', async () => {
			const run = webhookSetup(undefined, undefined, {
				contentType: 'application/cloudevents+json',
				rawBody: json,
			});

			expect(await run()).toStrictEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('that does not parse starts no workflow', async () => {
			const run = webhookSetup(undefined, undefined, {
				contentType: 'application/vnd.api+json',
				unreadBody: Buffer.from('not json'),
			});

			expect(await run()).toStrictEqual({});
		});

		test('is the only unparsed type that is read', async () => {
			const run = webhookSetup(undefined, undefined, {
				contentType: 'application/octet-stream',
				unreadBody: json,
			});

			expect(await run()).toStrictEqual({});
		});
	});

	test('drops items that are not objects', async () => {
		expect(await webhookSetup(undefined, 'text')()).toStrictEqual({});
		expect(await webhookSetup(undefined, [1, 'a', [2], { n: 1 }])()).toStrictEqual({
			workflowData: [[{ json: { n: 1 } }]],
		});
	});

	test('starts no workflow when rootProperty finds nothing', async () => {
		const run = webhookSetup(
			{ output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] } },
			{ event: 'created' },
		);

		expect(await run()).toStrictEqual({});
	});

	test('includeMeta emits a text body', async () => {
		const run = webhookSetup({ output: { includeMeta: true } }, 'text');

		expect(await run()).toStrictEqual({
			workflowData: [[{ json: { body: 'text', headers: {}, query: {} } }]],
		});
	});

	test('needs a WebhookContext', async () => {
		await expect(
			createDeclarativeWebhook(registryTrigger).call(mock<IWebhookFunctions>()),
		).rejects.toThrow('Declarative webhook trigger needs a WebhookContext');
	});

	describe('ping', () => {
		test('replies OK and starts no workflow', async () => {
			const run = webhookSetup(
				{ ping: { when: '={{ $webhookRequest.body.zen !== undefined }}' } },
				{ zen: 'hi' },
			);

			expect(await run()).toEqual({ webhookResponse: 'OK' });
		});

		test('replies with the resolved response', async () => {
			const run = webhookSetup(
				{ ping: { when: '={{ true }}', response: '={{ $webhookRequest.query.challenge }}' } },
				{},
				{ query: { challenge: 'abc' } },
			);

			expect(await run()).toEqual({ webhookResponse: 'abc' });
		});

		test('emits the body when `when` is falsy', async () => {
			const run = webhookSetup(
				{ ping: { when: '={{ $webhookRequest.headers["x-ping"] === "1" }}' } },
				{ event: 'created' },
			);

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('runs before the filter', async () => {
			const run = webhookSetup(
				{ ping: { when: '={{ $webhookRequest.body.event === "ping" }}' }, filter: eventFilter },
				{ event: 'ping' },
			);

			expect(await run()).toEqual({ webhookResponse: 'OK' });
		});

		test('returns an undefined response, so the server sends its default reply', async () => {
			const run = webhookSetup(
				{ ping: { when: '={{ true }}', response: '={{ $webhookRequest.body.missing }}' } },
				{},
			);

			expect(await run()).toStrictEqual({ webhookResponse: undefined });
		});
	});

	describe('handshake', () => {
		const secretHeader = '={{ $webhookRequest.headers["x-hook-secret"] }}';
		const handshake = { when: '={{ $webhookRequest.headers["x-hook-secret"] !== undefined }}' };

		test('replies OK, starts no workflow and writes no static data', async () => {
			const nodeData: IDataObject = {};
			const run = webhookSetup(
				{ handshake },
				{ event: 'created' },
				{ headers: { 'x-hook-secret': 's1' }, staticData: { 'node:Hook': nodeData } },
			);

			expect(await run()).toStrictEqual({ webhookResponse: 'OK' });
			expect(nodeData).toEqual({});
		});

		test('emits the body when `when` is falsy', async () => {
			const run = webhookSetup({ handshake }, { event: 'created' });

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('does not apply on the default endpoint without `when`', async () => {
			const run = webhookSetup({ handshake: { respond: { body: 'x' } } }, { event: 'created' });

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('runs before the ping', async () => {
			const run = webhookSetup(
				{ handshake, ping: { when: '={{ true }}' } },
				{},
				{ headers: { 'x-hook-secret': 's1' } },
			);

			expect(await run()).toStrictEqual({ webhookResponse: 'OK' });
		});

		test('handles every request on a setup endpoint', async () => {
			const run = webhookSetup(
				{ handshake: { respond: { body: '={{ $webhookRequest.query.challenge }}' } } },
				{ event: 'created' },
				{ query: { challenge: 'abc' }, webhookName: 'setup' },
			);

			expect(await run()).toStrictEqual({ webhookResponse: 'abc' });
		});

		test('replies OK on a setup endpoint without a handshake', async () => {
			const run = webhookSetup(undefined, { event: 'created' }, { webhookName: 'setup' });

			expect(await run()).toStrictEqual({ webhookResponse: 'OK' });
		});

		test('replies 401 on a setup endpoint when `when` is falsy', async () => {
			const res = mockResponse();
			const run = webhookSetup(
				{ handshake: { ...handshake, when: '={{ false }}' } },
				{},
				{ headers: { 'x-hook-secret': 's1' }, webhookName: 'setup', res },
			);

			expect(await run()).toStrictEqual({ noWebhookResponse: true });
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith('Unauthorized');
		});

		describe('respond', () => {
			let res: ReturnType<typeof mockResponse>;
			const handshakeWith = async (respond: object) =>
				await webhookSetup(
					{ handshake: { when: '={{ true }}', respond } },
					{ challenge: 'abc' },
					{ res },
				)();
			beforeEach(() => {
				res = mockResponse();
			});

			test('body returns the resolved value for the server reply', async () => {
				expect(
					await handshakeWith({ body: '={{ $webhookRequest.body.challenge }}' }),
				).toStrictEqual({ webhookResponse: 'abc' });
				expect(res.send).not.toHaveBeenCalled();
			});

			test.each([
				['an object', '={{ { challenge: $webhookRequest.body.challenge } }}', { challenge: 'abc' }],
				['a number', '={{ 2 }}', 2],
				['null', '={{ null }}', null],
				['undefined as an empty string', '={{ $webhookRequest.body.missing }}', ''],
			])('body returns %s', async (_, body, expected) => {
				expect(await handshakeWith({ body })).toStrictEqual({ webhookResponse: expected });
			});

			test('statusCode sends the reply directly', async () => {
				expect(await handshakeWith({ statusCode: 202 })).toStrictEqual({
					noWebhookResponse: true,
				});
				expect(res.status).toHaveBeenCalledWith(202);
				expect(res.send).toHaveBeenCalledWith('OK');
			});

			test('statusCode sends a value that is not a string as JSON', async () => {
				await handshakeWith({ statusCode: 202, body: '={{ { a: 1 } }}' });

				expect(res.json).toHaveBeenCalledWith({ a: 1 });
			});

			test('statusCode sends an empty string for undefined', async () => {
				await handshakeWith({ statusCode: 202, body: '={{ $webhookRequest.body.missing }}' });

				expect(res.send).toHaveBeenCalledWith('');
			});

			test('contentType sets the content type', async () => {
				await handshakeWith({ contentType: 'text/plain' });

				expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain');
			});

			test('contentType wins over a Content-Type in headers', async () => {
				await handshakeWith({
					contentType: 'text/plain',
					headers: { 'Content-Type': 'application/json' },
				});

				expect(res.setHeader).toHaveBeenLastCalledWith('content-type', 'text/plain');
			});

			test('headers sets the resolved headers', async () => {
				await handshakeWith({
					headers: { 'X-Challenge': '={{ $webhookRequest.body.challenge }}' },
				});

				expect(res.setHeader).toHaveBeenCalledWith('X-Challenge', 'abc');
			});

			test('headers sets no header for a missing value and JSON for other values', async () => {
				await handshakeWith({
					headers: { 'X-Missing': '={{ $webhookRequest.body.missing }}', 'X-Count': '={{ 2 }}' },
				});

				expect(res.setHeader).not.toHaveBeenCalledWith('X-Missing', expect.anything());
				expect(res.setHeader).toHaveBeenCalledWith('X-Count', '2');
			});

			test('headers skips a value that is not a valid header value', async () => {
				const run = webhookSetup(
					{
						handshake: {
							when: '={{ true }}',
							respond: { headers: { 'X-Challenge': '={{ $webhookRequest.body.challenge }}' } },
						},
					},
					{ challenge: 'a\r\nX-Other: 1' },
					{ res },
				);

				expect(await run()).toStrictEqual({ webhookResponse: 'OK' });
				expect(res.setHeader).not.toHaveBeenCalledWith('X-Challenge', expect.anything());
			});

			test.each([200, 202])('a string reply is plain text with status %s', async (statusCode) => {
				await handshakeWith({ statusCode, body: '={{ $webhookRequest.body.challenge }}' });

				expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain');
			});

			test('a reply that is not a string sets no content type', async () => {
				await handshakeWith({ body: '={{ { challenge: $webhookRequest.body.challenge } }}' });

				expect(res.setHeader).not.toHaveBeenCalledWith('content-type', expect.anything());
			});

			test('a string reply keeps a Content-Type from headers', async () => {
				res.getHeader.mockReturnValue('application/json');

				await handshakeWith({ headers: { 'Content-Type': 'application/json' } });

				expect(res.setHeader).not.toHaveBeenCalledWith('content-type', 'text/plain');
			});
		});

		test('sends request values in one pass', async () => {
			const run = webhookSetup(
				{ handshake: { ...handshake, respond: { body: secretHeader } } },
				{},
				{ headers: { 'x-hook-secret': '={{ 1 + 1 }}' } },
			);

			expect(await run()).toStrictEqual({ webhookResponse: '={{ 1 + 1 }}' });
		});
	});

	describe('verification', () => {
		const rawBody = Buffer.from('{ "event": "created" }');
		const body = { event: 'created' };
		const hmac = (payload: string | Buffer, secret = 's3cret') =>
			createHmac('sha256', secret).update(payload).digest('hex');
		const now = () => String(Math.floor(Date.now() / 1000));
		const verification: DeclarativeWebhookVerification = {
			algorithm: 'hmac-sha256',
			signatureHeader: 'x-signature',
			secret: '={{ $staticData.secret }}',
			prefix: 'sha256=',
		};

		/** Runs a delivery and returns the result and the response. */
		async function deliver(
			config: Partial<DeclarativeWebhookVerification>,
			headers: IDataObject,
			{
				raw = rawBody,
				nodeData = { secret: 's3cret' },
				handler = {},
				webhookName = 'default',
				credentials,
				unreadBody,
				contentType,
			}: {
				raw?: Buffer | null;
				nodeData?: IDataObject;
				handler?: IDeclarativeWebhookTrigger['handler'];
				webhookName?: string;
				credentials?: INodeCredentials;
				unreadBody?: Buffer;
				contentType?: string;
			} = {},
		) {
			const res = mockResponse();
			const run = webhookSetup({ ...handler, verification: { ...verification, ...config } }, body, {
				headers,
				rawBody: raw ?? undefined,
				staticData: { 'node:Hook': nodeData },
				res,
				webhookName,
				credentials,
				unreadBody,
				contentType,
			});
			return { result: await run(), res };
		}

		const accepted = { workflowData: [[{ json: body }]] };

		async function expectRejected(delivery: ReturnType<typeof deliver>) {
			const { result, res } = await delivery;
			expect(result).toStrictEqual({ noWebhookResponse: true });
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith('Unauthorized');
		}

		test('accepts an HMAC-SHA256 signature of the raw body', async () => {
			const { result } = await deliver({}, { 'x-signature': `sha256=${hmac(rawBody)}` });

			expect(result).toEqual(accepted);
		});

		test('signs the raw bytes, not the parsed body', async () => {
			await expectRejected(deliver({}, { 'x-signature': `sha256=${hmac(JSON.stringify(body))}` }));
		});

		test('rejects a changed body', async () => {
			await expectRejected(
				deliver(
					{},
					{ 'x-signature': `sha256=${hmac(rawBody)}` },
					{ raw: Buffer.from('{ "event": "deleted" }') },
				),
			);
		});

		test('rejects a request without a raw body', async () => {
			await expectRejected(
				deliver({}, { 'x-signature': `sha256=${hmac(rawBody)}` }, { raw: null }),
			);
		});

		test('reads the raw body when the server did not', async () => {
			const { result } = await deliver(
				{},
				{ 'x-signature': `sha256=${hmac(rawBody)}` },
				{ raw: null, unreadBody: rawBody, contentType: 'application/octet-stream' },
			);

			expect(result).toEqual(accepted);
		});

		test('does not read a multipart body', async () => {
			await expectRejected(
				deliver(
					{},
					{ 'x-signature': `sha256=${hmac(rawBody)}` },
					{ raw: null, unreadBody: rawBody, contentType: 'multipart/form-data; boundary=x' },
				),
			);
		});

		test('the secret cannot use request data', async () => {
			await expectRejected(
				deliver(
					{ secret: '={{ $webhookRequest.headers["x-key"] }}' },
					{ 'x-key': 'chosen', 'x-signature': `sha256=${hmac(rawBody, 'chosen')}` },
				),
			);
		});

		test('rejects a request without the signature header', async () => {
			await expectRejected(deliver({}, {}));
		});

		test('rejects a signature of a different length', async () => {
			await expectRejected(deliver({}, { 'x-signature': 'sha256=abc' }));
		});

		test('rejects a signature that has no prefix', async () => {
			await expectRejected(deliver({}, { 'x-signature': hmac(rawBody) }));
		});

		test('rejects a signature with a different secret', async () => {
			await expectRejected(deliver({}, { 'x-signature': `sha256=${hmac(rawBody, 'other')}` }));
		});

		test('accepts an HMAC-SHA1 signature in base64', async () => {
			const signature = createHmac('sha1', 's3cret').update(rawBody).digest('base64');

			const { result } = await deliver(
				{ algorithm: 'hmac-sha1', encoding: 'base64', prefix: undefined },
				{ 'x-signature': signature },
			);

			expect(result).toEqual(accepted);
		});

		test('reads the signature header case-insensitively', async () => {
			const { result } = await deliver(
				{ signatureHeader: 'X-Signature' },
				{ 'x-signature': `sha256=${hmac(rawBody)}` },
			);

			expect(result).toEqual(accepted);
		});

		describe('token', () => {
			const token = { algorithm: 'token' as const, prefix: undefined };

			test('accepts the secret in the header', async () => {
				const { result } = await deliver(token, { 'x-signature': 's3cret' }, { raw: null });

				expect(result).toEqual(accepted);
			});

			test('rejects a different token', async () => {
				await expectRejected(deliver(token, { 'x-signature': 's3creT' }));
			});

			test('rejects a token of a different length', async () => {
				await expectRejected(deliver(token, { 'x-signature': 's3cret-longer' }));
			});

			test('adds the prefix to the secret', async () => {
				const { result } = await deliver(
					{ ...token, prefix: 'Bearer ' },
					{ 'x-signature': 'Bearer s3cret' },
				);

				expect(result).toEqual(accepted);
			});
		});

		describe('signedPayload', () => {
			const template = '=v0:{{ $webhookRequest.headers["x-timestamp"] }}:{body}';

			test('signs the resolved template with the raw body', async () => {
				const timestamp = now();
				const signature = hmac(Buffer.concat([Buffer.from(`v0:${timestamp}:`), rawBody]));

				const { result } = await deliver(
					{ signedPayload: template, timestampHeader: 'x-timestamp' },
					{ 'x-signature': `sha256=${signature}`, 'x-timestamp': timestamp },
				);

				expect(result).toEqual(accepted);
			});

			test('accepts a template without expressions', async () => {
				const signature = hmac(Buffer.concat([rawBody, Buffer.from('.'), rawBody]));

				const { result } = await deliver(
					{ signedPayload: '{body}.{body}' },
					{ 'x-signature': `sha256=${signature}` },
				);

				expect(result).toEqual(accepted);
			});

			test('uses request values as literal text', async () => {
				const raw = Buffer.from('{{ 1 + 1 }}');
				const signature = hmac(Buffer.from('={{ 1 + 1 }}.{{ 1 + 1 }}'));

				const { result } = await deliver(
					{ signedPayload: '={{ $webhookRequest.headers["x-id"] }}.{body}' },
					{ 'x-signature': `sha256=${signature}`, 'x-id': '={{ 1 + 1 }}' },
					{ raw },
				);

				expect(result).toEqual(accepted);
			});

			test('signs a number part as text', async () => {
				const signature = hmac(Buffer.concat([Buffer.from('123.'), rawBody]));

				const { result } = await deliver(
					{ signedPayload: '={{ 120 + 3 }}.{body}' },
					{ 'x-signature': `sha256=${signature}` },
				);

				expect(result).toEqual(accepted);
			});

			test('signs a header value that contains `{body}` as literal text', async () => {
				const signature = hmac(Buffer.concat([Buffer.from('{body}.'), rawBody]));

				const { result } = await deliver(
					{ signedPayload: '={{ $webhookRequest.headers["x-id"] }}.{body}' },
					{ 'x-signature': `sha256=${signature}`, 'x-id': '{body}' },
				);

				expect(result).toEqual(accepted);
			});

			test('rejects a template part that does not resolve to text', async () => {
				await expectRejected(
					deliver(
						{ signedPayload: '={{ $webhookRequest.headers["x-missing"] }}{body}' },
						{ 'x-signature': `sha256=${hmac(rawBody)}` },
					),
				);
			});
		});

		describe('timestamp', () => {
			const signed = (timestamp: string) => ({
				'x-signature': `sha256=${hmac(rawBody)}`,
				'x-timestamp': timestamp,
			});

			test('accepts a current timestamp', async () => {
				const { result } = await deliver({ timestampHeader: 'x-timestamp' }, signed(now()));

				expect(result).toEqual(accepted);
			});

			test('accepts a current timestamp in milliseconds', async () => {
				const { result } = await deliver(
					{ timestampHeader: 'x-timestamp' },
					signed(String(Date.now())),
				);

				expect(result).toEqual(accepted);
			});

			test('rejects a timestamp older than 300 seconds', async () => {
				const old = String(Math.floor(Date.now() / 1000) - 301);

				await expectRejected(deliver({ timestampHeader: 'x-timestamp' }, signed(old)));
			});

			test('rejects a timestamp more than 300 seconds in the future', async () => {
				const future = String(Math.floor(Date.now() / 1000) + 301);

				await expectRejected(deliver({ timestampHeader: 'x-timestamp' }, signed(future)));
			});

			test('uses maxTimestampAgeSeconds', async () => {
				const age = String(Math.floor(Date.now() / 1000) - 30);

				await expectRejected(
					deliver({ timestampHeader: 'x-timestamp', maxTimestampAgeSeconds: 10 }, signed(age)),
				);
			});

			test('rejects a request without the timestamp header', async () => {
				await expectRejected(
					deliver({ timestampHeader: 'x-timestamp' }, { 'x-signature': `sha256=${hmac(rawBody)}` }),
				);
			});

			test('rejects a timestamp that is not a number', async () => {
				await expectRejected(deliver({ timestampHeader: 'x-timestamp' }, signed('abc')));
			});
		});

		describe('no secret', () => {
			test.each([
				['no stored value', {}],
				['an empty stored value', { secret: '' }],
			])('rejects a delivery and logs a warning for %s', async (_, nodeData) => {
				await expectRejected(
					deliver({}, { 'x-signature': `sha256=${hmac(rawBody, '')}` }, { nodeData }),
				);
				expect(logger.warn).toHaveBeenCalledWith(
					'Webhook trigger "Hook" rejected a delivery because no signature secret is available',
					{ workflowId: 'w1' },
				);
			});

			test('accepts an unsigned delivery with skipIfNoSecret', async () => {
				const { result } = await deliver({ skipIfNoSecret: true }, {}, { nodeData: {} });

				expect(result).toEqual(accepted);
				expect(logger.warn).not.toHaveBeenCalled();
			});

			test('checks the signature with skipIfNoSecret when a secret is available', async () => {
				await expectRejected(deliver({ skipIfNoSecret: true }, {}));
			});

			test.each([
				['a number', '={{ 123 }}'],
				['an object', '={{ { key: "s3cret" } }}'],
			])('rejects a secret that resolves to %s, also with skipIfNoSecret', async (_, secret) => {
				await expectRejected(deliver({ secret, skipIfNoSecret: true }, {}));
			});

			test('rejects a delivery and logs a warning when the secret expression fails', async () => {
				await expectRejected(
					deliver({ secret: '={{ $staticData.secret.( }}', skipIfNoSecret: true }, {}),
				);
				expect(logger.warn).toHaveBeenCalledWith(
					'Webhook trigger "Hook" rejected a delivery because its signature secret could not be loaded',
					{ workflowId: 'w1' },
				);
			});
		});

		test('does not log a failed check', async () => {
			await expectRejected(deliver({}, { 'x-signature': 'sha256=bad' }));
			expect(logger.warn).not.toHaveBeenCalled();
		});

		describe('credentialType', () => {
			const fromCredential = {
				credentialType: 'testApi',
				secret: '={{ $credentials.signingSecret }}',
			};

			const credentials = { testApi: { id: 'c1', name: 'Test' } };

			test('reads the secret from the credential', async () => {
				const getCredentials = vi
					.spyOn(WebhookContext.prototype, 'getCredentials')
					.mockResolvedValueOnce({ signingSecret: 'from-credential' });

				const { result } = await deliver(
					fromCredential,
					{ 'x-signature': `sha256=${hmac(rawBody, 'from-credential')}` },
					{ credentials },
				);

				expect(result).toEqual(accepted);
				expect(getCredentials).toHaveBeenCalledWith('testApi');
			});

			test('rejects a delivery and logs a warning when no credential is set', async () => {
				await expectRejected(deliver(fromCredential, { 'x-signature': 'sha256=abc' }));
				expect(logger.warn).toHaveBeenCalledWith(
					'Webhook trigger "Hook" rejected a delivery because no signature secret is available',
					{ workflowId: 'w1' },
				);
			});

			test('accepts an unsigned delivery with skipIfNoSecret when no credential is set', async () => {
				const { result } = await deliver({ ...fromCredential, skipIfNoSecret: true }, {});

				expect(result).toEqual(accepted);
			});

			test('rejects a delivery with skipIfNoSecret when the set credential does not load', async () => {
				vi.spyOn(WebhookContext.prototype, 'getCredentials').mockRejectedValueOnce(
					new Error('Could not load the credential'),
				);

				await expectRejected(
					deliver({ ...fromCredential, skipIfNoSecret: true }, {}, { credentials }),
				);
			});
		});

		describe('stage order', () => {
			test('answers a handshake without a signature', async () => {
				const { result } = await deliver(
					{},
					{ 'x-hook-secret': 'h1' },
					{
						handler: {
							handshake: { when: '={{ $webhookRequest.headers["x-hook-secret"] !== undefined }}' },
						},
					},
				);

				expect(result).toStrictEqual({ webhookResponse: 'OK' });
			});

			test('does not verify a setup endpoint', async () => {
				const { result } = await deliver({}, {}, { webhookName: 'setup' });

				expect(result).toStrictEqual({ webhookResponse: 'OK' });
			});

			test('verifies a ping', async () => {
				await expectRejected(deliver({}, {}, { handler: { ping: { when: '={{ true }}' } } }));
			});

			test('verifies before the filter', async () => {
				const filter = { allowed: '={{ "other" }}', actual: '={{ $webhookRequest.body.event }}' };

				await expectRejected(deliver({}, {}, { handler: { filter } }));
			});
		});
	});

	describe('filter', () => {
		test('emits an event when a plain string allows it', async () => {
			const run = webhookSetup({ filter: eventFilter }, { event: 'created' });

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('starts no workflow for an event that is not allowed', async () => {
			const run = webhookSetup({ filter: eventFilter }, { event: 'deleted' });

			expect(await run()).toEqual({});
		});

		test('checks the event against a list', async () => {
			const filter = { ...eventFilter, allowed: '={{ ["created", "deleted"] }}' };

			expect(await webhookSetup({ filter }, { event: 'deleted' })()).toEqual({
				workflowData: [[{ json: { event: 'deleted' } }]],
			});
			expect(await webhookSetup({ filter }, { event: 'updated' })()).toEqual({});
		});

		test('accepts all events when `allowed` holds the wildcard', async () => {
			const filter = { ...eventFilter, allowed: '={{ ["*"] }}', wildcard: '*' };
			const run = webhookSetup({ filter }, { event: 'updated' });

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'updated' } }]] });
		});

		test('misses when `allowed` does not hold the wildcard', async () => {
			const filter = { ...eventFilter, wildcard: '*' };

			expect(await webhookSetup({ filter }, { event: 'updated' })()).toStrictEqual({});
		});

		test('misses when `actual` resolves to undefined', async () => {
			const filter = { ...eventFilter, allowed: '={{ [undefined, "created"] }}' };

			expect(await webhookSetup({ filter }, { type: 'created' })()).toStrictEqual({});
		});

		test('resolves the event in one pass', async () => {
			const run = webhookSetup({ filter: eventFilter }, { event: '={{ "created" }}' });

			expect(await run()).toStrictEqual({});
		});

		test('runs before the output stage', async () => {
			const action = vi.fn(async (items: INodeExecutionData[]) => items);
			const run = webhookSetup(
				{ filter: eventFilter, output: { postReceive: [action] } },
				{ event: 'deleted' },
			);

			expect(await run()).toEqual({});
			expect(action).not.toHaveBeenCalled();
		});
	});

	describe('output', () => {
		test('postReceive shapes the items from the request body', async () => {
			const run = webhookSetup(
				{
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data' } },
							{
								type: 'setKeyValue',
								properties: {
									id: '={{ $responseItem.id }}',
									total: '={{ $response.body.data.length }}',
									source: '={{ $webhookRequest.headers["x-source"] }}',
								},
							},
						],
					},
				},
				{ data: [{ id: 1 }, { id: 2 }] },
				{ headers: { 'x-source': 'api' } },
			);

			expect(await run()).toEqual({
				workflowData: [
					[
						{ json: { id: 1, total: 2, source: 'api' } },
						{ json: { id: 2, total: 2, source: 'api' } },
					],
				],
			});
		});

		test('includeMeta wraps each element of an array body', async () => {
			const run = webhookSetup({ output: { includeMeta: true } }, [{ n: 1 }, { n: 2 }], {
				headers: { 'x-a': '1' },
			});

			expect(await run()).toEqual({
				workflowData: [
					[
						{ json: { body: { n: 1 }, headers: { 'x-a': '1' }, query: {} } },
						{ json: { body: { n: 2 }, headers: { 'x-a': '1' }, query: {} } },
					],
				],
			});
		});

		test('includeMeta wraps each item as body, headers and query', async () => {
			const run = webhookSetup(
				{ output: { includeMeta: true } },
				{ event: 'created' },
				{ headers: { 'x-a': '1' }, query: { q: '2' } },
			);

			expect(await run()).toEqual({
				workflowData: [
					[{ json: { body: { event: 'created' }, headers: { 'x-a': '1' }, query: { q: '2' } } }],
				],
			});
		});

		test('includeMeta wraps the items after postReceive and keeps their binary data', async () => {
			const binary = { file: { data: 'ZGF0YQ==', mimeType: 'text/plain' } };
			const run = webhookSetup(
				{
					output: {
						includeMeta: true,
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data' } },
							async function (items) {
								return items.map((item) => ({ ...item, binary }));
							},
						],
					},
				},
				{ data: { id: 1 } },
			);

			expect(await run()).toEqual({
				workflowData: [[{ json: { body: { id: 1 }, headers: {}, query: {} }, binary }]],
			});
		});
	});

	test('resolves request values in one pass', async () => {
		const run = webhookSetup(
			{
				ping: {
					when: '={{ $webhookRequest.body.ping }}',
					response: '={{ $webhookRequest.body.value }}',
				},
			},
			{ ping: '={{ false }}', value: '={{ 1 + 1 }}' },
		);

		expect(await run()).toEqual({ webhookResponse: '={{ 1 + 1 }}' });
	});

	test('resolves postReceive values in one pass', async () => {
		const run = webhookSetup(
			{
				output: {
					postReceive: [{ type: 'setKeyValue', properties: { v: '={{ $responseItem.v }}' } }],
				},
			},
			{ v: '={{ 2 + 2 }}' },
		);

		expect(await run()).toEqual({ workflowData: [[{ json: { v: '={{ 2 + 2 }}' } }]] });
	});

	test('resolves a nested postReceive value in one pass', async () => {
		const run = webhookSetup(
			{
				output: {
					postReceive: [{ type: 'setKeyValue', properties: { item: '={{ $responseItem }}' } }],
				},
			},
			{ nested: { v: '={{ 2 + 2 }}' } },
		);

		expect(await run()).toEqual({
			workflowData: [[{ json: { item: { nested: { v: '={{ 2 + 2 }}' } } } }]],
		});
	});

	test('starts no workflow when postReceive drops all items', async () => {
		const run = webhookSetup(
			{ output: { postReceive: [{ type: 'filter', properties: { pass: '={{ false }}' } }] } },
			{ event: 'created' },
		);

		expect(await run()).toStrictEqual({});
	});
});
