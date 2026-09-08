import type {
	DeclarativeWebhookVerification,
	IDataObject,
	IDeclarativeWebhookTrigger,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { createHmac } from 'node:crypto';
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
		// The Workflow constructor strips node parameters that no property declares,
		// so the fixture declares the ones the tests set.
		properties: [
			{ displayName: 'Event', name: 'event', type: 'string', default: '' },
			{ displayName: 'Events', name: 'events', type: 'multiOptions', options: [], default: [] },
			{ displayName: 'Secret', name: 'secret', type: 'string', default: '' },
		],
		webhooks: [
			{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
		],
		requestDefaults: { baseURL: 'https://api.example.com' },
		trigger,
	},
});

const registryTrigger: IDeclarativeWebhookTrigger = {
	type: 'webhook',
	lifecycle: {
		checkExists: {
			routing: {
				request: { method: 'GET', url: '/hooks' },
				output: { postReceive: [{ type: 'rootProperty', properties: { property: 'hooks' } }] },
			},
			matchOn: [{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' }],
			store: { webhookId: '={{ $item.id }}' },
		},
		create: {
			routing: {
				request: {
					method: 'POST',
					url: '/hooks',
					body: { target_url: '={{ $webhookUrl }}' },
				},
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

function setup(
	trigger: IDeclarativeWebhookTrigger,
	{
		parameters = {},
		mode = 'trigger' as WorkflowExecuteMode,
	}: { parameters?: INodeParameters; mode?: WorkflowExecuteMode } = {},
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
		webhookBaseUrl: 'http://localhost:5678/webhook',
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
	});
	const context = new HookContext(workflow, node, additionalData, mode, 'init');
	const methods = createDeclarativeWebhookMethods(nodeType, trigger);
	const staticData = () => workflow.getStaticData('node', node);
	return {
		webhookUrl: context.getNodeWebhookUrl('default')!,
		checkExists: async () => await methods.checkExists.call(context),
		create: async () => await methods.create.call(context),
		delete: async () => await methods.delete.call(context),
		staticData,
		node,
		workflow,
		additionalData,
		nodeType,
	};
}

const respond = (body: IDataObject) =>
	httpRequest.mockResolvedValueOnce({ body, headers: {}, statusCode: 200 });

const respondNotFound = () =>
	httpRequest.mockRejectedValueOnce({
		isAxiosError: true,
		response: { status: 404 },
		message: 'not found',
	});

beforeEach(() => httpRequest.mockReset());

describe('createDeclarativeWebhookMethods', () => {
	describe('checkExists with matchOn', () => {
		test('no matching item ⇒ false', async () => {
			const { checkExists, staticData } = setup(registryTrigger);
			respond({ hooks: [{ id: 7, target_url: 'https://elsewhere.example.com' }] });

			expect(await checkExists()).toBe(false);
			expect(staticData().webhookId).toBeUndefined();
		});

		test('matching item ⇒ true and recovers store values', async () => {
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

		test('every clause must hold', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					checkExists: {
						routing: {
							request: { method: 'GET', url: '/hooks' },
							output: {
								postReceive: [{ type: 'rootProperty', properties: { property: 'hooks' } }],
							},
						},
						matchOn: [
							{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' },
							{ itemProperty: 'event', value: '={{ $parameter.event }}' },
						],
					},
				},
			};
			const { checkExists, webhookUrl } = setup(trigger, { parameters: { event: 'created' } });

			respond({ hooks: [{ target_url: webhookUrl, event: 'deleted' }] });
			expect(await checkExists()).toBe(false);

			respond({ hooks: [{ target_url: webhookUrl, event: 'created' }] });
			expect(await checkExists()).toBe(true);
		});

		test('a clause on empty static data never matches', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				lifecycle: {
					...registryTrigger.lifecycle,
					checkExists: {
						routing: { request: { method: 'GET', url: '/hooks' } },
						matchOn: [{ itemProperty: 'id', value: '={{ $staticData.webhookId }}' }],
					},
				},
			};
			const { checkExists } = setup(trigger);
			respond([{ id: 7 }] as unknown as IDataObject);

			expect(await checkExists()).toBe(false);
		});
	});

	describe('checkExists by id', () => {
		const byIdTrigger: IDeclarativeWebhookTrigger = {
			...registryTrigger,
			lifecycle: {
				...registryTrigger.lifecycle,
				checkExists: {
					routing: {
						request: { method: 'GET', url: '={{ "/hooks/" + $staticData.webhookId }}' },
					},
				},
			},
		};

		test('missing id ⇒ false without a request', async () => {
			const { checkExists } = setup(byIdTrigger);

			expect(await checkExists()).toBe(false);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('2xx ⇒ true', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			staticData().webhookId = 7;
			respond({ id: 7 });

			expect(await checkExists()).toBe(true);
			expect(httpRequest.mock.lastCall?.[0].url).toBe('/hooks/7');
		});

		test('404 ⇒ managed keys cleared, false', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			staticData().webhookId = 7;
			respondNotFound();

			expect(await checkExists()).toBe(false);
			expect(staticData().webhookId).toBeUndefined();
		});

		test('other errors rethrow', async () => {
			const { checkExists, staticData } = setup(byIdTrigger);
			staticData().webhookId = 7;
			httpRequest.mockRejectedValueOnce({
				isAxiosError: true,
				response: { status: 500 },
				message: 'boom',
			});

			await expect(checkExists()).rejects.toThrow();
			expect(staticData().webhookId).toBe(7);
		});

		describe('requireKeys', () => {
			const withSecret: IDeclarativeWebhookTrigger = {
				...byIdTrigger,
				lifecycle: {
					...byIdTrigger.lifecycle,
					checkExists: {
						routing: {
							request: { method: 'GET', url: '={{ "/hooks/" + $staticData.webhookId }}' },
						},
						requireKeys: ['webhookSecret'],
					},
				},
			};

			test.each([
				['missing', undefined],
				['blank', ''],
			])('a %s required key ⇒ false without a request', async (_label, secret) => {
				const { checkExists, staticData } = setup(withSecret);
				staticData().webhookId = 7;
				staticData().webhookSecret = secret;

				expect(await checkExists()).toBe(false);
				expect(httpRequest).not.toHaveBeenCalled();
			});

			test('a populated required key still asks the vendor', async () => {
				const { checkExists, staticData } = setup(withSecret);
				staticData().webhookId = 7;
				staticData().webhookSecret = 'shhh';
				respond({ id: 7 });

				expect(await checkExists()).toBe(true);
			});
		});

		test('managedKeys names the owned keys when create is a function', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...byIdTrigger,
				lifecycle: {
					...byIdTrigger.lifecycle,
					create: async () => true,
				},
				managedKeys: ['webhookId', 'webhookSecret'],
			};
			const { checkExists, staticData } = setup(trigger);
			Object.assign(staticData(), { webhookId: 7, webhookSecret: 'shhh', keep: 'me' });
			respondNotFound();

			expect(await checkExists()).toBe(false);
			expect(staticData().webhookId).toBeUndefined();
			expect(staticData().webhookSecret).toBeUndefined();
			expect(staticData().keep).toBe('me');
		});
	});

	describe('create', () => {
		test('stores values from the response and sends the webhook url', async () => {
			const { create, staticData, webhookUrl } = setup(registryTrigger);
			respond({ id: 42 });

			expect(await create()).toBe(true);
			expect(staticData().webhookId).toBe(42);
			expect(httpRequest.mock.lastCall?.[0].body).toEqual({ target_url: webhookUrl });
		});

		test('rejectLocalhostUrl refuses a localhost webhook url without a request', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: { request: { method: 'POST', url: '/hooks' } },
						rejectLocalhostUrl: true,
					},
				},
			};
			// The fixture's webhookBaseUrl is http://localhost:5678/webhook.
			const { create } = setup(trigger);

			await expect(create()).rejects.toThrow('localhost');
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('validateResponse rejects an unexpected creation response', async () => {
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
			expect(failing.staticData().webhookId).toBeUndefined();

			const passing = setup(trigger);
			respond({ id: 7, active: true });
			expect(await passing.create()).toBe(true);
			expect(passing.staticData().webhookId).toBe(7);
		});

		test('generate mints $secrets usable in the request and store', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: {
					create: {
						routing: {
							request: {
								method: 'POST',
								url: '/hooks',
								body: { secret: '={{ $generated.webhookSecret }}' },
							},
						},
						generate: { webhookSecret: { type: 'hex', length: 16 } },
						store: {
							webhookId: '={{ $response.id }}',
							webhookSecret: '={{ $generated.webhookSecret }}',
						},
					},
				},
			};
			const { create, staticData } = setup(trigger);
			respond({ id: 7 });

			expect(await create()).toBe(true);
			const sentSecret = (httpRequest.mock.lastCall?.[0].body as IDataObject).secret;
			expect(sentSecret).toMatch(/^[0-9a-f]{32}$/);
			expect(staticData().webhookSecret).toBe(sentSecret);
			expect(staticData().webhookId).toBe(7);
		});
	});

	describe('delete', () => {
		test('missing id ⇒ true without a request', async () => {
			const { delete: del } = setup(registryTrigger);

			expect(await del()).toBe(true);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('success ⇒ managed keys cleared', async () => {
			const { delete: del, staticData } = setup(registryTrigger);
			staticData().webhookId = 42;
			respond({});

			expect(await del()).toBe(true);
			expect(staticData().webhookId).toBeUndefined();
			expect(httpRequest.mock.lastCall?.[0].url).toBe('/hooks/42');
		});

		test('request error ⇒ false, static data kept', async () => {
			const { delete: del, staticData } = setup(registryTrigger);
			staticData().webhookId = 42;
			httpRequest.mockRejectedValueOnce(new Error('nope'));

			expect(await del()).toBe(false);
			expect(staticData().webhookId).toBe(42);
		});
	});

	describe('slot defaults and escape hatches', () => {
		test('omitted checkExists always re-registers; omitted delete is a no-op', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: { create: registryTrigger.lifecycle.create },
			};
			const { checkExists, delete: del } = setup(trigger);

			expect(await checkExists()).toBe(false);
			expect(await del()).toBe(true);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		test('a function-valued slot is used as-is', async () => {
			const custom = vi.fn(async () => true);
			const trigger: IDeclarativeWebhookTrigger = {
				type: 'webhook',
				lifecycle: { ...registryTrigger.lifecycle, checkExists: custom },
			};
			const { checkExists } = setup(trigger);

			expect(await checkExists()).toBe(true);
			expect(custom).toHaveBeenCalled();
			expect(httpRequest).not.toHaveBeenCalled();
		});
	});
});

