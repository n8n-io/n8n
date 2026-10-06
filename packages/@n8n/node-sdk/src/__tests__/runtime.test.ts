import Ajv2020 from 'ajv/dist/2020';
import {
	NodeApiError,
	NodeOperationError,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INode,
	type JsonObject,
} from 'n8n-workflow';

import { compat, credential, defineCredential, field } from '../entry/credentials';
import {
	defineNode,
	defineResource,
	isRecord,
	OperationalError,
	pages,
	pageValueOf,
	paging,
	parse,
	path,
	readAllAs,
	readAs,
	ref,
	Schema,
	t,
	UserError,
	validate,
	type Action,
	type ActionFlow,
	type HttpRequest,
	type Infer,
} from '../index';
import { toContract } from '../define';
import {
	executorOf,
	hostRuntime,
	lookupActionOf,
	outputsPerEntryOf,
	runLookup,
	toNodeType,
	toVersionedNodeType,
	type ExecutorHost,
} from '../runtime';
import { contractHash, NODE_CONTRACT_VERSION } from '../version';
import { mockHttp, runAction } from '../testing';

const echo = defineNode({
	id: 'echo',
	displayName: 'Echo',
	credential: credential({
		types: [compat('echoApi')],
		scopes: { 'items:read': 'Read items' },
		optional: true,
	}),
	baseUrl: 'https://echo.test',
});

