import {
	NodeApiError,
	safeRegex,
	UserError,
	type IExecuteFunctions,
	type INode,
	type JsonObject,
} from 'n8n-workflow';

import { generateNodeModule } from '../entry/codegen';
import { compat, credential } from '../entry/credentials';
import { exampleOf, resourceLookupsOf, toNodeType } from '../entry/host';
import { actionFileOf, lintContract, toContract } from '../entry/registry';
import {
	defineNode,
	isHttpError,
	path,
	t,
	validate,
	type Action,
	type AnySchema,
	type Http,
	type HttpRequest,
	type Infer,
	type JsonSchema,
	type RunInput,
} from '../index';
import { evaluateBundle } from '../runtime';
import { testPattern } from '../validate';
import { NODE_CONTRACT_VERSION } from '../version';

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credential: credential({ types: [compat('todoApi')] }),
	baseUrl: 'https://todo.test',
});

const task = todo.resource('task', { input: { project: t.str().hint('Project ID') } });

const listTasks = task.action('getAll', {
	action: 'Get many tasks',
	summary: 'List tasks in a project.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		paging: t.variant('mode', { all: {}, limit: { max: t.num().default(50) } }),
		status: t.oneOf('open', 'done').optional(),
	},
	output: t.obj({ id: t.str(), title: t.str(), tags: t.arr(t.str()) }),
	async *run({ input, http }) {
		const max = input.paging.mode === 'limit' ? input.paging.max : undefined;
		const body = await http.request({
			path: path`/projects/${input.project}/tasks`,
			query: { max },
		});
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
			output: t.obj({ ok: t.str() }),
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
		const output = t.obj({ id: t.str() });
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
		const pagingSchema = () => t.variant('mode', { all: {}, limit: { max: t.num().default(50) } });
		const all: Paging = { mode: 'all' };
		const limited: Paging = { mode: 'limit' };
		// @ts-expect-error `max` belongs to the limit branch only
		const wrong: Paging = { mode: 'all', max: 5 };
		expect([all, limited, wrong]).toHaveLength(3);
	});

	it('types a default field as set in run() and as optional for callers', () => {
		const input = { limit: t.num().default(50).hint('At most 100'), query: t.str().optional() };
		const inRun: RunInput<typeof input> = { limit: 5 };
		const limit: number = inRun.limit;
		// @ts-expect-error run() gets every default field
		const withoutDefault: RunInput<typeof input> = {};
		const fromCaller: Infer<ReturnType<typeof t.obj<typeof input>>> = {};
		expect([limit, withoutDefault, fromCaller]).toEqual([5, {}, {}]);
	});

	it('types a nested default as set in run() at any depth', () => {
		const input = {
			header: t.obj({ headerRow: t.num().default(1), sheet: t.str().optional() }).default({}),
			rows: t.arr(t.obj({ format: t.oneOf('RAW', 'USER_ENTERED').default('RAW') })),
			filter: t.obj({ max: t.num().default(10) }).optional(),
			paging: t.variant('mode', { all: {}, limit: { max: t.num().default(50) } }).default({
				mode: 'all',
			}),
		};
		type Run = RunInput<typeof input>;
		expectTypeOf<Run['header']>().toEqualTypeOf<{ headerRow: number; sheet?: string }>();
		expectTypeOf<Run['rows'][number]['format']>().toEqualTypeOf<'RAW' | 'USER_ENTERED'>();
		expectTypeOf<Run['filter']>().toEqualTypeOf<{ max: number } | undefined>();
		expectTypeOf<Extract<Run['paging'], { mode: 'limit' }>['max']>().toEqualTypeOf<number>();
		expectTypeOf<Infer<typeof input.header>>().toEqualTypeOf<{
			headerRow?: number;
			sheet?: string;
		}>();

		const read = task.action('read', {
			action: 'Read a task',
			summary: 'Read a task.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input,
			output: t.obj({ row: t.num() }),
			run: async ({ input: { header, project } }) =>
				await Promise.resolve({ row: header.headerRow + project.length }),
		});
		expect(read.id).toBe('todo.task.read');
	});

	it.each([
		[
			'date',
			t.date(),
			['2026-09-15', '2024-02-29'],
			['2026-02-30', '2026-9-15', '2026-09-15T09:30:00Z'],
		],
		[
			'date-time',
			t.dateTime(),
			['2026-09-15T09:30:00.000Z', '2026-09-15T09:30:00+02:00', '2026-09-15t09:30:00z'],
			['last tuesday', '2026-09-15', '2026-09-15T09:30:00', '2026-09-15T25:00:00Z'],
		],
		[
			'uri',
			t.uri(),
			['https://example.com/a?b=1', 'mailto:ada@example.com'],
			['/item/1', 'example.com', 'https://a b'],
		],
		[
			'email',
			t.email(),
			['ada@example.com', 'a.b+c@mail.example.org'],
			['ada', 'ada@', '@example.com', 'a@b@example.com', 'ada lovelace@example.com'],
		],
		[
			'uuid',
			t.uuid(),
			['8f14e45f-ceea-467a-9575-2a3b4c5d6e7f', '8F14E45F-CEEA-467A-9575-2A3B4C5D6E7F'],
			['8f14e45fceea467a95752a3b4c5d6e7f', '8f14e45f-ceea-467a-9575-2a3b4c5d6e7'],
		],
	])('builds a %s string that validate checks', (format, schema, valid, invalid) => {
		expect(schema.json).toEqual({ type: 'string', format });
		expect(valid.flatMap((value) => validate(value, schema.json))).toEqual([]);
		expect(invalid.map((value) => validate(value, schema.json))).toEqual(
			invalid.map((value) => [
				expect.stringMatching(`^input: "${value}" is not a ${format}, e.g. `),
			]),
		);
		expect(validate(exampleOf(schema.json), schema.json)).toEqual([]);
	});

	it('checks a format at run time only: an expression passes at build time', () => {
		const schema = t.dateTime().json;
		expect(validate('={{ $now }}', schema, { allowExpressions: true })).toEqual([]);
		expect(validate('x'.repeat(10_000), schema)).toHaveLength(1);
		expect(validate('anything', t.str().with({ format: 'hostname' }).json)).toEqual([]);
	});

	it('puts the format into the manifest input schema', () => {
		const due = task.action('due', {
			action: 'Set a due date',
			summary: 'Set the due date of a task.',
			flow: { effect: 'write', cardinality: 'per-item' },
			input: { due: t.dateTime() },
			output: t.obj({ due: t.dateTime() }),
			run: async ({ input }) => await Promise.resolve({ due: input.due }),
		});
		expect(toContract(due).input.properties?.due).toEqual({ type: 'string', format: 'date-time' });
		expect(lintContract(toContract(due))).toEqual([]);
	});

	it('lints the summary and the hints', () => {
		const prose = (summary: string, hint: string) =>
			lintContract(
				toContract(
					task.action('rename', {
						action: 'Rename a task',
						summary,
						flow: { effect: 'write', cardinality: 'per-item' },
						input: { name: t.str().hint(hint) },
						output: t.obj({}),
						run: async () => await Promise.resolve({}),
					}),
				),
			);
		expect(prose('Rename a task.', 'The new title')).toEqual([]);
		expect(prose(' ', 'A string')).toEqual([
			'todo.task.rename: summary is empty',
			'todo.task.rename: hint only names the type: A string',
		]);
		expect(prose('Rename a task', 'The new title.')).toEqual([
			'todo.task.rename: summary must end with a period',
			'todo.task.rename: hint must not end with a period: The new title.',
		]);
	});

	it('builds a nullable schema', () => {
		const assignee = t.nullable(t.str()).hint('null when unassigned');
		const value: Infer<typeof assignee> = null;
		expect(assignee.json).toEqual({
			anyOf: [{ type: 'string' }, { type: 'null' }],
			'x-n8n-hint': 'null when unassigned',
		});
		expect(validate(value, assignee.json)).toEqual([]);
		expect(validate(1, assignee.json)).toEqual(['input: does not match any allowed shape']);
		expect(t.nullable(t.str().optional()).isOptional).toBe(true);
	});

	it('builds a union of object schemas', () => {
		const invoice = t.obj({ id: t.str() });
		const line = t.obj({ sku: t.str(), invoiceId: t.str() });
		const either = t.union(invoice, line);
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

	it('validates a value without its tag against the variant whose tag is optional', () => {
		const tagged = (value: string, optional: boolean): JsonSchema => ({
			type: 'object',
			properties: { mode: { const: value }, [value]: { type: 'string' } },
			...(optional ? {} : { required: ['mode'] }),
			additionalProperties: false,
		});
		const schema: JsonSchema = {
			type: 'object',
			discriminator: { propertyName: 'mode' },
			oneOf: [tagged('all', true), tagged('limit', false)],
		};
		expect(validate({ all: 'x' }, schema)).toEqual([]);
		expect(validate({ limit: 'x' }, schema)).toEqual([
			'input: unknown field(s) limit. Allowed: mode, all',
		]);
		expect(validate({ limit: 'x' }, { ...schema, oneOf: [tagged('limit', false)] })).toEqual([
			'input: needs "mode" set to one of "limit"',
		]);
	});
});