describe('createDeclarativeWebhook', () => {
	function webhookSetup(
		trigger: IDeclarativeWebhookTrigger,
		body: IDataObject,
		parameters: INodeParameters = {},
		request: {
			headers?: IDataObject;
			rawBody?: string;
			query?: IDataObject;
			webhookName?: string;
		} = {},
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
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		});
		additionalData.httpRequest = {
			body,
			headers: request.headers ?? {},
			query: request.query ?? {},
			params: {},
			rawBody: request.rawBody,
		} as unknown as IWorkflowExecuteAdditionalData['httpRequest'];
		const response = {
			statusCode: undefined as number | undefined,
			body: undefined as unknown,
			headers: {} as Record<string, string>,
			status(code: number) {
				this.statusCode = code;
				return this;
			},
			setHeader(name: string, value: string) {
				this.headers[name] = value;
				return this;
			},
			send(payload?: unknown) {
				this.body = payload;
				return this;
			},
			end() {
				return this;
			},
		};
		additionalData.httpResponse =
			response as unknown as IWorkflowExecuteAdditionalData['httpResponse'];
		const webhookData = {
			webhookDescription: {
				name: request.webhookName ?? 'default',
				httpMethod: 'POST',
				path: 'webhook',
			},
		} as IWebhookData;
		const context = new WebhookContext(
			workflow,
			node,
			additionalData,
			'webhook',
			webhookData,
			[],
			null,
		);
		const webhook = createDeclarativeWebhook(trigger);
		const staticData = () => workflow.getStaticData('node', node);
		return { run: async () => await webhook.call(context), response, staticData };
	}

	test('without a filter, emits the body', async () => {
		const { run } = webhookSetup(registryTrigger, { event: 'created', n: 1 });

		expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created', n: 1 } }]] });
	});

	const filtered: IDeclarativeWebhookTrigger = {
		...registryTrigger,
		handler: {
			filter: {
				allowed: '={{ $parameter.events }}',
				actual: '={{ $request.body.event }}',
				wildcard: '*',
			},
		},
	};

	test('filter match ⇒ emit, miss ⇒ 200 without a run', async () => {
		expect(
			await webhookSetup(filtered, { event: 'created' }, { events: ['created'] }).run(),
		).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });

		expect(
			await webhookSetup(filtered, { event: 'deleted' }, { events: ['created'] }).run(),
		).toEqual({});
	});

	test('wildcard accepts everything', async () => {
		expect(await webhookSetup(filtered, { event: 'anything' }, { events: ['*'] }).run()).toEqual({
			workflowData: [[{ json: { event: 'anything' } }]],
		});
	});

	describe('handshake and setup endpoint', () => {
		test('a setup endpoint with no handshake answers OK', async () => {
			const { run } = webhookSetup(registryTrigger, {}, {}, { webhookName: 'setup' });

			expect(await run()).toEqual({ webhookResponse: 'OK' });
		});

		test('a setup endpoint echoes a challenge and 401s a failed `when`', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					handshake: {
						when: '={{ $request.query["verify_token"] === $parameter.secret }}',
						respond: { body: '={{ $request.query["challenge"] }}' },
					},
				},
			};

			const ok = webhookSetup(
				trigger,
				{},
				{ secret: 'tok' },
				{
					webhookName: 'setup',
					query: { verify_token: 'tok', challenge: 'c-123' },
				},
			);
			expect(await ok.run()).toEqual({ webhookResponse: 'c-123' });

			const bad = webhookSetup(
				trigger,
				{},
				{ secret: 'tok' },
				{
					webhookName: 'setup',
					query: { verify_token: 'wrong', challenge: 'c-123' },
				},
			);
			expect(await bad.run()).toEqual({ noWebhookResponse: true });
			expect(bad.response.statusCode).toBe(401);
		});

		test('on the default endpoint a matching `when` answers the handshake, otherwise the delivery proceeds', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					handshake: {
						when: '={{ $request.body.type === "url_verification" }}',
						respond: { body: '={{ $request.body.challenge }}' },
					},
				},
			};

			const shake = webhookSetup(trigger, { type: 'url_verification', challenge: 'c-9' });
			expect(await shake.run()).toEqual({ webhookResponse: 'c-9' });

			const event = webhookSetup(trigger, { type: 'event', n: 1 });
			expect(await event.run()).toEqual({
				workflowData: [[{ json: { type: 'event', n: 1 } }]],
			});
		});

		test('a handshake can store request values and answer with headers', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					handshake: {
						when: '={{ $request.headers["x-hook-secret"] !== undefined }}',
						store: { webhookSecret: '={{ $request.headers["x-hook-secret"] }}' },
						respond: { headers: { 'X-Hook-Secret': '={{ $request.headers["x-hook-secret"] }}' } },
					},
				},
			};
			const { run, response, staticData } = webhookSetup(
				trigger,
				{},
				{},
				{
					headers: { 'x-hook-secret': 's3cret' },
				},
			);

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(200);
			expect(response.headers['X-Hook-Secret']).toBe('s3cret');
			expect(staticData().webhookSecret).toBe('s3cret');
		});

		test('the handshake runs before verification, so it needs no signature', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					handshake: {
						when: '={{ $request.body.type === "url_verification" }}',
						respond: { body: '={{ $request.body.challenge }}' },
					},
					verification: {
						algorithm: 'hmac-sha256',
						signatureHeader: 'x-sig',
						secret: '={{ $parameter.secret }}',
					},
				},
			};
			const { run } = webhookSetup(
				trigger,
				{ type: 'url_verification', challenge: 'c-1' },
				{
					secret: 'tok',
				},
			);

			expect(await run()).toEqual({ webhookResponse: 'c-1' });
		});
	});

	describe('ping', () => {
		const pinged: IDeclarativeWebhookTrigger = {
			...registryTrigger,
			handler: {
				ping: { when: '={{ $request.headers["x-event"] === "ping" }}', response: 'PONG' },
				filter: {
					allowed: '={{ $parameter.events }}',
					actual: '={{ $request.headers["x-event"] }}',
					wildcard: '*',
				},
			},
		};

		test('a ping answers without a run, even when the filter would drop it', async () => {
			const { run } = webhookSetup(
				pinged,
				{ zen: 'hi' },
				{ events: ['created'] },
				{
					headers: { 'x-event': 'ping' },
				},
			);

			expect(await run()).toEqual({ webhookResponse: 'PONG' });
		});

		test('non-ping deliveries proceed through the filter', async () => {
			const { run } = webhookSetup(
				pinged,
				{ n: 1 },
				{ events: ['created'] },
				{
					headers: { 'x-event': 'created' },
				},
			);

			expect(await run()).toEqual({ workflowData: [[{ json: { n: 1 } }]] });
		});
	});

	describe('output', () => {
		test('postReceive rootProperty selects what is emitted; arrays fan out', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					output: {
						postReceive: [{ type: 'rootProperty', properties: { property: 'records' } }],
					},
				},
			};
			const { run } = webhookSetup(trigger, { records: [{ a: 1 }, { a: 2 }] });

			expect(await run()).toEqual({ workflowData: [[{ json: { a: 1 } }, { json: { a: 2 } }]] });
		});

		test('postReceive actions chain, with $response meaning the delivery', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'records' } },
							{ type: 'filter', properties: { pass: '={{ $responseItem.a > 1 }}' } },
							{
								type: 'setKeyValue',
								properties: { a: '={{ $responseItem.a }}', from: '={{ $response.body.source }}' },
							},
						],
					},
				},
			};
			const { run } = webhookSetup(trigger, { source: 'vendor', records: [{ a: 1 }, { a: 2 }] });

			expect(await run()).toEqual({
				workflowData: [[{ json: { a: 2, from: 'vendor' } }]],
			});
		});

		test('a function postReceive action gets items and the delivery-as-response', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					output: {
						postReceive: [
							async function (items, response) {
								return items.map((item) => ({
									json: { ...item.json, status: response.statusCode },
								}));
							},
						],
					},
				},
			};
			const { run } = webhookSetup(trigger, { n: 1 });

			expect(await run()).toEqual({ workflowData: [[{ json: { n: 1, status: 200 } }]] });
		});

		test('includeMeta wraps as { body, headers, query }', async () => {
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: { output: { includeMeta: true } },
			};
			const { run } = webhookSetup(
				trigger,
				{ event: 'created' },
				{},
				{ headers: { 'x-a': 'b' }, query: { q: '1' } },
			);

			expect(await run()).toEqual({
				workflowData: [
					[{ json: { body: { event: 'created' }, headers: { 'x-a': 'b' }, query: { q: '1' } } }],
				],
			});
		});

		test('includeMeta keeps binary attached by a postReceive action', async () => {
			const binary = { file: { data: 'ZGF0YQ==', mimeType: 'text/plain' } };
			const trigger: IDeclarativeWebhookTrigger = {
				...registryTrigger,
				handler: {
					output: {
						includeMeta: true,
						postReceive: [
							async function (items) {
								return items.map((item) => ({ ...item, binary }));
							},
						],
					},
				},
			};
			const { run } = webhookSetup(trigger, { event: 'created' });

			expect(await run()).toEqual({
				workflowData: [[{ json: { body: { event: 'created' }, headers: {}, query: {} }, binary }]],
			});
		});
	});

	describe('verification', () => {
		const sign = (payload: string, secret: string, algorithm = 'sha256', encoding = 'hex') =>
			createHmac(algorithm, secret)
				.update(payload)
				.digest(encoding as 'hex' | 'base64');

		const hmacTrigger = (
			overrides: Partial<DeclarativeWebhookVerification> = {},
		): IDeclarativeWebhookTrigger => ({
			...registryTrigger,
			handler: {
				verification: {
					algorithm: 'hmac-sha256',
					signatureHeader: 'x-hub-signature-256',
					secret: '={{ $staticData.webhookSecret }}',
					prefix: 'sha256=',
					...overrides,
				},
			},
		});

		test('valid HMAC over the raw body ⇒ emit', async () => {
			const rawBody = '{"event":"created"}';
			const signature = `sha256=${sign(rawBody, 's3cret')}`;
			const { run, staticData } = webhookSetup(
				hmacTrigger(),
				{ event: 'created' },
				{},
				{ rawBody, headers: { 'x-hub-signature-256': signature } },
			);
			staticData().webhookSecret = 's3cret';

			expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('bad signature ⇒ 401 without a run', async () => {
			const { run, response, staticData } = webhookSetup(
				hmacTrigger(),
				{ event: 'created' },
				{},
				{ rawBody: '{"event":"created"}', headers: { 'x-hub-signature-256': 'sha256=deadbeef' } },
			);
			staticData().webhookSecret = 's3cret';

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});

		test('missing signature header ⇒ 401', async () => {
			const { run, response, staticData } = webhookSetup(
				hmacTrigger(),
				{ event: 'created' },
				{},
				{ rawBody: '{"event":"created"}' },
			);
			staticData().webhookSecret = 's3cret';

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});

		test('no secret ⇒ 401 by default, emit with skipIfNoSecret', async () => {
			const request = { rawBody: '{"event":"created"}' };
			const rejecting = webhookSetup(hmacTrigger(), { event: 'created' }, {}, request);
			expect(await rejecting.run()).toEqual({ noWebhookResponse: true });

			const skipping = webhookSetup(
				hmacTrigger({ skipIfNoSecret: true }),
				{ event: 'created' },
				{},
				request,
			);
			expect(await skipping.run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
		});

		test('signedPayload jsonStringifiedBody signs the parsed body', async () => {
			const body = { event: 'created', n: 2 };
			const signature = `sha256=${sign(JSON.stringify(body), 's3cret')}`;
			const { run, staticData } = webhookSetup(
				hmacTrigger({ signedPayload: 'jsonStringifiedBody' }),
				body,
				{},
				{ headers: { 'x-hub-signature-256': signature } },
			);
			staticData().webhookSecret = 's3cret';

			expect(await run()).toEqual({ workflowData: [[{ json: body }]] });
		});

		test('credentialType loads the credential for the secret expression', async () => {
			const getCredentials = vi
				.spyOn(WebhookContext.prototype, 'getCredentials')
				.mockResolvedValue({ signatureSecret: 's3cret' });
			try {
				const rawBody = '{"event":"created"}';
				const signature = `sha256=${sign(rawBody, 's3cret')}`;
				const { run } = webhookSetup(
					hmacTrigger({
						secret: '={{ $credentials.signatureSecret }}',
						credentialType: 'exampleApi',
					}),
					{ event: 'created' },
					{},
					{ rawBody, headers: { 'x-hub-signature-256': signature } },
				);

				expect(await run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });
				expect(getCredentials).toHaveBeenCalledWith('exampleApi');
			} finally {
				getCredentials.mockRestore();
			}
		});

		test('token algorithm compares the secret itself', async () => {
			const trigger = hmacTrigger({
				algorithm: 'token',
				signatureHeader: 'x-secret-token',
				secret: '={{ $parameter.secret }}',
				prefix: undefined,
			});
			const ok = webhookSetup(
				trigger,
				{ event: 'created' },
				{ secret: 'tok' },
				{ headers: { 'x-secret-token': 'tok' } },
			);
			expect(await ok.run()).toEqual({ workflowData: [[{ json: { event: 'created' } }]] });

			const bad = webhookSetup(
				trigger,
				{ event: 'created' },
				{ secret: 'tok' },
				{ headers: { 'x-secret-token': 'nope' } },
			);
			expect(await bad.run()).toEqual({ noWebhookResponse: true });
		});

		test('stale timestamp ⇒ 401 even with a valid signature', async () => {
			const rawBody = '{"event":"created"}';
			const signature = `sha256=${sign(rawBody, 's3cret')}`;
			const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
			const { run, response, staticData } = webhookSetup(
				hmacTrigger({ timestampHeader: 'x-timestamp' }),
				{ event: 'created' },
				{},
				{
					rawBody,
					headers: { 'x-hub-signature-256': signature, 'x-timestamp': staleTimestamp },
				},
			);
			staticData().webhookSecret = 's3cret';

			expect(await run()).toEqual({ noWebhookResponse: true });
			expect(response.statusCode).toBe(401);
		});
	});
});