const node: INode = {
	id: '1',
	name: 'Echo',
	type: 'echo',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const item = t.obj({ id: t.str() });
const echoItem = echo.resource('item');
type ListFlow = ActionFlow & { readonly cardinality: '1:N' };
const read: ListFlow = { effect: 'read', cardinality: '1:N' };
const fetchSpec = { action: 'Fetch items', summary: 'Fetch items.', input: {}, output: item };

/** An action that sends `request` once and yields the items of an array body. */
const fetchAction = (request: HttpRequest, flow: ListFlow = read) =>
	echoItem.action('fetch', {
		...fetchSpec,
		flow,
		async *run({ http }) {
			const body = await http.request(request);
			yield* Array.isArray(body) ? body : [];
		},
	});

/** A host whose requests answer from `replies` in order; a reply that is an Error throws. */
function hostOf(replies: unknown[], overrides: Partial<ExecutorHost> = {}) {
	const requests: IHttpRequestOptions[] = [];
	const waits: number[] = [];
	const host: ExecutorHost = {
		items: [{ json: {} }],
		node,
		parameter: () => undefined,
		request: async (options) => {
			requests.push(options);
			const reply = replies[requests.length - 1];
			if (reply instanceof Error) throw reply;
			return reply;
		},
		continueOnFail: () => false,
		wait: async (ms) => {
			waits.push(ms);
		},
		...overrides,
	};
	return { host, requests, waits };
}

const httpError = (status: number, headers: Record<string, string> = {}) =>
	Object.assign(new Error(`Request failed with status code ${status}`), {
		response: { status, headers, data: {} },
	});

describe('executorOf', () => {
	describe('parameters', () => {
		it('keeps a string field that holds JSON text as a string', async () => {
			const send = echo.resource('text').action('send', {
				action: 'Send text',
				summary: 'Echo the text.',
				flow: { effect: 'transform', cardinality: 'per-item' },
				input: { text: t.str(), data: t.json().optional() },
				output: t.obj({ text: t.str(), data: t.json().optional() }),
				async run({ input }) {
					return await Promise.resolve(input);
				},
			});
			const parameters: Record<string, unknown> = { text: '{"a":1}', data: '{"b":2}' };
			const { host } = hostOf([], { parameter: (name) => parameters[name] });
			const items = (await executorOf(send)(host))[0] ?? [];
			expect(items.map(({ json: value }) => value)).toEqual([{ text: '{"a":1}', data: { b: 2 } }]);
		});

		it('fills in nested defaults the same way in n8n and in runAction', async () => {
			const paged = echo.resource('page').action('read', {
				action: 'Read pages',
				summary: 'Read pages.',
				flow: { effect: 'read', cardinality: 'per-item' },
				input: { paging: t.obj({ size: t.int().default(25) }).optional() },
				output: t.obj({ size: t.int() }),
				async run({ input }) {
					return await Promise.resolve({ size: input.paging?.size ?? 0 });
				},
			});
			const { host } = hostOf([], { parameter: (name) => (name === 'paging' ? '{}' : undefined) });
			const [executed] = (await executorOf(paged)(host))[0] ?? [];
			const tested = await runAction(paged, { input: { paging: {} } });
			expect([executed?.json, tested]).toEqual([{ size: 25 }, { ok: true, items: [{ size: 25 }] }]);
		});
	});

	describe('setup placeholders', () => {
		it('asks for setup before the input check and before any request', async () => {
			const pattern = t.obj({ id: t.str().with({ pattern: '^[0-9a-f]{32}$' }) });
			const fetch = echoItem.action('get', {
				action: 'Get item',
				summary: 'Get an item.',
				flow: { effect: 'read', cardinality: 'per-item' },
				input: { target: pattern },
				output: t.loose(item),
				async run({ http }) {
					return parse(item, await http.request({ url: '/item' }));
				},
			});
			const parameters: Record<string, unknown> = {
				target: { id: '<__PLACEHOLDER_VALUE__Item ID__>' },
			};
			const { host, requests } = hostOf([], { parameter: (name) => parameters[name] });
			await expect(executorOf(fetch)(host)).rejects.toThrow(
				'Needs setup: fill input.target.id (<__PLACEHOLDER_VALUE__Item ID__>) before the run',
			);
			expect(requests).toHaveLength(0);
		});
	});

	describe('retries', () => {
		it('retries a transient failure of an idempotent request, honouring Retry-After', async () => {
			const reset = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
			const { host, requests, waits } = hostOf([
				httpError(503, { 'Retry-After': '2' }),
				reset,
				[{ id: 'a' }],
			]);
			const items = (await executorOf(fetchAction({ path: path`/items` }))(host))[0] ?? [];
			expect(items.map(({ json: value }) => value)).toEqual([{ id: 'a' }]);
			expect(requests).toHaveLength(3);
			expect(waits[0]).toBe(2000);
			expect(waits[1]).toBeLessThanOrEqual(1000);
		});

		it('stops after three retries', async () => {
			const { host, requests } = hostOf([1, 2, 3, 4, 5].map(() => httpError(429)));
			await expect(executorOf(fetchAction({ path: path`/items` }))(host)).rejects.toThrow('429');
			expect(requests).toHaveLength(4);
		});

		it('does not retry a POST unless the action is idempotent or the request opts in', async () => {
			const cases: Array<[HttpRequest, ListFlow, number]> = [
				[{ method: 'POST', path: path`/items` }, read, 1],
				[{ method: 'POST', path: path`/items` }, { ...read, idempotent: true }, 2],
				[{ method: 'POST', path: path`/items`, retry: true }, read, 2],
				[{ path: path`/items`, retry: false }, read, 1],
				[{ path: path`/items` }, read, 1],
			];
			const counts = await Promise.all(
				cases.map(async ([request, flow], index) => {
					// The last case fails with a status that a retry cannot fix.
					const status = index === cases.length - 1 ? 500 : 502;
					const { host, requests } = hostOf([httpError(status), []]);
					await executorOf(fetchAction(request, flow))(host).catch(() => undefined);
					return requests.length;
				}),
			);
			expect(counts).toEqual(cases.map(([, , expected]) => expected));
		});
	});

	describe('limits', () => {
		it('sends a 300 s timeout unless the request sets timeoutMs', async () => {
			const first = hostOf([[]]);
			await executorOf(fetchAction({ path: path`/items` }))(first.host);
			const second = hostOf([[]]);
			await executorOf(fetchAction({ path: path`/items`, timeoutMs: 5000 }))(second.host);
			expect([first.requests[0]?.timeout, second.requests[0]?.timeout]).toEqual([300_000, 5000]);
		});

		it('fails a run that sends more requests or yields more items than the host allows', async () => {
			const pager = echoItem.action('page', {
				...fetchSpec,
				flow: read,
				async *run({ http }) {
					for (const page of [1, 2, 3]) {
						await http.request({ path: path`/items`, query: { page } });
						yield { id: String(page) };
					}
				},
			});
			const requests = hostOf([[], [], []], { limits: { maxRequests: 2 } });
			await expect(executorOf(pager)(requests.host)).rejects.toThrow(
				'echo.item.page sent 2 requests for one input item, the most one run may send',
			);
			const items = hostOf([[], [], []], { limits: { maxItems: 2 } });
			await expect(executorOf(pager)(items.host)).rejects.toThrow(
				'echo.item.page yielded 2 items for one input item, the most one run may yield',
			);
		});

		it('asks the client to stop at the response limit, and names the limit when it stops', async () => {
			const action = fetchAction({ path: path`/items` });
			const under = hostOf([[{ id: 'a' }]], { maxResponseBytes: 1024 });
			await expect(executorOf(action)(under.host)).resolves.toMatchObject([
				[{ json: { id: 'a' } }],
			]);
			expect(under.requests[0]).toMatchObject({ maxResponseBytes: 1024 });

			const stopped = Object.assign(new Error('maxContentLength size of 1024 exceeded'), {
				code: 'ERR_BAD_RESPONSE',
			});
			const over = hostOf([new NodeApiError(node, stopped as unknown as JsonObject)], {
				maxResponseBytes: 1024,
			});
			await expect(executorOf(action)(over.host)).rejects.toThrow(
				'echo.item.fetch got a response larger than 1024 bytes, the most one response may have. The n8n setting N8N_NODE_RESPONSE_SIZE_MAX sets the limit',
			);
			expect(over.requests).toHaveLength(1);

			const unlimited = hostOf([[]], { maxResponseBytes: Infinity });
			await executorOf(action)(unlimited.host);
			expect(unlimited.requests[0]).not.toHaveProperty('maxResponseBytes');
		});

		it('gives run() limits that it cannot change', async () => {
			const raise = echoItem.action('raise', {
				...fetchSpec,
				flow: read,
				async *run({ http, limits }) {
					Object.assign(limits, { maxRequests: 10 });
					await http.request({ path: path`/items` });
					yield { id: 'a' };
				},
			});
			const { host, requests } = hostOf([[]], { limits: { maxRequests: 0 } });
			await expect(executorOf(raise)(host)).rejects.toMatchObject({ cause: { name: 'TypeError' } });
			expect(requests).toHaveLength(0);
		});

		it('keeps the first 100 log lines of an execution, each cut to 2000 characters', async () => {
			const chatty = echoItem.action('chatty', {
				...fetchSpec,
				flow: read,
				async *run({ log }) {
					Array.from({ length: 150 }).forEach(() => log('info', 'x'.repeat(3000)));
					yield* [];
				},
			});
			const lines: Array<[string, string]> = [];
			const { host } = hostOf([], {
				log: (level, message) => lines.push([level, message]),
			});
			await executorOf(chatty)(host);
			expect(lines).toHaveLength(101);
			expect(lines[0]?.[1]).toHaveLength(2000);
			expect(lines[100]).toEqual([
				'warn',
				'echo.item.chatty logged 100 lines. n8n drops the rest.',
			]);
		});

		it('fails on the first bad item, before the next page downloads', async () => {
			const pager = echoItem.action('fetch', {
				...fetchSpec,
				flow: read,
				// @ts-expect-error the output needs a string id
				async *run({ http }) {
					for (const page of [1, 2]) {
						await http.request({ path: path`/items`, query: { page } });
						yield { id: page };
					}
				},
			});
			const { host, requests } = hostOf([[], []]);
			await expect(executorOf(pager)(host)).rejects.toThrow(
				'Output does not match the contract: output[0].id: must be string, got 1',
			);
			expect(requests).toHaveLength(1);
		});
	});

	describe('cardinality', () => {
		it('fails a 1:N run that returns instead of yielding', async () => {
			// A bundle has no types, so the executor checks what run() gives back.
			const returning = {
				...fetchAction({ path: path`/items` }),
				run: async () => await Promise.resolve({ id: 'a' }),
			} as unknown as Action;
			await expect(executorOf(returning)(hostOf([]).host)).rejects.toThrow(
				'echo.item.fetch is 1:N, so run() must give its outputs as a list or yield them',
			);
		});
	});

	describe('lineage', () => {
		it('pairs each output with its input item, also for an error item', async () => {
			const replies = [[{ id: 'a' }, { id: 'b' }], httpError(404)];
			const { host } = hostOf(replies, {
				items: [{ json: {} }, { json: {} }],
				continueOnFail: () => true,
			});
			const items = (await executorOf(fetchAction({ path: path`/items` }))(host))[0] ?? [];
			expect(items).toEqual([
				{ json: { id: 'a' }, pairedItem: { item: 0 } },
				{ json: { id: 'b' }, pairedItem: { item: 0 } },
				// n8n routes an item with only `error` to the error output (continueErrorOutput).
				{ json: { error: 'Request failed with status code 404' }, pairedItem: { item: 1 } },
			]);
		});
	});
});

describe('types', () => {
	it('rejects a request without a URL, a relative path, a foreign credential', () => {
		const requests: HttpRequest[] = [
			{ url: 'https://echo.test/items' },
			{ path: path`/items` },
			// @ts-expect-error a request needs `url` or `path`
			{},
			// @ts-expect-error `path` starts with a slash
			{ path: 'items' },
			// @ts-expect-error `url` and `path` exclude each other
			{ url: 'https://echo.test', path: '/items' },
		];
		const definition = { ...fetchSpec, flow: read, async *run() {} };
		echoItem.action('fetch', { ...definition, scopes: ['items:read'] });
		// @ts-expect-error the scope is not one of the node's credential
		echoItem.action('fetch', { ...definition, scopes: ['items:write'] });
		expect(requests).toHaveLength(5);
	});
});

describe('parse', () => {
	it('passes the value through as a loose type and never throws', () => {
		const page = t.obj({ items: t.arr(item) });
		expect(parse(page, { items: [{ id: 'a' }] }).items?.[0]?.id).toBe('a');
		expect(parse(page, { items: [{ id: 1 }] })).toEqual({ items: [{ id: 1 }] });
		// @ts-expect-error a decoded field may be absent
		expect(() => parse(page, {}).items.length).toThrow(TypeError);
	});

	it('gives an empty value when the value is not of the schema kind', () => {
		expect(parse(t.obj({ id: t.str() }), null)).toEqual({});
		expect(parse(t.arr(item), { id: 'a' })).toEqual([]);
		expect(parse(t.str(), 1)).toBe(1);
	});
});

describe('readAs', () => {
	const page = t.obj({
		results: t.arr(t.obj({ id: t.str(), title: t.str() })),
		meta: t.obj({ cursor: t.str() }),
		total: t.int(),
	});
	const value = { results: [{ id: 'a' }], meta: { cursor: 'c2', extra: 1 } };
	const read = (body: Infer<typeof page>) => [body.results.map(({ id }) => id), body.meta.cursor];

	it('gives the fields that the code does not read as drift', () => {
		expect(readAs(page, value, { path: 'page', read })).toEqual({
			value,
			drift: [
				'page.total: is required',
				'page.results[0].title: is required',
				'page.meta: unknown field(s) extra. Allowed: cursor',
			],
		});
		expect(readAs(page, { results: [], meta: { cursor: 'c' }, total: 1 }).drift).toEqual([]);
	});

	it('fails on a field that the code reads, and on a value of another kind', () => {
		expect(() => readAs(page, { ...value, results: [{}] }, { path: 'page', read })).toThrow(
			'page.results[0].id: is required',
		);
		expect(() => readAs(page, { ...value, meta: { cursor: 2 } }, { read })).toThrow(
			'value.meta.cursor: must be string, got 2',
		);
		expect(() => readAs(page, 'x', { read })).toThrow('value: must be object, got "x"');
	});

	it('fails with every issue when the code cannot read the value', () => {
		expect(() => readAs(page, { results: [] }, { read })).toThrow(
			'value.meta: is required; value.total: is required',
		);
	});
});

describe('readAllAs', () => {
	const item = t.obj({ id: t.str(), title: t.str() });
	const values = [
		{ id: 'a', title: 'A' },
		{ id: 'b' },
		undefined,
		{ id: 'c', title: 'C', extra: 1 },
	];
	const read = (value: Infer<typeof item>) => value.id;

	afterEach(() => vi.restoreAllMocks());

	it('gives what readAs gives for each value', () => {
		expect(readAllAs(item, values)).toEqual(values.map((value) => readAs(item, value)));
		expect(readAllAs(item, values, { path: 'row', read })).toEqual(
			values.map((value) => readAs(item, value, { path: 'row', read })),
		);
		expect(readAllAs(item, [])).toEqual([]);
	});

	it('fails with the issues of the first value whose read fields do not match', () => {
		const failing = [{ id: 'a' }, { title: 'B' }, 'x'];
		expect(() => readAllAs(item, failing, { read })).toThrow('value.id: is required');
		expect(() => readAllAs(item, ['x', 1])).toThrow('value: must be object, got "x"');
		expect(() => readAllAs(t.str(), [1], { path: 'token' })).toThrow(
			'token: must be string, got [REDACTED]',
		);
		expect(() => readAs(t.str(), 1, { path: 'token' })).toThrow(
			'token: must be string, got [REDACTED]',
		);
	});

	it('validates all values in one call, also with a ref into $defs', () => {
		const compile = Ajv2020.prototype.compile;
		const checked: unknown[] = [];
		const compiled: unknown[] = [];
		vi.spyOn(Ajv2020.prototype, 'compile').mockImplementation(function (
			this: Ajv2020,
			...args: Parameters<Ajv2020['compile']>
		) {
			compiled.push(args[0]);
			return new Proxy(compile.apply(this, args), {
				apply: (target, self, params: unknown[]) => {
					checked.push(params[0]);
					return Reflect.apply(target, self, params);
				},
			});
		} as never);
		const counted = new Schema<{ n: number }>(
			{
				type: 'object',
				properties: { n: { $ref: '#/$defs/count' } },
				$defs: { count: { type: 'integer' } },
			} as never,
			false,
		);
		const rows = [{ n: 1 }, { n: 'x' }];
		expect(readAllAs(counted, rows)).toEqual([
			{ value: { n: 1 }, drift: [] },
			{ value: { n: 'x' }, drift: ['value.n: must be integer, got "x"'] },
		]);
		expect(checked).toEqual([rows]);
		expect(compiled).toHaveLength(1);
		expect(JSON.stringify(compiled[0]).match(/"\$defs"/g)).toHaveLength(1);
	});
});

describe('loose', () => {
	const issue = t.loose(
		t.obj({ id: t.int(), locked: t.bool(), pull_request: t.obj({ url: t.str() }) }),
	);

	it('makes each field optional and nullable, at any depth', () => {
		expect(validate({ id: 1, pull_request: null }, issue.json)).toEqual([]);
		expect(validate({ pull_request: { url: null } }, issue.json)).toEqual([]);
		expect(validate({ id: 'x' }, issue.json)).toEqual([
			'input.id: does not match any allowed shape',
		]);
		const value: Infer<typeof issue> = { id: null, pull_request: {} };
		// @ts-expect-error a loose field is still typed
		const wrong: Infer<typeof issue> = { id: 'x' };
		expect([value, wrong]).toHaveLength(2);
	});
});

describe('output drift', () => {
	const strictIssue = t.obj({
		id: t.int(),
		locked: t.bool(),
		pull_request: t.obj({ html_url: t.str() }).optional(),
	});
	// The sweep-409 body: an issue without `locked`, and `pull_request: null`.
	const body = [
		{ id: 1, pull_request: null },
		{ id: 2, locked: false },
	];
	const passing = echoItem.action('list', {
		...fetchSpec,
		flow: read,
		output: strictIssue,
		// @ts-expect-error the body passes on without a check, as in a bundle without types
		async *run({ http }) {
			yield* parse(t.arr(strictIssue), await http.request({ path: path`/issues` }));
		},
	});

	it('emits every item and gives one warning with the paths on an n8n host', async () => {
		const warnings: string[] = [];
		const { host } = hostOf([body], { warn: (message) => warnings.push(message) });
		const items = (await executorOf(passing)(host))[0] ?? [];
		expect(items.map(({ json }) => json)).toEqual(body);
		expect(warnings).toEqual([
			'The response of echo.item.list does not match its contract, so check the fields: output[0].locked: is required; output[0].pull_request: must be object, got null',
		]);
	});

	it('fails on a strict host, so tests and fixtures show the drift', async () => {
		await expect(executorOf(passing)(hostOf([body]).host)).rejects.toThrow(
			'Output does not match the contract: output[0].locked: is required',
		);
	});
});

describe('validate messages', () => {
	it('truncate long values and redact secrets', () => {
		const schema = t.obj({ body: t.int(), apiKey: t.int(), note: t.int() }).json;
		const [body, apiKey, note] = validate(
			{ body: 'x'.repeat(200), apiKey: 'k-123', note: 'Bearer abcdefghijklmnop' },
			schema,
		);
		expect(body).toBe(`input.body: must be integer, got "${'x'.repeat(78)}…`);
		expect(apiKey).toBe('input.apiKey: must be integer, got [REDACTED]');
		expect(note).toBe('input.note: must be integer, got "[REDACTED]"');
	});
});

describe('runAction', () => {
	it('aborts a request after timeoutMs', async () => {
		const hang: typeof fetch = async (_url, init) =>
			await new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () => {
					const reason: unknown = init.signal?.reason;
					reject(reason instanceof Error ? reason : new Error('aborted'));
				});
			});
		const result = await runAction(
			fetchAction({ path: path`/items`, timeoutMs: 10, retry: false }),
			{
				input: {},
				fetch: hang,
			},
		);
		expect(result).toEqual({ ok: false, error: { message: expect.stringMatching(/timeout/i) } });
	});

	it('retries a 429 with the mock routes', async () => {
		const fetch = mockHttp([
			{ path: '/items', times: 1, reply: { status: 429, headers: { 'retry-after': '0' } } },
			{ path: '/items', reply: { json: [{ id: 'a' }] } },
		]);
		const result = await runAction(fetchAction({ path: path`/items` }), { input: {}, fetch });
		expect(result).toEqual({ ok: true, items: [{ id: 'a' }] });
		expect(fetch.calls).toHaveLength(2);
	});
});

