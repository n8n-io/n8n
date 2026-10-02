import { NodeApiError, type IExecuteFunctions, type INode, type JsonObject } from 'n8n-workflow';

import {
	actionFileOf,
	arr,
	compat,
	credential,
	defineNode,
	exampleOf,
	generateNodeModule,
	isHttpError,
	json,
	lintContract,
	nullable,
	num,
	obj,
	oneOf,
	str,
	toContract,
	toNodeType,
	union,
	validate,
	variant,
	type Action,
	type Infer,
	type RunInput,
} from '../index';

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credential: credential({ types: [compat('todoApi')] }),
	baseUrl: 'https://todo.test',
});

const task = todo.resource('task', { input: { project: str().hint('Project ID') } });

const listTasks = task.action('getAll', {
	action: 'Get many tasks',
	summary: 'List tasks in a project.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		paging: variant('mode', { all: {}, limit: { max: num().default(50) } }),
		status: oneOf('open', 'done').optional(),
	},
	output: obj({ id: str(), title: str(), tags: arr(str()) }),
	async *run({ input, http }) {
		const max = input.paging.mode === 'limit' ? input.paging.max : undefined;
		const body = await http.request({ path: `/projects/${input.project}/tasks`, query: { max } });
		yield* Array.isArray(body) ? body : [];
	},
});

describe('node builders', () => {
	it('derive the action id and merge the resource input into the action input', () => {
		const ping = todo.action('ping', {
			action: 'Ping',
			summary: 'Check the API.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: obj({ ok: str() }),
			async run() {
				return { ok: 'yes' };
			},
		});
		expect([listTasks.id, listTasks.resource, listTasks.operation]).toEqual([
			'todo.task.getAll',
			'task',
			'getAll',
		]);
		expect([ping.id, ping.resource, ping.operation]).toEqual(['todo.ping', undefined, 'ping']);
		expect(Object.keys(listTasks.input)).toEqual(['project', 'paging', 'status']);
		expect(listTasks.credentialTypes).toEqual(['todoApi']);
		expect(actionFileOf(listTasks)).toBe('actions/task.get-all.ts');
		expect(actionFileOf(ping)).toBe('actions/ping.ts');
	});

	it('types the run() result from flow.cardinality', () => {
		const output = obj({ id: str() });
		const perItem = { action: 'A', summary: 'S.', input: {}, output } as const;
		const probes = [
			task.action('get', {
				...perItem,
				flow: { effect: 'read', cardinality: 'per-item' },
				// @ts-expect-error a per-item action returns one item; it does not yield
				async *run() {
					yield { id: '1' };
				},
			}),
			task.action('list', {
				...perItem,
				flow: { effect: 'read', cardinality: '1:N' },
				// @ts-expect-error a 1:N action yields its items; it does not return one
				async run() {
					return await Promise.resolve({ id: '1' });
				},
			}),
			task.action('wrong', {
				...perItem,
				flow: { effect: 'read', cardinality: 'per-item' },
				// @ts-expect-error the item must match the output schema
				async run() {
					return await Promise.resolve({ name: 1 });
				},
			}),
			task.action('wrongItem', {
				...perItem,
				flow: { effect: 'read', cardinality: '1:N' },
				// @ts-expect-error each yielded item must match the output schema
				async *run() {
					yield { name: 1 };
				},
			}),
			task.action('readsInput', {
				...perItem,
				flow: { effect: 'read', cardinality: 'per-item' },
				async run({ input }) {
					// @ts-expect-error run() sees only the declared input
					return await Promise.resolve({ id: input.missing });
				},
			}),
		];
		expect(probes.map(({ id }) => id)).toEqual([
			'todo.task.get',
			'todo.task.list',
			'todo.task.wrong',
			'todo.task.wrongItem',
			'todo.task.readsInput',
		]);
	});
});

