import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@test/utils';
import type {
	IDataObject,
	IDeclarativeWebhookTrigger,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookData,
	IWebhookFunctions,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createDeclarativeWebhookMethods, declarativeWebhook } from '../declarative-webhook';
import { HookContext, returnJsonArray } from '../node-execution-context';

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

describe('declarativeWebhook', () => {
	const run = async (body: unknown) =>
		await declarativeWebhook.call(
			mock<IWebhookFunctions>({
				getBodyData: () => body as IDataObject,
				helpers: { returnJsonArray },
			}),
		);

	test('emits the request body', async () => {
		expect(await run({ event: 'created' })).toEqual({
			workflowData: [[{ json: { event: 'created' } }]],
		});
	});

	test('emits one item for each element of an array body', async () => {
		expect(await run([{ n: 1 }, { n: 2 }])).toEqual({
			workflowData: [[{ json: { n: 1 } }, { json: { n: 2 } }]],
		});
	});
});
