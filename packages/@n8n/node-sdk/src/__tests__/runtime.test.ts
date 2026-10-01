import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import {
	arr,
	defineAction,
	defineNode,
	int,
	isRecord,
	json,
	list,
	obj,
	paginate,
	parse,
	str,
	validate,
	type ActionFlow,
	type HttpRequest,
} from '../index';
import { executorOf, type ExecutorHost } from '../runtime';
import { mockHttp, runAction } from '../testing';

const echo = defineNode({
	id: 'echo',
	displayName: 'Echo',
	credentials: ['echoApi'],
	baseUrl: 'https://echo.test',
	authOptional: true,
});

const node: INode = {
	id: '1',
	name: 'Echo',
	type: 'echo',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const item = obj({ id: str() });
const read: ActionFlow = { effect: 'read', cardinality: '1:N', passthrough: 'replace' };

/** An action that sends `request` once and emits the items of an array body. */
const fetchAction = (request: HttpRequest, flow: ActionFlow = read) =>
	defineAction({
		node: echo,
		id: 'echo.item.fetch',
		action: 'Fetch items',
		summary: 'Fetch items.',
		flow,
		input: {},
		output: item,
		async run({ http, emit }) {
			const body = await http.request(request);
			for (const entry of Array.isArray(body) ? body : []) emit(entry);
		},
	});

/** A host whose requests answer from `replies` in order; a reply that is an Error throws. */
function hostOf(replies: unknown[], overrides: Partial<ExecutorHost> = {}) {
	const requests: IHttpRequestOptions[] = [];
	const waits: number[] = [];
	const host: ExecutorHost = {
		itemCount: 1,
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
			const send = defineAction({
				node: echo,
				id: 'echo.text.send',
				action: 'Send text',
				summary: 'Echo the text.',
				flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'replace' },
				input: { text: str(), data: json().optional() },
				output: obj({ text: str(), data: json().optional() }),
				async run({ input, emit }) {
					emit(input);
				},
			});
			const parameters: Record<string, unknown> = { text: '{"a":1}', data: '{"b":2}' };
			const { host } = hostOf([], { parameter: (name) => parameters[name] });
			const items = await executorOf(send)(host);
			expect(items.map(({ json: value }) => value)).toEqual([{ text: '{"a":1}', data: { b: 2 } }]);
		});

		it('fills in nested defaults the same way in n8n and in runAction', async () => {
			const paged = defineAction({
				node: echo,
				id: 'echo.page.read',
				action: 'Read pages',
				summary: 'Read pages.',
				flow: read,
				input: { paging: obj({ size: int().default(25) }).optional() },
				output: obj({ size: int() }),
				async run({ input, emit }) {
					emit({ size: input.paging?.size ?? 0 });
				},
			});
			const { host } = hostOf([], { parameter: (name) => (name === 'paging' ? '{}' : undefined) });
			const [executed] = await executorOf(paged)(host);
			const tested = await runAction(paged, { input: { paging: {} } });
			expect([executed?.json, tested]).toEqual([{ size: 25 }, { ok: true, items: [{ size: 25 }] }]);
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
			const items = await executorOf(fetchAction({ path: '/items' }))(host);
			expect(items.map(({ json: value }) => value)).toEqual([{ id: 'a' }]);
			expect(requests).toHaveLength(3);
			expect(waits[0]).toBe(2000);
			expect(waits[1]).toBeLessThanOrEqual(1000);
		});

		it('stops after three retries', async () => {
			const { host, requests } = hostOf([1, 2, 3, 4, 5].map(() => httpError(429)));
			await expect(executorOf(fetchAction({ path: '/items' }))(host)).rejects.toThrow('429');
			expect(requests).toHaveLength(4);
		});

		it('does not retry a POST unless the action is idempotent or the request opts in', async () => {
			const cases: Array<[HttpRequest, ActionFlow, number]> = [
				[{ method: 'POST', path: '/items' }, read, 1],
				[{ method: 'POST', path: '/items' }, { ...read, idempotent: true }, 2],
				[{ method: 'POST', path: '/items', retry: true }, read, 2],
				[{ path: '/items', retry: false }, read, 1],
				[{ path: '/items' }, read, 1],
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
			await executorOf(fetchAction({ path: '/items' }))(first.host);
			const second = hostOf([[]]);
			await executorOf(fetchAction({ path: '/items', timeoutMs: 5000 }))(second.host);
			expect([first.requests[0]?.timeout, second.requests[0]?.timeout]).toEqual([300_000, 5000]);
		});

		it('fails a run that sends more requests or emits more items than the host allows', async () => {
			const pager = defineAction({
				...fetchAction({ path: '/items' }),
				id: 'echo.item.page',
				async run({ http, emit }) {
					for (const page of [1, 2, 3]) {
						await http.request({ path: '/items', query: { page } });
						emit({ id: String(page) });
					}
				},
			});
			const requests = hostOf([[], [], []], { limits: { maxRequests: 2 } });
			await expect(executorOf(pager)(requests.host)).rejects.toThrow(
				'echo.item.page sent 2 requests for one input item, the most one run may send',
			);
			const items = hostOf([[], [], []], { limits: { maxItems: 2 } });
			await expect(executorOf(pager)(items.host)).rejects.toThrow(
				'echo.item.page emitted 2 items for one input item, the most one run may emit',
			);
		});

		it('fails on the first bad item, before the next page downloads', async () => {
			const pager = defineAction({
				...fetchAction({ path: '/items' }),
				async run({ http, emit }) {
					for (const page of [1, 2]) {
						await http.request({ path: '/items', query: { page } });
						// @ts-expect-error the output needs a string id
						emit({ id: page });
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

	describe('lineage', () => {
		it('pairs each output with its input item, also for an error item', async () => {
			const replies = [[{ id: 'a' }, { id: 'b' }], httpError(404)];
			const { host } = hostOf(replies, { itemCount: 2, continueOnFail: () => true });
			const items = await executorOf(fetchAction({ path: '/items' }))(host);
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
	it('rejects a request without a URL, a relative path, an id of another node, a foreign credential', () => {
		const requests: HttpRequest[] = [
			{ url: 'https://echo.test/items' },
			{ path: '/items' },
			// @ts-expect-error a request needs `url` or `path`
			{},
			// @ts-expect-error `path` starts with a slash
			{ path: 'items' },
			// @ts-expect-error `url` and `path` exclude each other
			{ url: 'https://echo.test', path: '/items' },
		];
		const definition = {
			node: echo,
			action: 'Fetch items',
			summary: 'Fetch items.',
			flow: read,
			input: {},
			output: item,
			async run() {},
		};
		defineAction({ ...definition, id: 'echo.item.fetch', credentials: ['echoApi'] });
		// @ts-expect-error the id starts with the node id
		defineAction({ ...definition, id: 'other.item.fetch' });
		// @ts-expect-error the credential is not one of the node's
		defineAction({ ...definition, id: 'echo.item.fetch', credentials: ['typoApi'] });
		expect(requests).toHaveLength(5);
	});
});

describe('parse', () => {
	it('returns the typed value or throws with each failing path', () => {
		const page = obj({ items: arr(item) });
		expect(parse(page, { items: [{ id: 'a' }] }).items[0]?.id).toBe('a');
		expect(() => parse(page, { items: [{ id: 1 }] })).toThrow(
			'response.items[0].id: must be string, got 1',
		);
	});
});

describe('validate messages', () => {
	it('truncate long values and redact secrets', () => {
		const schema = obj({ body: int(), apiKey: int(), note: int() }).json;
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
		const result = await runAction(fetchAction({ path: '/items', timeoutMs: 10, retry: false }), {
			input: {},
			fetch: hang,
		});
		expect(result).toEqual({ ok: false, error: { message: expect.stringMatching(/timeout/i) } });
	});

	it('retries a 429 with the mock routes', async () => {
		const fetch = mockHttp([
			{ path: '/items', times: 1, reply: { status: 429, headers: { 'retry-after': '0' } } },
			{ path: '/items', reply: { json: [{ id: 'a' }] } },
		]);
		const result = await runAction(fetchAction({ path: '/items' }), { input: {}, fetch });
		expect(result).toEqual({ ok: true, items: [{ id: 'a' }] });
		expect(fetch.calls).toHaveLength(2);
	});
});

describe('paginate', () => {
	/** An action that lists `/items` pages by cursor and emits each item. */
	const pagedAction = (limit?: number, maxPages?: number) =>
		defineAction({
			node: echo,
			id: 'echo.item.list',
			action: 'List items',
			summary: 'List items.',
			flow: read,
			input: {},
			output: item,
			async run({ http, emit }) {
				const items = paginate(http, {
					request: (cursor, room) => ({ path: '/items', query: { cursor, size: room } }),
					items: (body) => (isRecord(body) ? list(body.items) : []),
					next: (body) => (isRecord(body) && typeof body.next === 'string' ? body.next : undefined),
					limit,
					maxPages,
				});
				for await (const entry of items) emit(parse(item, entry));
			},
		});
	const page = (ids: string[], next?: string) => ({ items: ids.map((id) => ({ id })), next });

	it('follows the cursor to the last page', async () => {
		const { host, requests } = hostOf([page(['a', 'b'], 'c2'), page(['c'])]);
		const items = await executorOf(pagedAction())(host);
		expect(items.map(({ json: value }) => value.id)).toEqual(['a', 'b', 'c']);
		expect(requests.map(({ qs }) => qs)).toEqual([{}, { cursor: 'c2' }]);
	});

	it('asks each page for the room the limit leaves and stops at the limit', async () => {
		const { host, requests } = hostOf([page(['a', 'b'], 'c2'), page(['c', 'd'], 'c3')]);
		const items = await executorOf(pagedAction(3))(host);
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
});

describe('query', () => {
	it('repeats the key of an array value', async () => {
		const { host, requests } = hostOf([[]]);
		await executorOf(fetchAction({ path: '/items', query: { id: ['a', 'b'], q: 'x' } }))(host);
		expect(requests[0]).toMatchObject({ qs: { id: ['a', 'b'], q: 'x' }, arrayFormat: 'repeat' });
	});

	it('keeps the default array format when no value is an array', async () => {
		const { host, requests } = hostOf([[]]);
		await executorOf(fetchAction({ path: '/items', query: { q: 'x' } }))(host);
		expect(requests[0]).not.toHaveProperty('arrayFormat');
	});

	it('sends and records a repeated key in runAction', async () => {
		const fetch = mockHttp([
			{ path: '/items', query: { id: ['a', 'b'] }, reply: { json: [{ id: 'a' }] } },
		]);
		const result = await runAction(
			fetchAction({ path: '/items', query: { id: ['a', 'b'], q: 'x' } }),
			{ input: {}, fetch },
		);
		expect(result).toEqual({ ok: true, items: [{ id: 'a' }] });
		expect(fetch.calls[0]?.url).toBe('https://echo.test/items?id=a&id=b&q=x');
		expect(fetch.calls[0]?.query).toEqual({ id: ['a', 'b'], q: 'x' });
	});
});