describe('schema builders', () => {
	it('infer variant, optional, and default fields', () => {
		type Paging = Infer<ReturnType<typeof pagingSchema>>;
		const pagingSchema = () => variant('mode', { all: {}, limit: { max: num().default(50) } });
		const all: Paging = { mode: 'all' };
		const limited: Paging = { mode: 'limit' };
		// @ts-expect-error `max` belongs to the limit branch only
		const wrong: Paging = { mode: 'all', max: 5 };
		expect([all, limited, wrong]).toHaveLength(3);
	});

	it('types a default field as set in run() and as optional for callers', () => {
		const input = { limit: num().default(50).hint('At most 100'), query: str().optional() };
		const inRun: RunInput<typeof input> = { limit: 5 };
		const limit: number = inRun.limit;
		// @ts-expect-error run() gets every default field
		const withoutDefault: RunInput<typeof input> = {};
		const fromCaller: Infer<ReturnType<typeof obj<typeof input>>> = {};
		expect([limit, withoutDefault, fromCaller]).toEqual([5, {}, {}]);
	});

	it('builds a nullable schema', () => {
		const assignee = nullable(str()).hint('null when unassigned');
		const value: Infer<typeof assignee> = null;
		expect(assignee.json).toEqual({
			anyOf: [{ type: 'string' }, { type: 'null' }],
			'x-n8n-hint': 'null when unassigned',
		});
		expect(validate(value, assignee.json)).toEqual([]);
		expect(validate(1, assignee.json)).toEqual(['input: does not match any allowed shape']);
		expect(nullable(str().optional()).isOptional).toBe(true);
	});

	it('builds a union of object schemas', () => {
		const invoice = obj({ id: str() });
		const line = obj({ sku: str(), invoiceId: str() });
		const either = union(invoice, line);
		const value: Infer<typeof either> = { sku: 's1', invoiceId: 'inv_1' };
		expect(either.json).toEqual({ anyOf: [invoice.json, line.json] });
		expect(validate(value, either.json)).toEqual([]);
		expect(validate({ id: 'inv_1', sku: 's1' }, either.json)).toEqual([
			'input: does not match any allowed shape',
		]);
	});

	it('emits a closed JSON Schema with a discriminated union', () => {
		expect(toContract(listTasks).input).toEqual({
			type: 'object',
			properties: {
				project: { type: 'string', 'x-n8n-hint': 'Project ID' },
				paging: {
					type: 'object',
					discriminator: { propertyName: 'mode' },
					oneOf: [
						{
							type: 'object',
							properties: { mode: { const: 'all', 'x-n8n-literal': true } },
							required: ['mode'],
							additionalProperties: false,
						},
						{
							type: 'object',
							properties: {
								mode: { const: 'limit', 'x-n8n-literal': true },
								max: { type: 'number', default: 50 },
							},
							required: ['mode'],
							additionalProperties: false,
						},
					],
				},
				status: { enum: ['open', 'done'] },
			},
			required: ['project', 'paging'],
			additionalProperties: false,
		});
		expect(lintContract(toContract(listTasks))).toEqual([]);
	});

	it('validates values and names the failing path', () => {
		const { inputSchema } = listTasks;
		expect(validate({ project: 'p1', paging: { mode: 'all' } }, inputSchema)).toEqual([]);
		expect(validate({ project: 'p1', paging: { mode: 'some' }, extra: 1 }, inputSchema)).toEqual([
			'input.paging: needs "mode" set to one of "all", "limit"',
			'input: unknown field(s) extra. Allowed: project, paging, status',
		]);
		expect(
			validate({ project: '={{ $json.id }}', paging: { mode: 'all' } }, inputSchema, {
				allowExpressions: true,
			}),
		).toEqual([]);
	});
});

function fakeContext(
	parameters: Record<string, unknown>,
	response: unknown,
	continueOnFail = false,
) {
	const requests: unknown[] = [];
	const context = {
		getInputData: () => [{ json: {} }, { json: {} }],
		getNode: () => ({ name: 'Tasks', credentials: { todoApi: { id: '1', name: 'Todo' } } }),
		getNodeParameter: (name: string) => parameters[name],
		getCredentials: async () => ({}),
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (credentialType: string, options: unknown) => {
				requests.push([credentialType, options]);
				return response;
			},
		},
	};
	// The runtime reads only these members.
	return { context: context as unknown as IExecuteFunctions, requests };
}