describe('pages', () => {
	const itemPage = t.obj({ items: t.arr(item), next: t.str().optional() });
	/** An action that lists `/items` pages by cursor and yields each item. */
	const pagedAction = (limit?: number, maxPages?: number) =>
		echoItem.action('list', {
			action: 'List items',
			summary: 'List items.',
			flow: read,
			input: {},
			output: t.loose(item),
			async *run({ http }) {
				yield* pages(http, {
					page: itemPage,
					request: (cursor, room) => ({ path: path`/items`, query: { cursor, size: room } }),
					items: (body) => body.items,
					next: (body) => body.next,
					limit,
					maxPages,
				});
			},
		});
	const page = (ids: string[], next?: string) => ({ items: ids.map((id) => ({ id })), next });

	it('follows the cursor to the last page', async () => {
		const { host, requests } = hostOf([page(['a', 'b'], 'c2'), page(['c'])]);
		const items = (await executorOf(pagedAction())(host))[0] ?? [];
		expect(items.map(({ json: value }) => value.id)).toEqual(['a', 'b', 'c']);
		expect(requests.map(({ qs }) => qs)).toEqual([{}, { cursor: 'c2' }]);
	});

	it('asks each page for the room the limit leaves and stops at the limit', async () => {
		const { host, requests } = hostOf([page(['a', 'b'], 'c2'), page(['c', 'd'], 'c3')]);
		const items = (await executorOf(pagedAction(3))(host))[0] ?? [];
		expect(items.map(({ json: value }) => value.id)).toEqual(['a', 'b', 'c']);
		expect(requests.map(({ qs }) => qs)).toEqual([{ size: 3 }, { cursor: 'c2', size: 1 }]);
	});

	it('stops when the API repeats a cursor', async () => {
		const { host, requests } = hostOf([page(['a'], 'same'), page(['b'], 'same'), page(['c'])]);
		await executorOf(pagedAction())(host);
		expect(requests).toHaveLength(2);
	});

	it('stops after maxPages pages', async () => {
		const { host, requests } = hostOf([page(['a'], 'c2'), page(['b'], 'c3'), page(['c'])]);
		await executorOf(pagedAction(undefined, 2))(host);
		expect(requests).toHaveLength(2);
	});

	it('fails a page in another shape with the path of the field', async () => {
		const { host } = hostOf([{ items: 'x' }]);
		await expect(executorOf(pagedAction())(host)).rejects.toThrow(
			'page.items: must be array, got "x"',
		);
	});

	it('passes a page whose unread fields drift', async () => {
		const { host } = hostOf([{ items: [{ id: 'a' }], next: 'c2', extra: 1 }, { items: [] }]);
		const items = (await executorOf(pagedAction())(host))[0] ?? [];
		expect(items.map(({ json }) => json.id)).toEqual(['a']);
	});
});

