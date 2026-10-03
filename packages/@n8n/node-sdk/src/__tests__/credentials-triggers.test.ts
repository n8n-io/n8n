import { createHmac } from 'node:crypto';
import type { IDataObject, IHttpRequestOptions, INodeType } from 'n8n-workflow';

import { generateNodeModule } from '../entry/codegen';
import { compat, credential, defineCredential, field } from '../entry/credentials';
import { toTriggerNodeType } from '../entry/host';
import { contractHash, diffContracts, toContract } from '../entry/registry';
import { defineNode, parse, t } from '../index';
import { requestOf } from '../runtime';
import { mockHttp, runAction } from '../testing';

const tasksApi = defineCredential({
	id: 'tasks.token',
	legacyName: 'tasksApi',
	displayName: 'Tasks API',
	fields: { token: field.secret('Access Token'), signingSecret: t.str().optional() },
	auth: (a) => a.bearer('token'),
});

const tasks = defineNode({
	id: 'tasks',
	displayName: 'Tasks',
	credential: credential({
		types: [tasksApi],
		scopes: { 'tasks:read': 'Read tasks', 'tasks:write': 'Write tasks' },
	}),
	baseUrl: 'https://tasks.test/v1',
});

const task = tasks.resource('task', { input: { project: t.str() } });

const taskOutput = t.obj({ id: t.str(), title: t.str() });

const getTask = task.action('get', {
	action: 'Get a task',
	summary: 'Get one task by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['tasks:read'],
	input: { id: t.str(), fields: t.str().optional() },
	output: taskOutput,
	request: {
		path: '/projects/{project}/tasks/{id}',
		query: { fields: { input: 'fields' }, expand: true },
	},
});

const listTasks = task.action('getAll', {
	action: 'Get many tasks',
	summary: 'List the tasks of a project.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	scopes: ['tasks:read'],
	input: { limit: t.int().default(50) },
	output: taskOutput,
	list: {
		path: '/projects/{project}/tasks',
		query: { limit: { input: 'limit' } },
		response: t.obj({ results: t.arr(taskOutput) }),
		items: (page) => page.results,
	},
});

const credentialData = { type: 'tasksApi', data: { token: 't-1' } };

describe('declarative request binding', () => {
	it('sends the described request and emits the body, with no run()', async () => {
		const fetch = mockHttp([
			{ path: '/projects/p%201/tasks/t1', reply: { json: { id: 't1', title: 'Write' } } },
		]);
		const result = await runAction(getTask, {
			input: { project: 'p 1', id: 't1' },
			credential: credentialData,
			fetch,
		});
		expect(getTask.run).toBeUndefined();
		expect(result).toEqual({ ok: true, items: [{ id: 't1', title: 'Write' }] });
		expect(fetch.calls[0]?.url).toBe('https://tasks.test/v1/projects/p%201/tasks/t1?expand=true');
		expect(fetch.calls[0]?.headers.authorization).toBe('Bearer t-1');
	});

	it('emits the items of the named response field for 1:N', async () => {
		const fetch = mockHttp([
			{ path: '/projects/p1/tasks', reply: { json: { results: [{ id: 'a', title: 'A' }] } } },
		]);
		const result = await runAction(listTasks, {
			input: { project: 'p1' },
			credential: credentialData,
			fetch,
		});
		expect(result).toEqual({ ok: true, items: [{ id: 'a', title: 'A' }] });
		expect(fetch.calls[0]?.query).toEqual({ limit: '50' });
	});

	it('rejects a path field that is not an input field', () => {
		task.action('get', {
			action: 'Get a task',
			summary: 'Get one task by ID.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: { id: t.str() },
			output: taskOutput,
			// @ts-expect-error `{task}` is not an input field
			request: { path: '/tasks/{task}' },
		});
		task.action('get', {
			action: 'Get a task',
			summary: 'Get one task by ID.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: { id: t.str() },
			output: taskOutput,
			// @ts-expect-error `query` reads an input field that does not exist
			request: { path: '/tasks/{id}', query: { q: { input: 'search' } } },
		});
		task.action('get', {
			action: 'Get a task',
			summary: 'Get one task by ID.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: { id: t.str().optional() },
			output: taskOutput,
			// @ts-expect-error `{id}` is optional, so the segment could be empty
			request: { path: '/tasks/{id}' },
		});
		task.action('getAll', {
			action: 'Get many tasks',
			summary: 'List the tasks of a project.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output: taskOutput,
			// @ts-expect-error a 1:N action lists with `list`, not `request`
			request: { path: '/projects/{project}/tasks' },
		});
		expect(true).toBe(true);
	});

	it('refuses a path field without a value instead of sending an empty segment', () => {
		const binding = { path: '/tasks/{task id}' } as const;
		expect(requestOf(binding, { 'task id': 'a/b' }).path).toBe('/tasks/a%2Fb');
		expect(() => requestOf(binding, {})).toThrow('The path field "task id" has no value');
		expect(() => requestOf(binding, { 'task id': '' })).toThrow('has no value');
	});
});