describe('toNodeType', () => {
	const NodeType = toNodeType(listTasks);

	it('describes the node from the contract', () => {
		const { description } = new NodeType();
		expect(description.name).toBe('todoTaskGetAll');
		expect(description.credentials).toEqual([{ name: 'todoApi', required: true }]);
		expect(description.properties.map((p) => [p.name, p.type, p.required, p.default])).toEqual([
			['project', 'string', true, ''],
			['paging', 'json', true, '{}'],
			['status', 'options', false, ''],
		]);
	});

	it('adds one authentication selector when the node takes several credential types', () => {
		const open = defineNode({
			id: 'web',
			displayName: 'Web',
			credential: credential({ types: [compat('a'), compat('b')], optional: true }),
		});
		const { description } = new (toNodeType({
			...listTasks,
			node: open,
			credentialTypes: ['a', 'b'],
		}))();
		expect(description.properties[0]).toMatchObject({ name: 'authentication', default: 'none' });
		expect(description.credentials).toEqual([
			{ name: 'a', required: false, displayOptions: { show: { authentication: ['a'] } } },
			{ name: 'b', required: false, displayOptions: { show: { authentication: ['b'] } } },
		]);
	});

	it('runs per item, applies the credential, and pairs output items', async () => {
		const { context, requests } = fakeContext(
			{ project: 'p1', paging: '{"mode":"limit","max":2}' },
			[{ id: 't1', title: 'Write', tags: [] }],
		);
		const execute = new NodeType().execute;
		const result = await execute?.call(context);
		expect(result).toEqual([
			[
				{ json: { id: 't1', title: 'Write', tags: [] }, pairedItem: { item: 0 } },
				{ json: { id: 't1', title: 'Write', tags: [] }, pairedItem: { item: 1 } },
			],
		]);
		expect(requests[0]).toEqual([
			'todoApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://todo.test/projects/p1/tasks',
				qs: { max: 2 },
			}),
		]);
	});

	it('treats filled-in defaults of optional fields as unset', async () => {
		const { context, requests } = fakeContext(
			{ project: 'p1', paging: { mode: 'all' }, status: '' },
			[],
		);
		await expect(new NodeType().execute?.call(context)).resolves.toEqual([[]]);
		expect(requests).toHaveLength(2);
	});

	it('fails an item whose output breaks the contract, or continues with an error item', async () => {
		const bad = [{ id: 1 }];
		const { context } = fakeContext({ project: 'p1', paging: { mode: 'all' } }, bad);
		await expect(new NodeType().execute?.call(context)).rejects.toThrow(
			'Output does not match the contract',
		);
		const lenient = fakeContext({ project: 'p1', paging: { mode: 'all' } }, bad, true);
		const result = await new NodeType().execute?.call(lenient.context);
		expect(JSON.stringify(result)).toContain('output[0].id: must be string');
	});

	it('adds status, headers and body to a failed request error, keeps the NodeApiError', async () => {
		const transportError = Object.assign(new Error('Request failed with status code 429'), {
			// A wait above the retry cap fails at once.
			response: { status: 429, headers: { 'Retry-After': '120' }, data: { error: 'slow down' } },
		});
		const { context } = fakeContext({ project: 'p1', paging: { mode: 'all' } }, []);
		const node = { name: 'Tasks', type: 'todoTaskGetAll', parameters: {} } as unknown as INode;
		context.helpers.httpRequestWithAuthentication = async () => {
			throw new NodeApiError(node, transportError as unknown as JsonObject);
		};
		const caught: unknown = await new NodeType().execute?.call(context).catch((error) => error);
		expect(caught).toBeInstanceOf(NodeApiError);
		expect(isHttpError(caught)).toBe(true);
		expect(caught).toMatchObject({
			status: 429,
			headers: { 'retry-after': '120' },
			body: { error: 'slow down' },
		});
	});
});

describe('exampleOf', () => {
	it('builds a value that matches the output schema', () => {
		const schema = obj({ id: str(), tags: arr(str()), paging: variant('mode', { all: {} }) });
		const example = exampleOf(schema.json);
		expect(example).toEqual({ id: 'example', tags: ['example'], paging: { mode: 'all' } });
		expect(validate(example, schema.json)).toEqual([]);
	});

	it.each([
		['[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}', '0'.repeat(32)],
		['^C[A-Z0-9]{8,}$', 'CAAAAAAAA'],
		['^(?:https?://)?\\w+\\.example\\.com/\\d+$', 'a.example.com/0'],
		['^(draft|sent)_\\d{2}[.-]x*?$', 'draft_00.'],
	])('builds a string that matches the pattern %s', (pattern, expected) => {
		const schema = str().with({ pattern }).json;
		expect(exampleOf(schema)).toBe(expected);
		expect(validate(expected, schema)).toEqual([]);
	});

	it('falls back for a pattern construct it does not know', () => {
		expect(exampleOf(str().with({ pattern: '^[^x]+$' }).json)).toBe('example');
		expect(exampleOf(str().with({ pattern: '^(?=a)a$' }).json)).toBe('example');
	});
});