function fakeContext(
	parameters: Record<string, unknown>,
	response: unknown,
	continueOnFail = false,
) {
	const requests: unknown[] = [];
	const hints: unknown[] = [];
	const context = {
		addExecutionHints: (...added: unknown[]) => hints.push(...added),
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
	return { context: context as unknown as IExecuteFunctions, requests, hints };
}

describe('resourceOutput', () => {
	const sheet = todo.resource('sheet', {
		input: { sheet: t.str().with({ pattern: '[0-9a-f]{8}' }).hint('Sheet ID or URL') },
	});
	const legacy = {
		nodeType: 'n8n-nodes-base.todo',
		methodName: 'getColumns',
		parameters: { resource: 'sheet' },
	};
	const readRows = sheet.action('read', {
		action: 'Read rows',
		summary: 'Read the rows of a sheet.',
		flow: { effect: 'read', cardinality: '1:N' },
		input: {},
		output: t.obj({ id: t.str() }),
		resourceOutput: {
			method: 'todo.sheetColumns',
			input: 'sheet',
			loadOptions: [
				{ ...legacy, version: 2, idParameter: 'sheetId' },
				{ ...legacy, version: 1, idParameter: 'sheet' },
			],
			toOutput: (fields) => t.obj({ id: t.str(), [fields[0]?.name ?? 'x']: t.str() }).json,
		},
		async *run() {},
	});
	const contract = toContract(readRows);

	it('puts the pointer without its hatch into the output of the contract document', () => {
		expect(contract.output['x-n8n-resource']).toEqual({
			method: 'todo.sheetColumns',
			input: 'sheet',
			loadOptions: [
				{ ...legacy, version: 2, idParameter: 'sheetId' },
				{ ...legacy, version: 1, idParameter: 'sheet' },
			],
		});
		expect(toContract(listTasks).output['x-n8n-resource']).toBeUndefined();
		expect(lintContract(contract)).toEqual([]);
	});

	it('types the input field of the pointer', () => {
		sheet.action('read', {
			action: 'Read rows',
			summary: 'Read the rows of a sheet.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output: t.obj({ id: t.str() }),
			resourceOutput: {
				method: 'todo.sheetColumns',
				// @ts-expect-error `table` is no input field
				input: 'table',
				loadOptions: [],
				toOutput: () => ({}),
			},
			async *run() {},
		});
	});

	it('gives the lookup calls in order, with the ID that the input pattern finds', () => {
		const calls = resourceLookupsOf(contract, { sheet: 'https://todo.test/s/0badcafe/rows' });
		expect(calls).toEqual([
			{
				nodeType: 'n8n-nodes-base.todo',
				version: 2,
				methodName: 'getColumns',
				currentNodeParameters: {
					resource: 'sheet',
					sheetId: { __rl: true, mode: 'id', value: '0badcafe' },
				},
			},
			{
				nodeType: 'n8n-nodes-base.todo',
				version: 1,
				methodName: 'getColumns',
				currentNodeParameters: {
					resource: 'sheet',
					sheet: { __rl: true, mode: 'id', value: '0badcafe' },
				},
			},
		]);
	});

	it('gives no call for an expression, a value without an ID, or a contract without a pointer', () => {
		expect(resourceLookupsOf(contract, { sheet: '={{ $json.sheet }}' })).toEqual([]);
		expect(resourceLookupsOf(contract, { sheet: 'no id here' })).toEqual([]);
		expect(resourceLookupsOf(contract, {})).toEqual([]);
		expect(resourceLookupsOf(toContract(listTasks), { project: '0badcafe' })).toEqual([]);
	});

	it('takes the whole value as the ID when the input field has no pattern, and none for a bad one', () => {
		const withSheet = (sheetField: JsonSchema) => ({
			...contract,
			input: { ...contract.input, properties: { sheet: sheetField } },
		});
		const open = withSheet({ type: 'string' });
		expect(resourceLookupsOf(withSheet({ pattern: '(' }), { sheet: 'Sheet 1' })).toEqual([]);
		expect(resourceLookupsOf(open, { sheet: 'Sheet 1' })[0]?.currentNodeParameters).toMatchObject({
			sheetId: { value: 'Sheet 1' },
		});
	});

	it('refuses a pointer to no input field, a pointer without calls, and a required typical field', () => {
		const pointer = contract.output['x-n8n-resource'];
		if (!pointer) throw new Error('no pointer');
		const output = {
			...contract.output,
			'x-n8n-resource': { ...pointer, input: 'table', loadOptions: [] },
			properties: { id: { type: 'string' as const, 'x-n8n-claim': 'typical' as const } },
			required: ['id'],
		};
		expect(lintContract({ ...contract, output })).toEqual([
			'todo.sheet.read: resourceOutput.input names no input field: table',
			'todo.sheet.read: resourceOutput lists no loadOptions call',
			'todo.sheet.read: output.id is typical, so it must not be required',
		]);
	});
});

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

	it('reads page value fields unresolved and resolves the other fields', async () => {
		const readPages = todo.action('readPages', {
			action: 'Read pages',
			summary: 'Read the page values.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: { url: t.str(), pages: t.obj({ next: t.pageValue(t.str()) }) },
			output: t.obj({ url: t.str(), next: t.str() }),
			async run({ input }) {
				return { url: input.url, next: input.pages.next };
			},
		});
		const stored: Record<string, unknown> = {
			url: '={{ $json.url }}',
			pages: { next: '={{ $response.body.next }}' },
		};
		const resolved: Record<string, unknown> = { url: 'https://todo.test/a' };
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({ name: 'Pages', credentials: { todoApi: { id: '1', name: 'Todo' } } }),
			getNodeParameter: (
				name: string,
				_item: number,
				_fallback: unknown,
				options?: { rawExpressions?: boolean },
			) => {
				if (options?.rawExpressions) return stored[name];
				if (name in resolved) return resolved[name];
				throw new Error('$response is not defined');
			},
			getCredentials: async () => ({}),
			continueOnFail: () => false,
		} as unknown as IExecuteFunctions;
		const result = await new (toNodeType(readPages))().execute?.call(context);
		expect(result).toEqual([
			[
				{
					json: { url: 'https://todo.test/a', next: '={{ $response.body.next }}' },
					pairedItem: { item: 0 },
				},
			],
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

	it('passes on an item whose output breaks the contract, with one warning per run', async () => {
		const bad = [{ id: 1, title: 'Write', tags: [] }];
		const { context, hints } = fakeContext({ project: 'p1', paging: { mode: 'all' } }, bad);
		const result = await new NodeType().execute?.call(context);
		expect(result).toEqual([
			[
				{ json: bad[0], pairedItem: { item: 0 } },
				{ json: bad[0], pairedItem: { item: 1 } },
			],
		]);
		expect(hints).toEqual([
			{
				type: 'warning',
				message:
					'The response of todo.task.getAll does not match its contract, so check the fields: output[0].id: must be string, got 1',
			},
		]);
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
			failure: { cause: 'rate-limited' },
			context: { itemIndex: 0 },
		});
	});
});