describe('pageValueOf', () => {
	const page = {
		body: { data: [{ id: 'a' }, { id: 'b' }], meta: { 'next-page': 3 }, has_more: true },
		headers: { link: '<https://x.test/2>; rel="next"' },
		statusCode: 200,
	};

	it('reads fields, list items, at, first and last of $response', () => {
		const read = (expression: string) => pageValueOf(expression, page);
		expect(read('={{ $response.body.data.at(-1)?.id }}')).toBe('b');
		expect(read('={{ $response.body.data.first().id }}')).toBe('a');
		expect(read("={{ $response.body.data.last()['id'] }}")).toBe('b');
		expect(read('={{ $response.body.data[0].id }}')).toBe('a');
		expect(read('={{ $response.body.meta["next-page"] }}')).toBe(3);
		expect(read('={{ $response.headers.link }}')).toBe(page.headers.link);
		expect(read('={{ $response.statusCode }}')).toBe(200);
		expect(read('={{ $response.body.missing.deeper }}')).toBeUndefined();
		expect(read('={{ $response.body.constructor }}')).toBeUndefined();
	});

	it('refuses an expression that is more than a read of $response', () => {
		['={{ !$response.body.has_more }}', '={{ $json.id }}', '={{ $response.body.f() }}'].forEach(
			(expression) => {
				expect(() => pageValueOf(expression, page)).toThrow(
					'A page value reads fields of $response',
				);
			},
		);
	});

	it('is checked at build time against the expressions it reads', () => {
		const schema = t.obj({ next: t.pageValue(t.str()) }).json;
		const check = (next: string) => validate({ next }, schema, { allowExpressions: true });
		expect(check('={{ $response.body.data.at(-1)?.id }}')).toEqual([]);
		expect(check('={{ !$response.body.done }}')).toEqual([
			'input.next: must read fields of $response, e.g. (page) => page.body.next_cursor',
		]);
	});
});

describe('list binding', () => {
	const message = t.obj({ id: t.str() });
	const historyPage = t.obj({
		messages: t.arr(message),
		response_metadata: t.obj({ next_cursor: t.str().optional() }).optional(),
	});
	const history = echoItem.action('history', {
		action: 'Get history',
		summary: 'List the messages of a channel.',
		flow: read,
		input: { channel: t.str() },
		output: message,
		list: {
			path: '/history',
			query: { channel: { input: 'channel' } },
			response: historyPage,
			items: (page) => page.messages,
			pages: {
				style: 'cursor',
				next: (page) => page.response_metadata?.next_cursor,
				send: { query: 'cursor' },
				size: { query: 'limit', max: 2 },
			},
		},
	});
	const messages = (ids: string[]) => ids.map((id) => ({ id }));
	const ids = (result: Awaited<ReturnType<typeof runAction>>) =>
		result.ok ? result.items.map((entry) => (isRecord(entry) ? entry.id : undefined)) : result;

	it('follows a cursor and asks each page for the room the paging limit leaves', async () => {
		const fetch = mockHttp([
			{
				path: '/history',
				query: { cursor: 'c2' },
				reply: { json: { messages: messages(['c']), response_metadata: { next_cursor: '' } } },
			},
			{
				path: '/history',
				reply: {
					json: { messages: messages(['a', 'b']), response_metadata: { next_cursor: 'c2' } },
				},
			},
		]);
		const input = { channel: 'C1', paging: { mode: 'limit', max: 3 } };
		expect(ids(await runAction(history, { input, fetch }))).toEqual(['a', 'b', 'c']);
		expect(fetch.calls.map(({ query }) => query)).toEqual([
			{ channel: 'C1', limit: '2' },
			{ channel: 'C1', limit: '1', cursor: 'c2' },
		]);
	});

	it('gives a paged list the standard paging input with a limit of 50', async () => {
		expect(history.inputSchema.properties?.paging).toEqual(paging.json);
		const many = Array.from({ length: 60 }, (_, index) => `m${index}`);
		const fetch = mockHttp([
			{
				path: '/history',
				reply: { json: { messages: messages(many), response_metadata: { next_cursor: 'c2' } } },
			},
		]);
		const result = await runAction(history, { input: { channel: 'C1' }, fetch });
		expect(ids(result)).toEqual(many.slice(0, 50));
		expect(fetch.calls).toHaveLength(1);
	});

	it('stops when the API repeats a cursor', async () => {
		const fetch = mockHttp([
			{
				path: '/history',
				reply: { json: { messages: messages(['a']), response_metadata: { next_cursor: 'same' } } },
			},
		]);
		const input = { channel: 'C1', paging: { mode: 'all' } };
		expect(ids(await runAction(history, { input, fetch }))).toEqual(['a', 'a']);
		expect(fetch.calls).toHaveLength(2);
	});

	describe('page drift', () => {
		const counted = echoItem.action('counted', {
			action: 'Get counted history',
			summary: 'List the messages of a channel with a total.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/history',
				response: t.obj({ messages: t.arr(t.obj({ id: t.str(), ts: t.str() })), total: t.int() }),
				items: (page) => page.messages.map(({ id }) => ({ id })),
			},
		});
		const warningHost = (reply: unknown, warnings: string[] = []) =>
			hostOf([reply], { warn: (text) => warnings.push(text) }).host;

		it('passes a page whose unread fields drift, with one warning on an n8n host', async () => {
			const warnings: string[] = [];
			const host = warningHost({ messages: [{ id: 'a' }] }, warnings);
			const items = (await executorOf(counted)(host))[0] ?? [];
			expect(items.map(({ json }) => json)).toEqual([{ id: 'a' }]);
			expect(warnings).toEqual([
				'The response of echo.item.counted does not match its contract, so check the fields: page.total: is required; page.messages[0].ts: is required',
			]);
		});

		it('fails a page whose items drift on an n8n host', async () => {
			const host = warningHost({ messages: 'x', total: 1 });
			await expect(executorOf(counted)(host)).rejects.toThrow(
				'page.messages: must be array, got "x"',
			);
			const missingId = warningHost({ messages: [{ ts: '1' }], total: 1 });
			await expect(executorOf(counted)(missingId)).rejects.toThrow(
				'page.messages[0].id: is required',
			);
		});

		it('fails a page whose unread fields drift on a strict host', async () => {
			const { host } = hostOf([{ messages: [{ id: 'a', ts: '1' }] }]);
			await expect(executorOf(counted)(host)).rejects.toThrow('page.total: is required');
		});
	});

	it('fails a page in another shape with the path of the field', async () => {
		const fetch = mockHttp([{ path: '/history', reply: { json: { messages: 'x' } } }]);
		const result = await runAction(history, { input: { channel: 'C1' }, fetch });
		expect(result).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('page.messages: must be array, got "x"') },
		});
	});

	it('follows the next link of the Link header, with encoded path fields', async () => {
		const issues = echoItem.action('issues', {
			action: 'Get issues',
			summary: 'List the issues of a repository.',
			flow: read,
			input: { owner: t.str(), withDrafts: t.bool().default(false) },
			output: t.obj({ id: t.str(), draft: t.bool() }),
			list: {
				path: '/repos/{owner}/issues',
				response: t.arr(t.obj({ id: t.str(), draft: t.bool() })),
				items: (page, input) => page.filter((entry) => input.withDrafts || !entry.draft),
				pages: { style: 'link', size: { query: 'per_page', max: 100 } },
			},
		});
		const next = 'https://echo.test/repos/a%2Fb/issues?per_page=50&page=2';
		const fetch = mockHttp([
			{
				path: '/repos/a%2Fb/issues',
				query: { page: '2' },
				reply: { json: [{ id: 'c', draft: false }] },
			},
			{
				path: '/repos/a%2Fb/issues',
				reply: {
					json: [
						{ id: 'a', draft: false },
						{ id: 'b', draft: true },
					],
					headers: { link: `<${next}>; rel="next", <https://echo.test/x?page=9>; rel="last"` },
				},
			},
		]);
		expect(ids(await runAction(issues, { input: { owner: 'a/b' }, fetch }))).toEqual(['a', 'c']);
		expect(fetch.calls.map(({ url }) => url)).toEqual([
			'https://echo.test/repos/a%2Fb/issues?per_page=50',
			next,
		]);
	});

	it('counts items as the offset and stops at a page with fewer items than the page size', async () => {
		const rows = echoItem.action('rows', {
			action: 'Get rows',
			summary: 'List rows.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/rows',
				response: t.arr(message),
				items: (page) => page,
				pages: {
					style: 'offset',
					unit: 'item',
					send: { query: 'offset' },
					size: { query: 'limit', max: 2 },
				},
			},
		});
		const fetch = mockHttp([
			{ path: '/rows', query: { offset: '2' }, reply: { json: messages(['c']) } },
			{ path: '/rows', reply: { json: messages(['a', 'b']) } },
		]);
		const input = { paging: { mode: 'all' } };
		expect(ids(await runAction(rows, { input, fetch }))).toEqual(['a', 'b', 'c']);
		expect(fetch.calls.map(({ query }) => query)).toEqual([
			{ limit: '2' },
			{ limit: '2', offset: '2' },
		]);
	});

	it('counts page numbers and stops at an empty page', async () => {
		const numbered = echoItem.action('numbered', {
			action: 'Get numbered pages',
			summary: 'List items by page number.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/items',
				response: t.obj({ items: t.arr(message) }),
				items: (page) => page.items,
				pages: { style: 'offset', unit: 'page', send: { query: 'page' } },
			},
		});
		const fetch = mockHttp([
			{ path: '/items', query: { page: '2' }, reply: { json: { items: messages(['c']) } } },
			{ path: '/items', query: { page: '3' }, reply: { json: { items: [] } } },
			{ path: '/items', reply: { json: { items: messages(['a', 'b']) } } },
		]);
		expect(ids(await runAction(numbered, { input: {}, fetch }))).toEqual(['a', 'b', 'c']);
		expect(fetch.calls.map(({ query }) => query)).toEqual([{}, { page: '2' }, { page: '3' }]);
	});

	it('sends one request without pages, and adds no paging input', async () => {
		const once = echoItem.action('once', {
			action: 'Get once',
			summary: 'List items in one request.',
			flow: read,
			input: {},
			output: message,
			list: { path: '/items', response: t.arr(message), items: (page) => page },
		});
		const fetch = mockHttp([{ path: '/items', reply: { json: messages(['a']) } }]);
		expect(ids(await runAction(once, { input: {}, fetch }))).toEqual(['a']);
		expect(once.inputSchema.properties).not.toHaveProperty('paging');
	});

	it('types the page, the input, the style and the items', () => {
		echoItem.action('history', {
			action: 'Get history',
			summary: 'List the messages of a channel.',
			flow: read,
			input: { channel: t.str() },
			output: message,
			list: {
				path: '/history',
				// @ts-expect-error `chanel` is not an input field
				query: { channel: { input: 'chanel' } },
				response: historyPage,
				items: (page) => page.messages,
				pages: {
					style: 'cursor',
					// @ts-expect-error `next_curser` is not a field of the page
					next: (page) => page.response_metadata?.next_curser,
					send: { query: 'cursor' },
				},
			},
		});
		echoItem.action('history', {
			action: 'Get history',
			summary: 'List the messages of a channel.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/history',
				response: historyPage,
				items: (page) => page.messages,
				// @ts-expect-error `links` is not a page style
				pages: { style: 'links' },
			},
		});
		echoItem.action('history', {
			action: 'Get history',
			summary: 'List the messages of a channel.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/history',
				response: historyPage,
				// @ts-expect-error an item has `id`, so `{ ids }` does not match the output
				items: (page) => page.messages.map(({ id }) => ({ ids: id })),
			},
		});
		echoItem.action('history', {
			action: 'Get history',
			summary: 'List the messages of a channel.',
			flow: read,
			input: {},
			output: message,
			list: {
				path: '/history',
				response: historyPage,
				items: (page) => page.messages,
				// @ts-expect-error `start` is the first page number, so an item offset has none
				pages: { style: 'offset', unit: 'item', start: 1, send: { query: 'offset' } },
			},
		});
		expect(true).toBe(true);
	});
});