describe('generateNodeModule', () => {
	const moduleOf = (...actions: Action[]) =>
		generateNodeModule(
			'todo',
			actions.map((action) => ({
				contract: toContract(action),
				nodeType: `@n8n/nodes-base-next.${action.id}`,
				resource: action.resource,
				operation: action.operation,
			})),
		);

	const list = variant('mode', {
		name: { name: str().hint('Exact list name') },
		id: { id: str().hint('Numeric list ID') },
	});
	const listAction = (operation: string, extra = {}) =>
		todo.resource('task').action(operation, {
			action: 'Find tasks',
			summary: 'Find tasks in a list.',
			flow: listTasks.flow,
			output: listTasks.output,
			async *run() {},
			input: {
				...extra,
				list,
				sort: variant('by', {
					field: { field: str().hint('Exact field name'), direction: oneOf('asc', 'desc') },
					rank: { field: str().hint('Exact field name'), weight: num() },
				}),
			},
		});

	it('wraps non-literal leaves in Value and keeps selectors literal', () => {
		const text = moduleOf(listTasks);
		expect(text).toContain('project: Value<I, C, string>;');
		expect(text).toContain('status?: "open" | "done";');
		expect(text).toContain('export const todo = {\n task: {\n  /** Get many tasks.');
		expect(text).toContain('contractStep("@n8n/nodes-base-next.todo.task.getAll", config)');
	});

	it('emits the composed node version and its slot for an action that owns a slot', () => {
		const slot = { typeVersion: 4, resource: 'task', operation: 'getAll' };
		const text = generateNodeModule('todo', [
			{
				contract: toContract(listTasks),
				nodeType: 'n8n-nodes-base.todo',
				resource: 'task',
				operation: 'getAll',
				slot,
			},
		]);
		expect(text).toContain(
			'contractStep("n8n-nodes-base.todo", config, 4, {"resource":"task","operation":"getAll"})',
		);
		// The types the agent reads stay the same; only the call differs.
		const call = /contractStep\(.*\)/;
		expect(text.replace(call, '')).toBe(moduleOf(listTasks).replace(call, ''));
	});

	it('emits the operation-only slot of a derived action', () => {
		const text = generateNodeModule('todo', [
			{
				contract: toContract(listTasks),
				nodeType: 'n8n-nodes-base.todo',
				operation: 'getAll',
				slot: { typeVersion: 2.1, operation: 'getAll' },
			},
		]);
		expect(text).toContain(
			'contractStep("n8n-nodes-base.todo", config, 2.1, {"operation":"getAll"})',
		);
	});

	it('types the outputs of a routed action, also outputs named by input entries', () => {
		const route = todo.resource('task').action('route', {
			action: 'Route tasks',
			summary: 'Route each task.',
			flow: { effect: 'transform', cardinality: 'per-item' },
			input: { cases: arr(obj({ output: str(), status: str() })) },
			output: listTasks.output,
			outputs: { each: 'cases', then: ['fallback'] },
			run: async ({ item }) => await Promise.resolve({ to: 'fallback', item }),
		});
		const check = todo.resource('task').action('check', {
			action: 'Check tasks',
			summary: 'Check each task.',
			flow: { effect: 'transform', cardinality: 'batch' },
			input: {},
			output: listTasks.output,
			outputs: ['open', 'done'],
			run: ({ items }) => items.map((item) => ({ to: 'open' as const, item })),
		});
		const text = moduleOf(route, check);
		expect(text).toContain(
			"import { contractStep, routedStep, type NodeSettings, type OutputOf, type RoutedStep, type Step, type Value } from '@n8n/workflow-sdk/next';",
		);
		expect(text).toContain(
			'(transform, per-item; outputs: one per cases entry, named by its output, then fallback)',
		);
		expect(text).toContain(
			' cases: ReadonlyArray<TodoTaskRouteInput<In, Ctx>["cases"][number] & { output: E }>;',
		);
		expect(text).toContain(
			'RoutedStep<In, Ctx, OutputOf<N, TodoTaskRouteOutput>, N, E | "fallback">',
		);
		expect(text).toContain(
			'routedStep("@n8n/nodes-base-next.todo.task.route", config, {"each":"cases","then":["fallback"]})',
		);
		expect(text).toContain(
			'RoutedStep<In, Ctx, OutputOf<N, TodoTaskCheckOutput>, N, "open" | "done">',
		);
		expect(text).toContain('(transform, batch; outputs: open | done)');
	});

	it('shows the key hint and the value types of an open key space', () => {
		const record = todo.resource('record').action('getAll', {
			action: 'Get many records',
			summary: 'List records.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output: obj({ id: str().hint('Record ID, not a field') }).with({
				patternProperties: { '^field_[a-z0-9_]+$': { 'x-n8n-hint': 'field_ + snake_case name' } },
				'x-n8n-value-types': { text: { type: 'string' } },
			}),
			async *run() {},
		});
		expect(moduleOf(record)).toContain(
			[
				' /** Record ID, not a field */',
				' id: string;',
				' /**',
				'  * field_ + snake_case name',
				'  * Value by property type:',
				'  * - text: string',
				'  */',
				' [key: `field_',
			].join('\n'),
		);
	});

	it('gives each key of an open input object a lambda type', () => {
		const append = todo.resource('row').action('append', {
			action: 'Append row',
			summary: 'Append a row.',
			flow: { effect: 'write', cardinality: 'per-item' },
			input: { values: json() },
			output: json(),
			run: async () => await Promise.resolve({}),
		});
		const text = moduleOf(append);
		expect(text).toContain('{ values: Value<I, C, { [key: string]: Value<I, C, OpenValue> }> }');
		expect(text).toContain('export type TodoRowAppendOutput = Record<string, unknown>;');
		expect(text).toContain(
			'import { contractStep, type OpenValue, type NodeSettings, type OutputOf,',
		);
		expect(moduleOf(listTasks)).not.toContain('OpenValue');
	});

	it('prints short objects without docs on one line', () => {
		expect(moduleOf(listTasks)).toContain(
			'paging: { mode: "all" } | { mode: "limit"; max?: Value<I, C, number> };',
		);
	});

	it('shows the action flow once, on the factory', () => {
		const text = moduleOf(listTasks);
		expect(text).toContain(
			'/** Get many tasks. List tasks in a project. (read, 1:N) */\n  getAll:',
		);
		expect(text.match(/List tasks in a project/g)).toHaveLength(1);
	});

	it('shows a field doc that repeats across union branches on the first branch only', () => {
		const text = moduleOf(listAction('search'));
		expect(text.match(/\/\*\* Exact field name \*\//g)).toHaveLength(1);
		expect(text).toContain('/** Numeric list ID */');
	});

	it('prints a field that every union branch shares once, beside the union', () => {
		expect(moduleOf(listAction('search'))).toContain(
			' sort: {\n  /** Exact field name */\n  field: Value<I, C, string>;\n } & ({ by: "field"; direction: "asc" | "desc" } | { by: "rank"; weight: Value<I, C, number> });',
		);
	});

	it('shows a field doc that an earlier action shows on the first action only', () => {
		const text = moduleOf(listTasks, listAction('search', { project: str().hint('Project ID') }));
		expect(text.match(/Project ID/g)).toHaveLength(1);
		expect(text).toContain(
			'export type TodoTaskSearchInput<I, C> = {\n project: Value<I, C, string>;',
		);
	});

	it('names a repeated type once and references the name', () => {
		const text = moduleOf(listAction('search'), listAction('find', { limit: num() }));
		expect(text).toContain('type TodoTaskSearchList<I, C> = {\n mode: "name";');
		expect(text.match(/list: TodoTaskSearchList<I, C>;/g)).toHaveLength(2);
		expect(text.match(/Exact list name/g)).toHaveLength(1);
		expect(text).toContain('export type TodoTaskFindOutput = TodoTaskSearchOutput;');
	});
});