describe('path', () => {
	it('encodes each value as one path segment', () => {
		expect(path`/repos/${'a/../b'}/issues/${7}`).toBe('/repos/a%2F..%2Fb/issues/7');
		expect(path`/search`).toBe('/search');
	});

	it.each(['', '.', '..'])('refuses the value %j, which changes the path', (value) => {
		expect(() => path`/repos/${value}/issues`).toThrow(UserError);
	});

	it('refuses a path that does not start with one "/"', () => {
		expect(() => path`${'api'}/issues`).toThrow(UserError);
		expect(() => path`//${'evil.test'}/issues`).toThrow(UserError);
	});

	it('types a request path as a path value only', () => {
		const send = async (http: Http, id: string, count: number) => [
			await http.request({ path: path`/pages/${id}/${count}` }),
			await http.request({ url: `https://api.test/pages/${id}` }),
			// @ts-expect-error a value in a raw template is not encoded
			await http.request({ path: `/pages/${id}` }),
			// @ts-expect-error a value in a raw template is not encoded
			await http.request({ path: `/pages/${count}`, response: 'binary' }),
			// @ts-expect-error a literal path is a path value too, so one rule covers each request
			await http.request({ path: '/search' }),
		];
		const request: HttpRequest = { path: path`/search` };
		expect([send, request]).toHaveLength(2);
	});
});