describe('query', () => {
	it('repeats the key of an array value', async () => {
		const { host, requests } = hostOf([[]]);
		await executorOf(fetchAction({ path: path`/items`, query: { id: ['a', 'b'], q: 'x' } }))(host);
		expect(requests[0]).toMatchObject({ qs: { id: ['a', 'b'], q: 'x' }, arrayFormat: 'repeat' });
	});

	it('keeps the default array format when no value is an array', async () => {
		const { host, requests } = hostOf([[]]);
		await executorOf(fetchAction({ path: path`/items`, query: { q: 'x' } }))(host);
		expect(requests[0]).not.toHaveProperty('arrayFormat');
	});

	it('sends and records a repeated key in runAction', async () => {
		const fetch = mockHttp([
			{ path: '/items', query: { id: ['a', 'b'] }, reply: { json: [{ id: 'a' }] } },
		]);
		const result = await runAction(
			fetchAction({ path: path`/items`, query: { id: ['a', 'b'], q: 'x' } }),
			{ input: {}, fetch },
		);
		expect(result).toEqual({ ok: true, items: [{ id: 'a' }] });
		expect(fetch.calls[0]?.url).toBe('https://echo.test/items?id=a&id=b&q=x');
		expect(fetch.calls[0]?.query).toEqual({ id: ['a', 'b'], q: 'x' });
	});
});