describe('scopes', () => {
	it('go into the contract and its hash only when an action lists some', () => {
		const contract = toContract(getTask);
		expect(contract.scopes).toEqual(['tasks:read']);
		const { scopes: _, ...without } = contract;
		expect(contractHash(without)).not.toBe(contractHash(contract));
		expect(toContract({ ...getTask, scopes: [] })).not.toHaveProperty('scopes');
	});

	it('classify a first declaration as minor, a new scope as major, a removed scope as minor', () => {
		const { scopes: _, ...undeclared } = toContract(getTask);
		const declared = toContract(getTask);
		const more = { ...declared, scopes: ['tasks:read', 'tasks:write'] };
		expect(diffContracts(undeclared, declared).kind).toBe('minor');
		expect(diffContracts(declared, more).kind).toBe('major');
		expect(diffContracts(more, declared).kind).toBe('minor');
	});

	it('hash the scopes as a set', () => {
		const contract = { ...toContract(getTask), scopes: ['tasks:read', 'tasks:write'] };
		const reordered = { ...contract, scopes: ['tasks:write', 'tasks:read'] };
		expect(contractHash(reordered)).toBe(contractHash(contract));
		expect(diffContracts(contract, reordered).kind).toBe('patch');
	});
});

const taskEvent = t.obj({ id: t.str(), title: t.str() });

const created = task.trigger('created', {
	trigger: 'On task created',
	summary: 'Starts when a task is created in a project.',
	scopes: ['tasks:read'],
	input: {},
	output: taskEvent,
	poll: {
		request: ({ input, since }) => ({
			path: `/projects/${input.project}/tasks`,
			query: { after: since },
		}),
		response: t.arr(taskOutput),
		items: (page) => page,
		cursor: { id: (item) => Number(item.id) },
	},
});

const signed = task.trigger('updated', {
	trigger: 'On task updated',
	summary: 'Starts when the service posts a task update.',
	input: {},
	output: taskEvent,
	webhook: {
		verify: { algorithm: 'sha256', header: 'x-signature', secret: { credential: 'signingSecret' } },
		emit: ({ body }) => [
			{ id: `${Number(body.id)}`, title: typeof body.title === 'string' ? body.title : '' },
		],
	},
});

const edited = task.trigger('edited', {
	trigger: 'On task edited',
	summary: 'Starts when a task is edited.',
	input: {},
	output: taskEvent,
	poll: {
		request: ({ input, since, page, limit }) => ({
			path: `/projects/${input.project}/tasks`,
			query: { after: since, page, size: limit },
		}),
		response: t.obj({
			items: t.arr(t.obj({ id: t.str(), title: t.str(), at: t.str() })),
			next: t.str().optional(),
		}),
		items: (page) => page.items,
		next: (page) => page.next,
		cursor: { timestamp: (item) => item.at, key: (item) => item.id, precision: 'minute' },
		map: ({ id, title }) => ({ id, title }),
	},
});

const hooked = task.trigger('commented', {
	trigger: 'On task comment',
	summary: 'Starts when the service posts a task comment.',
	input: {},
	output: t.loose(taskEvent),
	webhook: {
		verify: { algorithm: 'sha256', header: 'x-signature', secret: 'generated' },
		register: {
			create: ({ input, url, secret }) => ({
				method: 'POST',
				path: `/projects/${input.project}/hooks`,
				body: { url, secret },
			}),
			id: (body) =>
				typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string'
					? body.id
					: undefined,
			check: ({ input, id }) => ({ path: `/projects/${input.project}/hooks/${id}` }),
			delete: ({ input, id }) => ({
				method: 'DELETE',
				path: `/projects/${input.project}/hooks/${id}`,
			}),
		},
		emit: ({ body }) => [parse(taskEvent, body)],
	},
});

const httpFailure = (status: number) =>
	Object.assign(new Error(`HTTP ${status}`), { response: { status, headers: {}, data: {} } });