describe('exampleOf', () => {
	it('builds a value that matches the output schema', () => {
		const schema = t.obj({
			id: t.str(),
			tags: t.arr(t.str()),
			paging: t.variant('mode', { all: {} }),
		});
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
		const schema = t.str().with({ pattern }).json;
		expect(exampleOf(schema)).toBe(expected);
		expect(validate(expected, schema)).toEqual([]);
	});

	it('falls back for a pattern construct it does not know', () => {
		expect(exampleOf(t.str().with({ pattern: '^[^x]+$' }).json)).toBe('example');
		expect(exampleOf(t.str().with({ pattern: '^(?=a)a$' }).json)).toBe('example');
	});
});

describe('testPattern', () => {
	const ID = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';
	const page = t.obj({ id: t.str().with({ pattern: ID }) }).with({
		patternProperties: { '^property_[a-z0-9_]+$': {} },
		additionalProperties: false,
	});
	const items = Array.from({ length: 300 }, (_, index) => ({
		id: '2a3b4c5d6e7f40818293a4b5c6d7e8f9',
		property_name: `Task ${index}`,
		property_story_points: index,
	}));

	afterEach(() => vi.restoreAllMocks());

	it('validates many items without a safeRegex call for a pattern with a linear match time', () => {
		const test = vi.spyOn(safeRegex, 'test');
		expect(items.flatMap((item) => validate(item, page.json))).toEqual([]);
		expect(validate({ id: 'x', other: 1 }, page.json)).toHaveLength(2);
		expect(test).not.toHaveBeenCalled();
	});

	it.each([
		['(a+)+$', 'a'.repeat(20)],
		['^[^@\\s]+@[^@\\s]+$', 'ada@example.com'],
		['a+b', 'aab'],
		['^(?:a|b){2,}$', 'ab'],
		['(a)\\1', 'aa'],
		['(?<=a)b', 'ab'],
		[ID, `${'0'.repeat(31)}g`.repeat(20)],
	])('leaves %s to safeRegex', (pattern, input) => {
		const test = vi.spyOn(safeRegex, 'test');
		expect(testPattern(pattern, input)).toBe(new RegExp(pattern).test(input));
		expect(test).toHaveBeenCalledWith(pattern, input, undefined);
	});

	it.each([
		[ID, ['2a3b4c5d-6e7f-4081-8293-a4b5c6d7e8f9', 'x', '']],
		['^property_[a-z0-9_]+$', ['property_a_1', 'property_', 'xproperty_a']],
		['^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$', ['n8n-io', '-n8n', 'a']],
		['^(?!\\.{1,2}$)[A-Za-z0-9._-]+$', ['..', 'a.b', '.']],
		['^(?:[CGDUW][A-Z0-9]{2,}|#?[a-z0-9_-]{1,80})$', ['C123', '#general', 'C']],
		[
			'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2})$',
			['2026-09-15T09:30Z', '2026-09-15'],
		],
		['^[\\]a]$', [']', 'a', 'b']],
	])('gives the safeRegex result for %s', (pattern, inputs) => {
		expect(inputs.map((input) => testPattern(pattern, input))).toEqual(
			inputs.map((input) => safeRegex.test(pattern, input)),
		);
	});

	it('throws the safeRegex error for an invalid pattern', () => {
		expect(() => testPattern('a(', 'a')).toThrow(/Invalid regular expression/);
	});

	it('is the safeRegex.test that a frozen bundle imports', () => {
		const bundle = `module.exports = { default: {
			id: 'demo.probe', version: 1, credentialTypes: [], run: () => [],
			probe: (pattern, input) => require('n8n-workflow').safeRegex.test(pattern, input),
		} };`;
		const { probe } = evaluateBundle(bundle, NODE_CONTRACT_VERSION) as unknown as {
			probe: (pattern: string, input: string) => boolean;
		};
		const test = vi.spyOn(safeRegex, 'test');
		expect([probe(ID, items[0].id), probe(ID, 'x')]).toEqual([true, false]);
		expect(test).not.toHaveBeenCalled();
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

	const list = t.variant('mode', {
		name: { name: t.str().hint('Exact list name') },
		id: { id: t.str().hint('Numeric list ID') },
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
				sort: t.variant('by', {
					field: { field: t.str().hint('Exact field name'), direction: t.oneOf('asc', 'desc') },
					rank: { field: t.str().hint('Exact field name'), weight: t.num() },
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
		const typesOf = (module: string) =>
			module.split('\n').filter((line) => line.startsWith('export type'));
		expect(typesOf(text)).toEqual(typesOf(moduleOf(listTasks)));
		// The host makes tool node types of its own actions only.
		expect(text).not.toContain('getAllTool');
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
			input: { cases: t.arr(t.obj({ output: t.str(), status: t.str() })) },
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
			'(transform, per-item; outputs: one per cases entry, named by its output, then fallback; hosts: todo.test)',
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
		expect(text).toContain('(transform, batch; outputs: open | done; hosts: todo.test)');
	});

	it('shows the key hint and the value types of an open key space', () => {
		const record = todo.resource('record').action('getAll', {
			action: 'Get many records',
			summary: 'List records.',
			flow: { effect: 'read', cardinality: '1:N' },
			input: {},
			output: t.obj({ id: t.str().hint('Record ID, not a field') }).with({
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
			input: { values: t.json() },
			output: t.json(),
			run: async () => await Promise.resolve({}),
		});
		const text = moduleOf(append);
		expect(text).toContain('{ values: Value<I, C, { [key: string]: Value<I, C, OpenValue> }> }');
		expect(text).toContain('export type TodoRowAppendOutput = Record<string, unknown>;');
		expect(text).toContain(
			'import { contractStep, contractTool, type OpenValue, type NodeSettings, type OutputOf,',
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
			'/** Get many tasks. List tasks in a project. (read, 1:N; hosts: todo.test) */\n  getAll:',
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
		const text = moduleOf(listTasks, listAction('search', { project: t.str().hint('Project ID') }));
		expect(text.match(/Project ID/g)).toHaveLength(1);
		expect(text).toContain(
			'export type TodoTaskSearchInput<I, C> = {\n project: Value<I, C, string>;',
		);
	});

	it('names a repeated type once and references the name', () => {
		const text = moduleOf(listAction('search'), listAction('find', { limit: t.num() }));
		expect(text).toContain('type TodoTaskSearchList<I, C> = {\n mode: "name";');
		expect(text.match(/list: TodoTaskSearchList<I, C>;/g)).toHaveLength(2);
		expect(text.match(/Exact list name/g)).toHaveLength(1);
		expect(text).toContain('export type TodoTaskFindOutput = TodoTaskSearchOutput;');
	});

	it('prints an optional output field as optional and nullable, a loose object all fields', () => {
		const outputAction = (operation: string, output: AnySchema) =>
			todo.resource('task').action(operation, {
				action: 'Get a task',
				summary: 'Get a task.',
				flow: { effect: 'read', cardinality: 'per-item' },
				input: {},
				output,
				async run() {
					return await Promise.resolve({});
				},
			});
		const text = moduleOf(
			outputAction(
				'get',
				t.obj({ id: t.str(), note: t.str().optional(), due: t.nullable(t.str()).optional() }),
			),
			outputAction('peek', t.loose(t.obj({ id: t.str(), done: t.bool() }))),
		);
		expect(text).toContain(
			'export type TodoTaskGetOutput = { id: string; note?: string | null; due?: string | null };',
		);
		expect(text).toContain(
			'export type TodoTaskPeekOutput = { id?: string | null; done?: boolean | null };',
		);
	});
});