describe('batch and named outputs', () => {
	const itemsNode = defineNode({ id: 'items', displayName: 'Items' });
	const row = (id: string) => ({
		json: { id },
		binary: { file: { data: id, mimeType: 'text/plain' } },
	});
	const batchHost = (items: ExecutorHost['items'], parameters: Record<string, unknown> = {}) =>
		hostOf([], { items, parameter: (name) => parameters[name] }).host;

	const reverse = itemsNode.action('reverse', {
		action: 'Reverse items',
		summary: 'Reverse the items.',
		flow: { effect: 'transform', cardinality: 'batch' },
		input: {},
		output: t.json(),
		run: ({ items }) => [...items].reverse().map((item) => ({ item })),
	});

	const count = itemsNode.action('count', {
		action: 'Count items',
		summary: 'Count the items.',
		flow: { effect: 'transform', cardinality: 'batch' },
		input: {},
		output: t.obj({ count: t.int() }),
		run: ({ items }) => [{ json: { count: items.length }, from: items }],
	});

	const check = itemsNode.action('check', {
		action: 'Check items',
		summary: 'Route each item by a flag.',
		flow: { effect: 'transform', cardinality: 'per-item' },
		input: { pass: t.bool() },
		output: t.json(),
		outputs: ['true', 'false'],
		run: async ({ input, item }) =>
			await Promise.resolve({ to: input.pass ? 'true' : 'false', item }),
	});

	const route = itemsNode.action('route', {
		action: 'Route items',
		summary: 'Route each item to the case it names.',
		flow: { effect: 'transform', cardinality: '1:N' },
		input: { cases: t.arr(t.obj({ output: t.str() })), pick: t.str() },
		output: t.json(),
		outputs: { each: 'cases', then: ['fallback'] },
		async *run({ input, item }) {
			yield {
				to: input.cases.some(({ output }) => output === input.pick) ? input.pick : 'fallback',
				item,
			};
		},
	});

	it('passes batch items on unchanged, binary data too, paired with their input item', async () => {
		const items = [row('a'), row('b')];
		expect(await executorOf(reverse)(batchHost(items))).toEqual([
			[
				{ ...items[1], pairedItem: { item: 1 } },
				{ ...items[0], pairedItem: { item: 0 } },
			],
		]);
	});

	it('pairs a new batch item with every input item it names, and runs no batch without items', async () => {
		expect(await executorOf(count)(batchHost([row('a'), row('b')]))).toEqual([
			[{ json: { count: 2 }, pairedItem: [{ item: 0 }, { item: 1 }] }],
		]);
		expect(await executorOf(count)(batchHost([]))).toEqual([[]]);
	});

	it('refuses a batch output from an item that is not an input item, or from no item', async () => {
		const forged = itemsNode.action('forge', {
			action: 'Forge',
			summary: 'Forge lineage.',
			flow: { effect: 'transform', cardinality: 'batch' },
			input: { none: t.bool().default(false) },
			output: t.json(),
			run: ({ input, items }) => [
				{ json: {}, from: input.none ? [] : { json: { ...items[0]?.json } } },
			],
		});
		await expect(executorOf(forged)(batchHost([row('a')]))).rejects.toThrow(
			'names an item that is not an input item',
		);
		await expect(executorOf(forged)(batchHost([row('a')], { none: true }))).rejects.toThrow(
			'comes from no input item',
		);
	});

	it('routes per-item outputs to their named output', async () => {
		const items = [row('a'), row('b')];
		const host = hostOf([], {
			items,
			parameter: (name, index) => (name === 'pass' ? index === 0 : undefined),
		}).host;
		expect(await executorOf(check)(host)).toEqual([
			[{ ...items[0], pairedItem: { item: 0 } }],
			[{ ...items[1], pairedItem: { item: 1 } }],
		]);
	});

	it('runs a routed action outside n8n and gives the items of each output', async () => {
		expect(await runAction(check, { input: { pass: false }, items: [{ id: 'a' }] })).toEqual({
			ok: true,
			items: [{ id: 'a' }],
			outputs: [[], [{ id: 'a' }]],
		});
	});

	it('sends an error item to the last output on continue-on-fail', async () => {
		const items = [row('a'), row('b')];
		const host = hostOf([], {
			items,
			continueOnFail: () => true,
			parameter: (name, index) => (name === 'pass' && index === 0 ? true : undefined),
		}).host;
		expect(await executorOf(check)(host)).toEqual([
			[{ ...items[0], pairedItem: { item: 0 } }],
			[{ json: { error: 'input.pass: is required' }, pairedItem: { item: 1 } }],
		]);
	});

	it('names outputs after input entries, then the fixed ones, and refuses two outputs of one name', async () => {
		const items = [row('a')];
		const host = (cases: unknown[], pick: string) =>
			hostOf([], { items, parameter: (name) => ({ cases, pick })[name] }).host;
		expect(await executorOf(route)(host([{ output: 'x' }, { output: 'y' }], 'y'))).toEqual([
			[],
			[{ ...items[0], pairedItem: { item: 0 } }],
			[],
		]);
		expect((await executorOf(route)(host([{ output: 'x' }], 'z')))[1]).toHaveLength(1);
		await expect(executorOf(route)(host([{ output: 'x' }, { output: 'x' }], 'x'))).rejects.toThrow(
			'two outputs named "x"',
		);
	});

	it('passes the current item on from a per-item action without named outputs', async () => {
		const keep = itemsNode.action('keep', {
			action: 'Keep',
			summary: 'Pass items on.',
			flow: { effect: 'transform', cardinality: 'per-item' },
			input: { mode: t.oneOf('same', 'other', 'made') },
			output: t.passedItem(),
			run: async ({ input, item }) =>
				await Promise.resolve(
					input.mode === 'same' ? { item } : input.mode === 'other' ? { item: { json: {} } } : {},
				),
		});
		const items = [row('a')];
		const host = (mode: string) => batchHost(items, { mode });
		expect(await executorOf(keep)(host('same'))).toEqual([
			[{ ...items[0], pairedItem: { item: 0 } }],
		]);
		await expect(executorOf(keep)(host('made'))).rejects.toThrow('output 0 must be { item }');
		await expect(executorOf(keep)(host('other'))).rejects.toThrow(
			'passes on an item other than the current item',
		);
	});

	it('names outputs per entry from the raw list, so a bad first item or no item keeps them', async () => {
		const items = [row('a'), row('b')];
		const cases = [{ output: 'x' }];
		const host = hostOf([], {
			items,
			continueOnFail: () => true,
			parameter: (name, index) => ({ cases, pick: index === 0 ? undefined : 'x' })[name],
		}).host;
		expect(await executorOf(route)(host)).toEqual([
			[{ ...items[1], pairedItem: { item: 1 } }],
			[{ json: { error: 'input.pick: is required' }, pairedItem: { item: 0 } }],
		]);
		const empty = hostOf([], { items: [], parameter: (name) => ({ cases })[name] }).host;
		expect(await executorOf(route)(empty)).toEqual([[], []]);
	});

	it('refuses an output name that is not an output, at compile time and at run time', async () => {
		itemsNode.action('typo', {
			action: 'Typo',
			summary: 'Route to a typo.',
			flow: { effect: 'transform', cardinality: 'per-item' },
			input: {},
			output: t.json(),
			outputs: ['kept', 'discarded'],
			// @ts-expect-error -- "kep" is not an output name
			run: async ({ item }) => await Promise.resolve({ to: 'kep', item }),
		});
		const loose = itemsNode.action('loose', {
			action: 'Loose',
			summary: 'Route to a name from the input.',
			flow: { effect: 'transform', cardinality: '1:N' },
			input: { cases: t.arr(t.obj({ output: t.str() })) },
			output: t.json(),
			outputs: { each: 'cases' },
			async *run({ item }) {
				yield { to: 'missing', item };
			},
		});
		const host = hostOf([], {
			items: [row('a')],
			parameter: (name) => (name === 'cases' ? [{ output: 'x' }] : undefined),
		}).host;
		await expect(executorOf(loose)(host)).rejects.toThrow('"missing", which is not one of x');
	});

	it('requires lineage on a new batch item and an entry list for outputs per entry', () => {
		itemsNode.action('noLineage', {
			action: 'No lineage',
			summary: 'Forget lineage.',
			flow: { effect: 'transform', cardinality: 'batch' },
			input: {},
			output: t.obj({ count: t.int() }),
			// @ts-expect-error -- a new batch item must name its input items in `from`
			run: ({ items }) => [{ json: { count: items.length } }],
		});
		itemsNode.action('noList', {
			action: 'No list',
			summary: 'Name outputs after a field that is not a list.',
			flow: { effect: 'transform', cardinality: 'per-item' },
			input: { pick: t.str() },
			output: t.json(),
			// @ts-expect-error -- `pick` is not a list of entries with an `output` name
			outputs: { each: 'pick' },
			run: async ({ item }) => await Promise.resolve({ to: 'x', item }),
		});
	});

	it('projects named outputs onto the n8n node type', () => {
		const { description } = new (toNodeType(check))();
		expect([description.outputs, description.outputNames, description.group]).toEqual([
			['main', 'main'],
			['true', 'false'],
			['transform'],
		]);
		const dynamic = new (toNodeType(route))().description.outputs;
		expect(dynamic).toMatch(/^=\{\{\(.*\)\(\$parameter, "cases", \["fallback"\]\)\}\}$/s);
		expect(outputsPerEntryOf({ cases: '[{"output":"high"},{}]' }, 'cases', ['fallback'])).toEqual([
			{ type: 'main', displayName: 'high' },
			{ type: 'main', displayName: '1' },
			{ type: 'main', displayName: 'fallback' },
		]);
		const rows = { cases: { values: [{ output: 'high' }, { output: 'low' }] } };
		expect(
			outputsPerEntryOf(rows, 'cases', ['fallback']).map((output) => output.displayName),
		).toEqual(['high', 'low', 'fallback']);
		const notRows = { cases: { values: [{ output: 'high' }], output: 'x' } };
		expect(
			outputsPerEntryOf(notRows, 'cases', ['fallback']).map((output) => output.displayName),
		).toEqual(['fallback']);
		expect(
			outputsPerEntryOf({ cases: [{ output: 'only' }] }, 'cases', []).map(
				(output) => output.displayName,
			),
		).toEqual(['only']);
	});
});

describe('credentials in a run', () => {
	const acmeToken = defineCredential({
		id: 'acme.token',
		legacyName: 'acmeApi',
		displayName: 'Acme API',
		fields: {
			region: t.oneOf('eu', 'us').default('eu'),
			account: field.text('Account ID'),
			apiKey: field.secret('API Key'),
		},
		baseUrl: 'https://api.acme.test',
		auth: (a) => a.bearer('apiKey'),
	});
	const acme = defineNode({
		id: 'acme',
		displayName: 'Acme',
		credential: credential({ types: [acmeToken] }),
	});
	const stored = { region: 'us', account: 'acc-1', apiKey: 'key-secret-1' };
	const acmeNode: INode = { ...node, credentials: { acmeApi: { id: '1', name: 'Acme' } } };

	it('gives run() the fields of the credential without the secrets', async () => {
		const seen: unknown[] = [];
		const whoami = acme.action('whoami', {
			action: 'Who am I',
			summary: 'Read the credential.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: t.obj({ account: t.str() }),
			async run({ credential: used }) {
				seen.push(used);
				// @ts-expect-error a secret is not a field of the run credential
				seen.push(used?.fields.apiKey);
				return await Promise.resolve({ account: used?.fields.account ?? '' });
			},
		});
		const { host } = hostOf([], { node: acmeNode, credentialData: async () => stored });
		const items = (await executorOf(whoami)(host))[0] ?? [];
		expect(items.map(({ json: value }) => value)).toEqual([{ account: 'acc-1' }]);
		expect(seen).toEqual([
			{ type: 'acmeApi', fields: { region: 'us', account: 'acc-1' } },
			undefined,
		]);

		const unreadable = hostOf([], {
			node: acmeNode,
			credentialData: async () => await Promise.reject(new Error('unreadable')),
		});
		await expect(executorOf(whoami)(unreadable.host)).rejects.toThrow('Credential acmeApi');
	});

	it('redacts the secrets from an error, its response body, an error item and the log', async () => {
		const basic = Buffer.from('key-secret-1').toString('base64');
		const echoed = Object.assign(new Error('Request failed: key-secret-1'), {
			response: {
				status: 401,
				headers: { 'www-authenticate': `Bearer ${basic}` },
				data: { echo: { authorization: 'Bearer key-secret-1' } },
			},
		});
		const logged: string[] = [];
		const caught: unknown[] = [];
		const call = acme.action('call', {
			action: 'Call',
			summary: 'Call the API.',
			flow: { effect: 'read', cardinality: 'per-item' },
			input: {},
			output: t.obj({}),
			async run({ http, log }) {
				log('info', 'using key-secret-1');
				try {
					await http.request({ path: path`/me`, retry: false });
					return {};
				} catch (error) {
					caught.push(error);
					throw error;
				}
			},
		});
		const reads: string[] = [];
		const { host } = hostOf([echoed], {
			node: acmeNode,
			credentialData: async (type) => {
				reads.push(type);
				return await Promise.resolve(stored);
			},
			log: (_level, message) => logged.push(message),
		});
		await expect(executorOf(call)(host)).rejects.toThrow('Request failed: [REDACTED]');
		expect(JSON.stringify(caught)).not.toContain('key-secret-1');
		expect(JSON.stringify(caught)).not.toContain(basic);
		expect(caught[0]).toMatchObject({
			status: 401,
			body: { echo: { authorization: 'Bearer [REDACTED]' } },
		});
		expect(logged).toEqual(['using [REDACTED]']);
		expect(reads).toEqual(['acmeApi']);

		const failing = hostOf([echoed], {
			node: acmeNode,
			credentialData: async () => stored,
			continueOnFail: () => true,
		});
		const items = (await executorOf(call)(failing.host))[0] ?? [];
		expect(items.map(({ json: value }) => value)).toEqual([
			{ error: 'Request failed: [REDACTED]' },
		]);
	});
});