function pollContext(
	staticData: IDataObject,
	replies: unknown[],
	sent: IHttpRequestOptions[],
	mode = 'trigger',
	warnings: string[] = [],
) {
	return {
		logger: { warn: (message: string) => warnings.push(message) },
		getNode: () => ({ name: 'Tasks', credentials: { tasksApi: { id: '1' } } }),
		getNodeParameter: (name: string) => (name === 'project' ? 'p1' : undefined),
		getWorkflowStaticData: () => staticData,
		getMode: () => mode,
		getNodeWebhookUrl: () => 'https://n8n.test/webhook/1',
		getCredentials: async () => await Promise.resolve({ token: 't' }),
		helpers: {
			httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
				sent.push(options);
				const reply = replies.shift();
				if (reply instanceof Error) throw reply;
				return await Promise.resolve(reply);
			},
		},
	};
}

describe('triggers', () => {
	it('are contracts of their resource, with a trigger kind and the trigger flow', () => {
		expect(created.id).toBe('tasks.task.created');
		expect(toContract(created)).toMatchObject({
			trigger: 'poll',
			action: 'On task created',
			flow: { effect: 'read', cardinality: '1:N' },
			scopes: ['tasks:read'],
			input: { properties: { project: { type: 'string' } } },
		});
		const { description } = new (toTriggerNodeType(created))();
		expect(description).toMatchObject({ group: ['trigger'], inputs: [], polling: true });
	});

	it('poll by item ID: the first poll sets the cursor, the next emits the newer items', async () => {
		const staticData: IDataObject = {};
		const sent: IHttpRequestOptions[] = [];
		const replies = [
			[{ id: '1', title: 'A' }],
			[
				{ id: '2', title: 'B' },
				{ id: '1', title: 'A' },
			],
		];
		const type: INodeType = new (toTriggerNodeType(created))();
		const context = pollContext(staticData, replies, sent);
		expect(await type.poll?.call(context as never)).toBeNull();
		expect(staticData.cursor).toBe('1');
		const second = await type.poll?.call(context as never);
		expect(second?.[0]?.map(({ json }) => json)).toEqual([{ id: '2', title: 'B' }]);
		expect(sent.map(({ url, qs }) => [url, qs])).toEqual([
			['https://tasks.test/v1/projects/p1/tasks', {}],
			['https://tasks.test/v1/projects/p1/tasks', { after: '1' }],
		]);
	});

	it('poll a page whose unread fields drift with a log warning, and fail on a cursor field', async () => {
		const warnings: string[] = [];
		const replies = [[{ id: '1' }], [{ id: '2' }, { title: 'no id' }]];
		const type: INodeType = new (toTriggerNodeType(created))();
		const context = pollContext({}, replies, [], 'trigger', warnings);
		expect(await type.poll?.call(context as never)).toBeNull();
		expect(warnings).toEqual([
			'The response of tasks.task.created does not match its contract, so check the fields: page[0].title: is required',
		]);
		await expect(type.poll?.call(context as never)).rejects.toThrow('page[1].id: is required');
	});

	it('poll by time: the first poll skips, pages follow `next`, and a key is not emitted twice', async () => {
		vi.useFakeTimers({ now: new Date('2026-01-01T10:00:30Z') });
		const staticData: IDataObject = {};
		const sent: IHttpRequestOptions[] = [];
		const a = { id: 'a', title: 'A', at: '2026-01-01T10:00:00.000Z' };
		const b = { id: 'b', title: 'B', at: '2026-01-01T10:00:00.000Z' };
		const c = { id: 'c', title: 'C', at: '2026-01-01T10:01:00.000Z' };
		const replies = [{ items: [a], next: 'p2' }, { items: [b] }, { items: [c, b, a] }];
		const type: INodeType = new (toTriggerNodeType(edited))();
		const context = pollContext(staticData, replies, sent);
		try {
			expect(await type.poll?.call(context as never)).toBeNull();
			expect(staticData).toEqual({ cursor: '2026-01-01T10:00:00.000Z', seen: ['a', 'b'] });
			const second = await type.poll?.call(context as never);
			expect(second?.[0]?.map(({ json }) => json)).toEqual([{ id: 'c', title: 'C' }]);
			expect(staticData).toEqual({ cursor: '2026-01-01T10:01:00.000Z', seen: ['c'] });
		} finally {
			vi.useRealTimers();
		}
		expect(sent.map(({ qs }) => qs)).toEqual([
			{ after: '2026-01-01T10:00:00.000Z' },
			{ after: '2026-01-01T10:00:00.000Z', page: 'p2' },
			{ after: '2026-01-01T10:00:00.000Z' },
		]);
	});

	it('poll a trigger frozen without a response schema: items read the body', async () => {
		if (!created.poll) throw new Error('created has no poll');
		const { response: _, ...frozenPoll } = created.poll;
		const frozen = { ...created, poll: frozenPoll } as unknown as typeof created;
		const staticData: IDataObject = { cursor: '1' };
		const replies = [[{ id: '2', title: 'B' }]];
		const type: INodeType = new (toTriggerNodeType(frozen))();
		const result = await type.poll?.call(pollContext(staticData, replies, []) as never);
		expect(result?.[0]?.map(({ json }) => json)).toEqual([{ id: '2', title: 'B' }]);
	});

	it('poll in a manual run: one small page, the newest item, and the cursor stays', async () => {
		const staticData: IDataObject = { cursor: '2026-01-01T10:00:00.000Z', seen: ['a'] };
		const sent: IHttpRequestOptions[] = [];
		const replies = [{ items: [{ id: 'z', title: 'Z', at: '2026-01-01T09:00:00.000Z' }] }];
		const type: INodeType = new (toTriggerNodeType(edited))();
		const result = await type.poll?.call(pollContext(staticData, replies, sent, 'manual') as never);
		expect(result?.[0]?.map(({ json }) => json)).toEqual([{ id: 'z', title: 'Z' }]);
		expect(sent.map(({ qs }) => qs)).toEqual([{ size: 1 }]);
		expect(staticData).toEqual({ cursor: '2026-01-01T10:00:00.000Z', seen: ['a'] });
	});

	it('register a webhook: create stores the ID and secret, check and delete use them', async () => {
		const type: INodeType = new (toTriggerNodeType(hooked))();
		const hooks = type.webhookMethods?.default;
		const run = async (
			method: 'checkExists' | 'create' | 'delete',
			staticData: IDataObject,
			replies: unknown[],
		) => {
			const sent: IHttpRequestOptions[] = [];
			const result = await hooks?.[method].call(pollContext(staticData, replies, sent) as never);
			return { result, sent: sent.map(({ method: verb, url }) => `${verb} ${url}`) };
		};
		const url = 'https://tasks.test/v1/projects/p1/hooks';

		const data: IDataObject = {};
		expect(await run('checkExists', data, [])).toEqual({ result: false, sent: [] });
		const created = await run('create', data, [{ id: 'h1' }]);
		expect(created).toEqual({ result: true, sent: [`POST ${url}`] });
		expect(data.webhookId).toBe('h1');
		expect(data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
		expect(await run('checkExists', data, [{}])).toEqual({ result: true, sent: [`GET ${url}/h1`] });

		const gone: IDataObject = { ...data };
		expect(await run('checkExists', gone, [httpFailure(404)])).toMatchObject({ result: false });
		expect(gone).toEqual({});
		await expect(run('checkExists', { ...data }, [httpFailure(500)])).rejects.toThrow('HTTP 500');

		const kept: IDataObject = { ...data };
		expect(await run('delete', kept, [httpFailure(500)])).toMatchObject({ result: false });
		expect(kept.webhookId).toBe('h1');
		expect(await run('delete', kept, [{}])).toEqual({ result: true, sent: [`DELETE ${url}/h1`] });
		expect(kept).toEqual({});
		await expect(run('create', {}, [{}])).rejects.toThrow('The create response has no webhook ID');
	});

	it('verify a webhook signature with a secret field of the credential', async () => {
		const type: INodeType = new (toTriggerNodeType(signed))();
		const deliver = async (key: string) => {
			const body = { id: 7, title: 'Ship' };
			const rawBody = Buffer.from(JSON.stringify(body));
			const signature = createHmac('sha256', key).update(rawBody).digest('hex');
			const response = { status: () => response, send: () => response, end: () => response };
			const context = {
				getNode: () => ({ name: 'Tasks', credentials: { tasksApi: { id: '1' } } }),
				getNodeParameter: (name: string) => (name === 'project' ? 'p1' : undefined),
				getCredentials: async () => await Promise.resolve({ token: 't', signingSecret: 'shh' }),
				getRequestObject: () => ({ rawBody }),
				getHeaderData: () => ({ 'x-signature': signature }),
				getBodyData: () => body,
				getQueryData: () => ({}),
				getResponseObject: () => response,
			};
			return await type.webhook?.call(context as never);
		};
		expect(await deliver('shh')).toEqual({
			workflowData: [[{ json: { id: '7', title: 'Ship' } }]],
		});
		expect(await deliver('forged')).toEqual({ noWebhookResponse: true });
	});

	it('type the signature secret against the credential fields', () => {
		task.trigger('updated', {
			trigger: 'On task updated',
			summary: 'Starts when the service posts a task update.',
			input: {},
			output: taskEvent,
			webhook: {
				verify: {
					algorithm: 'sha256',
					header: 'x-signature',
					// @ts-expect-error the credential has no field `signingSecrte`
					secret: { credential: 'signingSecrte' },
				},
			},
		});
		expect(true).toBe(true);
	});
});

describe('node credential', () => {
	it('rejects a key that NodeDefinition does not have', () => {
		// @ts-expect-error the node takes one `credential`, not `credentials`
		defineNode({ id: 'x', displayName: 'X', credentials: [compat('xApi')] });
		expect(true).toBe(true);
	});

	it('sets the base URL from a field of the credential type', async () => {
		const enterprise = defineNode({
			id: 'gh',
			displayName: 'GH',
			credential: credential({
				types: [
					compat('ghApi', {
						fields: { server: t.str().default('https://api.gh.test') },
						baseUrl: '{server}',
					}),
				],
			}),
		});
		const me = enterprise.action('me', {
			action: 'Get me',
			summary: 'Get the user of the credential.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: t.obj({ login: t.str() }),
			request: { path: '/user' },
		});
		const fetch = mockHttp([{ path: '/user', reply: { json: { login: 'ada' } } }]);
		const result = await runAction(me, {
			input: {},
			credential: { type: 'ghApi', data: { server: 'https://gh.example.com/api/v3' } },
			credentials: [{ name: 'ghApi', displayName: 'GH', properties: [] }],
			fetch,
		});
		expect(result).toEqual({ ok: true, items: [{ login: 'ada' }] });
		expect(fetch.calls[0]?.url).toBe('https://gh.example.com/api/v3/user');
	});
});

describe('generateNodeModule', () => {
	const contracts = [getTask, created].map((contract) => ({
		contract: toContract(contract),
		nodeType: `n8n-nodes-tasks.${contract.id}`,
		resource: contract.resource,
		operation: contract.operation,
	}));
	const module = generateNodeModule('tasks', contracts);

	it('shows the credential, the scopes of each action, and starts a flow at a trigger', () => {
		expect(module).toContain(
			'// Credential "tasks": one of tasksApi. A workflow needs the scopes its nodes list: tasks:read.',
		);
		expect(module).toContain(
			'contractStep("n8n-nodes-tasks.tasks.task.get", config, 1, undefined, {"credential":"tasks","scopes":["tasks:read"]})',
		);
		expect(module).toContain('(read, per-item; scopes: tasks:read)');
		expect(module).toContain('export type TasksTaskCreatedInput = { project: string };');
		expect(module).toContain(
			'contractTrigger("n8n-nodes-tasks.tasks.task.created", config, 1, {"credential":"tasks","scopes":["tasks:read"]}, {"example":',
		);
		expect(module).toContain(
			"import { contractStep, contractTool, contractTrigger, type DeepPartial, type NodeSettings, type OutputOf, type Provider, type Step, type ToolConfig, type Trigger, type Value } from '@n8n/workflow-sdk/next';",
		);
	});

	it('types a page value as a lambda over the page and names its path for the build', () => {
		const search = task.action('search', {
			action: 'Search tasks',
			summary: 'Search tasks page by page.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {
				pages: t
					.variant('style', { cursor: { next: t.pageValue(t.nullable(t.str())) } })
					.optional(),
			},
			output: taskOutput,
			async *run() {
				yield* [];
			},
		});
		const text = generateNodeModule('tasks', [
			{ contract: toContract(search), nodeType: 'n8n-nodes-tasks.search', operation: 'search' },
		]);
		expect(text).toContain('pages?: { style: "cursor"; next: PageValue<string | null> };');
		expect(text).toContain(
			'contractStep("n8n-nodes-tasks.search", config, 1, undefined, undefined, undefined, [["pages","next"]])',
		);
		expect(text).toContain('type OutputOf, type PageValue, type Provider, type Step');
		expect(text).toContain(
			'contractTool("n8n-nodes-tasks.searchTool", config, 1, [["pages","next"]])',
		);
	});
});