describe('run errors', () => {
	const items = [0, 1, 2].map((n) => ({ json: { n } }));
	const perItem = { effect: 'read', cardinality: 'per-item' } as const;
	const failOnThird = (thrown: () => unknown) =>
		echoItem.action('fail', {
			...fetchSpec,
			flow: perItem,
			async run({ http, item: current }) {
				if (current.json.n === 2) throw thrown();
				await http.request({ path: path`/items`, retry: false });
				return { id: 'a' };
			},
		});
	const errorOf = async (thrown: () => unknown, replies: unknown[] = [[], [], []]) =>
		await executorOf(failOnThird(thrown))(hostOf(replies, { items }).host).catch(
			(error: unknown) => error,
		);

	it('fails with a node error that names the item of a raw error', async () => {
		const error = await errorOf(() => new TypeError('boom'));
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'boom', context: { itemIndex: 2 } });
	});

	it.each([
		['a UserError', () => new UserError('bad input'), { cause: 'configuration-invalid' }],
		[
			'an OperationalError',
			() => new OperationalError('down'),
			{ cause: 'temporarily-unavailable' },
		],
		[
			'a network error',
			() => Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
			{ cause: 'temporarily-unavailable' },
		],
		['an unknown error', () => new Error('plain'), undefined],
	])('classifies %s that run() throws', async (_name, thrown, failure) => {
		const error = await errorOf(thrown);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ context: { itemIndex: 2 } });
		expect(isRecord(error) ? error.failure : 'no error').toEqual(failure);
	});

	it.each([
		[400, {}, { cause: 'configuration-invalid' }],
		[401, {}, { cause: 'credential-invalid' }],
		[404, {}, { cause: 'configuration-invalid' }],
		[408, {}, { cause: 'temporarily-unavailable' }],
		[429, { 'Retry-After': '2' }, { cause: 'rate-limited', retryAfterMs: 2000 }],
		[500, {}, { cause: 'temporarily-unavailable' }],
		[503, {}, { cause: 'temporarily-unavailable' }],
	])('classifies an HttpError with status %i', async (status, headers, failure) => {
		const error = await errorOf(() => new Error('not reached'), [[], httpError(status, headers)]);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ status, context: { itemIndex: 1 }, failure });
	});

	it('classifies a request that fails with a transport code in its cause', async () => {
		const refused = Object.assign(new Error('Request failed'), {
			cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
		});
		const error = await errorOf(() => new Error('not reached'), [[], refused]);
		expect(error).toMatchObject({
			context: { itemIndex: 1 },
			failure: { cause: 'temporarily-unavailable' },
		});
	});

	it('keeps the item index of a batch run unset', async () => {
		const batch = echoItem.action('all', {
			...fetchSpec,
			flow: { effect: 'read', cardinality: 'batch' },
			async *run() {
				yield* [];
				throw new UserError('bad batch');
			},
		});
		const error = await executorOf(batch)(hostOf([], { items }).host).catch(
			(caught: unknown) => caught,
		);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({
			message: 'bad batch',
			context: { itemIndex: undefined },
			failure: { cause: 'configuration-invalid' },
		});
	});
});

describe('node errorOf', () => {
	const slack = defineNode({
		id: 'slack',
		displayName: 'Slack',
		baseUrl: 'https://slack.test',
		errorOf: (body) =>
			isRecord(body) && body.ok === false ? `Slack: ${String(body.error)}` : undefined,
	});
	const message = slack.resource('message');
	const sent = t.obj({ ok: t.bool(), ts: t.str().optional() });
	const spec = {
		action: 'Send a message',
		summary: 'Send a message.',
		flow: { effect: 'write', cardinality: 'per-item' },
		input: { text: t.str() },
		output: t.loose(sent),
	} as const;
	const declarative = message.action('send', {
		...spec,
		request: { method: 'POST', path: path`/chat.postMessage`, body: { text: { input: 'text' } } },
	});
	const coded = message.action('post', {
		...spec,
		async run({ http, input }) {
			return parse(
				sent,
				await http.request({ method: 'POST', path: path`/chat.postMessage`, body: input }),
			);
		},
	});
	const full = message.action('postFull', {
		...spec,
		async run({ http, input }) {
			const response = await http.request({
				method: 'POST',
				path: path`/chat.postMessage`,
				body: input,
				fullResponse: true,
			});
			return parse(sent, isRecord(response) ? response.body : undefined);
		},
	});
	const replies = [
		{ ok: true, ts: '1' },
		{ ok: true, ts: '2' },
		{ ok: false, error: 'not_in_channel' },
	];
	const hostFor = (answers: unknown[]) =>
		hostOf(answers, {
			items: answers.map(() => ({ json: {} })),
			parameter: (name, itemIndex) => (name === 'text' ? `hi ${itemIndex}` : undefined),
		});

	it.each([
		['a declarative request', declarative, replies],
		['a run() request', coded, replies],
		[
			'a run() request with the full response',
			full,
			replies.map((body) => ({ body, headers: {}, statusCode: 200 })),
		],
	])('fails the item of an in-band error in %s', async (_name, action, answers) => {
		const error = await executorOf(action)(hostFor(answers).host).catch(
			(caught: unknown) => caught,
		);
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({
			message: 'Slack: not_in_channel',
			context: { itemIndex: 2 },
			failure: { cause: 'configuration-invalid' },
		});
	});

	it('passes a body without an in-band error', async () => {
		const outputs = await executorOf(declarative)(hostFor(replies.slice(0, 2)).host);
		expect(outputs[0]?.map(({ json: value }) => value)).toEqual([
			{ ok: true, ts: '1' },
			{ ok: true, ts: '2' },
		]);
	});

	it('gives the in-band error to run() as a UserError it can catch', async () => {
		const caught: unknown[] = [];
		const tolerant = message.action('tolerant', {
			...spec,
			async run({ http, input }) {
				try {
					return parse(sent, await http.request({ method: 'POST', path: path`/x`, body: input }));
				} catch (error) {
					caught.push(error);
					return { ok: false };
				}
			},
		});
		const { host } = hostOf([{ ok: false, error: 'not_in_channel' }], {
			parameter: (name) => (name === 'text' ? 'hi' : undefined),
		});
		const outputs = await executorOf(tolerant)(host);
		expect(outputs[0]?.map(({ json: value }) => value)).toEqual([{ ok: false }]);
		expect(caught[0]).toBeInstanceOf(UserError);
		expect(caught[0]).toMatchObject({ message: 'Slack: not_in_channel' });
	});
});

describe('resource lookups', () => {
	const directory = defineNode({
		id: 'directory',
		displayName: 'Directory',
		credential: credential({ types: [compat('directoryApi')] }),
		baseUrl: 'https://directory.test/api',
	});
	const channel = defineResource({
		id: 'directory.channel',
		label: 'Channel',
		shape: { pattern: '^C[0-9]+$' },
		list: {
			request: { path: '/channels', query: { archived: false } },
			response: t.obj({
				channels: t.arr(t.obj({ id: t.str(), name: t.str() })),
				meta: t.obj({ next: t.str().optional() }).optional(),
			}),
			items: 'channels',
			item: { id: '{id}', label: '#{name}', url: 'https://directory.test/c/{id}' },
			pages: {
				style: 'cursor',
				next: 'meta.next',
				send: { query: 'cursor' },
				size: { query: 'limit', max: 2 },
			},
			search: 'label',
		},
	});
	const database = defineResource({
		id: 'directory.database',
		label: 'Database',
		shape: { pattern: '[0-9a-f]{8}' },
		list: {
			request: {
				method: 'POST',
				path: '/search',
				body: { filter: { property: 'object', value: 'database' }, query: { input: 'search' } },
			},
			response: t.obj({
				results: t.arr(t.obj({ id: t.str(), title: t.arr(t.obj({ text: t.str() })) })),
			}),
			items: 'results',
			item: { id: '{id}', label: '{title.0.text}' },
			search: 'service',
		},
	});
	const table = defineResource({
		id: 'directory.table',
		label: 'Table',
		shape: { pattern: '^[0-9]+$' },
		input: { database: ref(database) },
		list: {
			request: { path: '/databases/{database}/tables' },
			response: t.arr(t.obj({ position: t.int(), name: t.str() })),
			item: { id: '{position}', label: '{name}' },
		},
	});
	const readRow = directory.resource('row').action('read', {
		action: 'Read a row',
		summary: 'Read one row.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: { channel: ref(channel), database: ref(database), table: ref(table) },
		output: t.json(),
		request: { path: '/databases/{database}/tables/{table}' },
	});
	const lookupOf = (id: string) => {
		const lookup = toContract(readRow).input.properties?.[id]?.['x-n8n-lookup'];
		if (!lookup) throw new Error(`${id} has no lookup`);
		return lookup;
	};
	const credentialed: INode = { ...node, credentials: { directoryApi: { id: '1', name: 'Dir' } } };
	const valuesOf = (input: Readonly<Record<string, unknown>>) => ({
		parameter: (name: string) => input[name],
	});

	it('pages through the list, maps each entry and keeps the labels that hold the search text', async () => {
		const { host, requests } = hostOf(
			[
				{
					channels: [
						{ id: 'C1', name: 'General' },
						{ id: 'C2', name: 'random' },
					],
					meta: { next: 'p2' },
				},
				{ channels: [{ id: 'C3', name: 'general-eng' }] },
			],
			valuesOf({ search: 'GEN', paging: { mode: 'limit', max: 500 } }),
		);
		const action = lookupActionOf(readRow, 'directory.channel', lookupOf('channel'));
		expect(await runLookup(action, host)).toEqual({
			results: [
				{ name: '#General', value: 'C1', url: 'https://directory.test/c/C1' },
				{ name: '#general-eng', value: 'C3', url: 'https://directory.test/c/C3' },
			],
		});
		expect(requests.map(({ url, qs }) => [url, qs])).toEqual([
			['https://directory.test/api/channels', { archived: false, limit: 2 }],
			['https://directory.test/api/channels', { archived: false, limit: 2, cursor: 'p2' }],
		]);
	});

	it('sends the search text in a nested body for a service search, and leaves it out without one', async () => {
		const page = { results: [{ id: 'abcdef12', title: [{ text: 'Tasks' }] }] };
		const action = lookupActionOf(readRow, 'directory.database', lookupOf('database'));
		const searched = hostOf([page], valuesOf({ search: 'Tas' }));
		const all = hostOf([page]);
		expect(await runLookup(action, searched.host)).toEqual({
			results: [{ name: 'Tasks', value: 'abcdef12' }],
		});
		await runLookup(action, all.host);
		expect([searched.requests[0]?.body, all.requests[0]?.body]).toEqual([
			{ filter: { property: 'object', value: 'database' }, query: 'Tas' },
			{ filter: { property: 'object', value: 'database' } },
		]);
	});

	it('reads the input fields of a dependent lookup, and fails without them', async () => {
		const action = lookupActionOf(readRow, 'directory.table', lookupOf('table'));
		const { host, requests } = hostOf(
			[[{ position: 3, name: 'Q3' }]],
			valuesOf({ database: 'abcdef12' }),
		);
		expect(await runLookup(action, host)).toEqual({ results: [{ name: 'Q3', value: '3' }] });
		expect(requests[0]?.url).toBe('https://directory.test/api/databases/abcdef12/tables');
		await expect(runLookup(action, hostOf([]).host)).rejects.toThrow('database');
	});

	it('keeps only an http or https entry URL', async () => {
		const linked = { ...lookupOf('channel'), item: { id: '{id}', label: '{name}', url: '{link}' } };
		const action = lookupActionOf(readRow, 'directory.channel', linked);
		const page = {
			channels: [
				{ id: 'C1', name: 'web', link: 'https://directory.test/c/C1' },
				{ id: 'C2', name: 'script', link: 'javascript:alert(1)' },
			],
		};
		expect(await runLookup(action, hostOf([page]).host)).toEqual({
			results: [
				{ name: 'web', value: 'C1', url: 'https://directory.test/c/C1' },
				{ name: 'script', value: 'C2' },
			],
		});
	});

	it('reaches only the egress hosts of the action', async () => {
		const outside = { ...lookupOf('table'), request: { url: 'https://elsewhere.test/tables' } };
		const action = lookupActionOf(readRow, 'directory.table', outside);
		await expect(
			runLookup(action, hostOf([[]], valuesOf({ database: 'abcdef12' })).host),
		).rejects.toThrow('Host not allowed');
	});

	it('gives the node type a listSearch method per resource, run as the action in the n8n form', async () => {
		const sent: Array<[string, IHttpRequestOptions]> = [];
		const context = {
			getNode: () => credentialed,
			getCurrentNodeParameter: (name: string) =>
				name === 'database' ? { __rl: true, mode: 'list', value: 'abcdef12' } : undefined,
			getCredentials: async () => ({}),
			helpers: {
				httpRequestWithAuthentication: async (type: string, options: IHttpRequestOptions) => {
					sent.push([type, options]);
					return [{ position: 1, name: 'Q1' }];
				},
			},
			logger: { debug: () => undefined },
		};
		const { methods } = new (toNodeType(readRow))();
		expect(Object.keys(methods?.listSearch ?? {})).toEqual([
			'directory.channel',
			'directory.database',
			'directory.table',
		]);
		const listTables = methods?.listSearch?.['directory.table'];
		// The lookup reads only these members.
		const result = await listTables?.call(context as unknown as ILoadOptionsFunctions);
		expect(result).toEqual({ results: [{ name: 'Q1', value: '1' }] });
		expect(sent.map(([type, { url }]) => [type, url])).toEqual([
			['directoryApi', 'https://directory.test/api/databases/abcdef12/tables'],
		]);
	});

	it('lists nothing and sends no request while a parent field of a dependent lookup is empty', async () => {
		const sent: string[] = [];
		const contextOf = (database: unknown) => ({
			getNode: () => credentialed,
			getCurrentNodeParameter: (name: string) => (name === 'database' ? database : undefined),
			getCredentials: async () => ({}),
			helpers: {
				httpRequestWithAuthentication: async (_: string, { url }: IHttpRequestOptions) => {
					sent.push(url);
					return [];
				},
			},
			logger: { debug: () => undefined },
		});
		const listTables = new (toNodeType(readRow))().methods?.listSearch?.['directory.table'];
		for (const database of [undefined, '', { __rl: true, mode: 'list', value: '' }]) {
			expect(
				await listTables?.call(contextOf(database) as unknown as ILoadOptionsFunctions),
			).toEqual({ results: [] });
		}
		expect(sent).toEqual([]);
	});

	it('runs the lookup of a frozen version from its manifest, without its bundle', async () => {
		const contract = toContract(readRow);
		const frozen = {
			manifest: {
				kind: 'action' as const,
				id: readRow.id,
				semver: '1.0.0',
				nodeContract: NODE_CONTRACT_VERSION,
				contractHash: contractHash(contract),
				bundleHash: '0'.repeat(64),
				contract,
			},
			origin: 'community' as const,
			readBundle: async () => await Promise.reject(new Error('the lookup read the bundle')),
		};
		expect(contract.baseUrl).toBe('https://directory.test/api');
		const nodeType = new (toVersionedNodeType([frozen], hostRuntime()))().getNodeType(1);
		const context = {
			getNode: () => credentialed,
			getCurrentNodeParameter: () => undefined,
			getCredentials: async () => ({}),
			helpers: {
				httpRequestWithAuthentication: async () => ({
					channels: [{ id: 'C9', name: 'ops' }],
				}),
			},
			logger: { debug: () => undefined },
		};
		const listChannels = nodeType.methods?.listSearch?.['directory.channel'];
		expect(await listChannels?.call(context as unknown as ILoadOptionsFunctions, 'op')).toEqual({
			results: [{ name: '#ops', value: 'C9', url: 'https://directory.test/c/C9' }],
		});
	});
});
