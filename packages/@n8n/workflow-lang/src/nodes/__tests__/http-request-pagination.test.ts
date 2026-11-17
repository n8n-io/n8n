/**
 * Pagination equivalence of the HTTP Request node with v1: each case runs a v1
 * workflow (Manual Trigger → HTTP Request with pagination) in n8n's engine
 * against a local server that serves pages, and the converted workflow on the
 * reference runner with the same responses, in the same order. The requests
 * (path and query) and the output items (or the error message) must be the
 * same.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Page {
	status: number;
	body: unknown;
}

interface Case {
	name: string;
	pagination: Record<string, unknown>;
	options?: Record<string, unknown>;
	onError?: string;
	version?: number;
	/** More parameters of the node: the method and the body. */
	parameters?: Record<string, unknown>;
	/** The page that the server sends for a request, by its path, query and body. */
	serve(path: string, query: URLSearchParams, base: string, body: string): Page;
}

const pageNumber = (q: URLSearchParams) => Number(q.get('page') ?? '0');

const CASES: Case[] = [
	{
		name: 'page parameter until the response is empty',
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }] },
		},
		serve: (_p, q) => ({
			status: 200,
			body: pageNumber(q) <= 3 ? [{ id: pageNumber(q) }, { id: pageNumber(q) * 10 }] : [],
		}),
	},
	{
		name: 'cursor until an expression is true',
		pagination: {
			parameters: {
				parameters: [{ type: 'qs', name: 'cursor', value: '={{ $response.body.next_cursor }}' }],
			},
			paginationCompleteWhen: 'other',
			completeExpression: '={{ !$response.body.next_cursor }}',
		},
		serve: (_p, q) => {
			const cursor = q.get('cursor') ?? '';
			const next = { '': 'c1', c1: 'c2', c2: null }[cursor] ?? null;
			return { status: 200, body: { data: [{ cursor }], next_cursor: next } };
		},
	},
	{
		name: 'next URL with a page limit',
		pagination: {
			paginationMode: 'responseContainsNextURL',
			nextURL: '={{ $response.body.next }}',
			paginationCompleteWhen: 'other',
			completeExpression: '={{ !$response.body.next }}',
			limitPagesFetched: true,
			maxRequests: 2,
		},
		serve: (path, _q, base) => {
			const n = path === '/x' ? 0 : Number(path.split('/').pop());
			return { status: 200, body: { n, next: `${base}/x/page/${n + 1}?size=5` } };
		},
	},
	{
		name: 'next URL from a regular expression on a field of the response',
		pagination: {
			paginationMode: 'responseContainsNextURL',
			nextURL: '={{ $response.body.links.match(/<([^>]*)>;\\s*rel="next"/)[1] }}',
			paginationCompleteWhen: 'other',
			completeExpression: '={{ !/rel="next"/.test($response.body.links) }}',
		},
		serve: (path, _q, base) => {
			const n = path === '/x' ? 0 : Number(path.split('/').pop());
			const next = n < 2 ? `<${base}/x/page/${n + 1}>; rel="next", ` : '';
			return { status: 200, body: { n, links: `${next}<${base}/x>; rel="first"` } };
		},
	},
	{
		name: 'stop on a status code, with the last page in the output',
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'receiveSpecificStatusCodes',
			statusCodesWhenComplete: '404, 410',
		},
		serve: (_p, q) =>
			pageNumber(q) < 2
				? { status: 200, body: { page: pageNumber(q) } }
				: { status: 404, body: { message: 'no more' } },
	},
	{
		name: 'a failed page that does not complete fails the node',
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'other',
			completeExpression: '={{ $response.body.done === true }}',
		},
		serve: (_p, q) =>
			pageNumber(q) < 1
				? { status: 200, body: { done: false } }
				: { status: 500, body: { message: 'broken' } },
	},
	{
		name: 'an error page without the fields of the expression stops the loop',
		pagination: {
			parameters: {
				parameters: [
					{ type: 'body', name: 'cursor', value: '={{ $response.body.meta.next_cursor }}' },
				],
			},
			paginationCompleteWhen: 'other',
			completeExpression: '={{ !$response.body.meta.next_cursor }}',
		},
		serve: () => ({ status: 404, body: { error: 'unknown_method', ok: false } }),
	},
	{
		name: 'continue on fail with a failed page',
		onError: 'continueRegularOutput',
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'other',
			completeExpression: '={{ $response.body.done === true }}',
		},
		serve: (_p, q) =>
			pageNumber(q) < 1
				? { status: 200, body: { done: false } }
				: { status: 500, body: { message: 'broken' } },
	},
	{
		name: 'continue on fail with a failed page, version 4.5',
		onError: 'continueRegularOutput',
		version: 4.5,
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'other',
			completeExpression: '={{ $response.body.done === true }}',
		},
		serve: (_p, q) =>
			pageNumber(q) < 1
				? { status: 200, body: { done: false } }
				: { status: 500, body: { message: 'broken' } },
	},
	{
		name: 'full response pages',
		options: { response: { response: { fullResponse: true } } },
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }] },
			paginationCompleteWhen: 'other',
			completeExpression: '={{ $response.body.last }}',
		},
		serve: (_p, q) => ({ status: 200, body: { page: pageNumber(q), last: pageNumber(q) >= 2 } }),
	},
	{
		name: 'POST pages with a JSON body and a page in the query',
		parameters: {
			method: 'POST',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: '{"size": 2, "filter": {"open": true}}',
		},
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }] },
		},
		serve: (_p, q) => ({
			status: 200,
			body: pageNumber(q) <= 2 ? [{ id: pageNumber(q) }] : [],
		}),
	},
	{
		name: 'POST pages with a cursor in the body',
		parameters: {
			method: 'POST',
			sendBody: true,
			bodyParameters: { parameters: [{ name: 'size', value: '2' }] },
		},
		pagination: {
			parameters: {
				parameters: [{ type: 'body', name: 'cursor', value: '={{ $response.body.next }}' }],
			},
			paginationCompleteWhen: 'other',
			completeExpression: '={{ !$response.body.next }}',
		},
		serve: (_p, _q, _base, body) => {
			const cursor = (JSON.parse(body || '{}') as { cursor?: string }).cursor ?? '';
			const next = { '': 'c1', c1: 'c2', c2: null }[cursor] ?? null;
			return { status: 200, body: { data: [{ cursor }], next } };
		},
	},
	{
		name: 'PUT pages that stop on a status code',
		parameters: { method: 'PUT' },
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'receiveSpecificStatusCodes',
			statusCodesWhenComplete: '404',
		},
		serve: (_p, q) =>
			pageNumber(q) < 2
				? { status: 200, body: { page: pageNumber(q) } }
				: { status: 404, body: { message: 'no more' } },
	},
	{
		name: 'POST pages with a failed page',
		parameters: { method: 'POST' },
		pagination: {
			parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
			paginationCompleteWhen: 'other',
			completeExpression: '={{ $response.body.done === true }}',
		},
		serve: (_p, q) =>
			pageNumber(q) < 1
				? { status: 200, body: { done: false } }
				: { status: 500, body: { message: 'broken' } },
	},
];

let server: Server;
let current: Case = CASES[0];
let base = '';
let log: Array<{
	method: string;
	path: string;
	query: Record<string, string>;
	body: string;
	page: Page;
}> = [];

function parse(url: string): { path: string; query: URLSearchParams } {
	const u = new URL(url, 'http://local');
	return { path: u.pathname, query: u.searchParams };
}

beforeAll(async () => {
	server = createServer((request: IncomingMessage, response) => {
		const { path, query } = parse(request.url ?? '/');
		let body = '';
		request.on('data', (chunk: Buffer) => (body += chunk.toString()));
		request.on('end', () => {
			const page = current.serve(path, query, base, body);
			log.push({
				method: request.method ?? '',
				path,
				query: Object.fromEntries(query),
				body,
				page,
			});
			response.statusCode = page.status;
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify(page.body));
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function workflow(c: Case) {
	return {
		name: 'HTTP pages',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: c.version ?? 4.2,
				position: [200, 0],
				parameters: {
					url: `${base}/x`,
					...c.parameters,
					options: { ...c.options, pagination: { pagination: c.pagination } },
				},
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

/** Drops the headers that change per request. */
function comparable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(comparable);
	if (typeof value !== 'object' || value === null) return value;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value)) {
		if (['date', 'connection', 'content-length', 'keep-alive'].includes(k)) continue;
		out[k] = comparable(v);
	}
	return out;
}

describe('HTTP Request pagination with the response format autodetect', () => {
	const pages = { parameters: { parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }] } };
	const withMethod = (method: string | undefined, options: Record<string, unknown> = {}) => {
		const flow = workflow({
			name: 'pages',
			pagination: pages,
			options,
			serve: () => CASES[0].serve('', new URLSearchParams(), '', ''),
		});
		if (method !== undefined) Object.assign(flow.nodes[1].parameters, { method });
		return flow;
	};

	it('gives a GET node the fallback-host form for a page that is a file', () => {
		const converted = convertWorkflow(withMethod(undefined), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		expect(converted.source).toContain('fileLimitInHost(error)');
		expect(converted.source).toContain('replay:');
	});

	it.each(['POST', 'PUT', '={{ $json.method }}'])(
		'gives a node with the method %s the fallback-host form, and the number of its input items',
		(method) => {
			const converted = convertWorkflow(withMethod(method), { trace: 'all' });
			expect(converted.fallbackNodes).toEqual([]);
			expect(converted.source).toContain('fileLimitInHost(error)');
			expect(converted.source).toContain('replay:');
			expect(converted.source).toContain('pageInputs: ');
		},
	);

	it('keeps a node with an error output in the fallback host', () => {
		const flow = withMethod('POST');
		Object.assign(flow.nodes[1], { onError: 'continueErrorOutput' });
		expect(convertWorkflow(flow, { trace: 'all' }).fallbackNodes).toEqual(['H']);
	});

	const json = (body: unknown) => ({
		status: 200,
		headers: { 'content-type': 'application/json' },
		body,
	});
	const FILE = { status: 200, headers: { 'content-type': 'image/png' }, body: 'bytes' };

	/** Runs the converted node with the answers `pages`. It gives the steps of the host form. */
	async function handOver(method: string, pages: unknown[], items: unknown = {}) {
		const converted = convertWorkflow(withMethod(method), { trace: 'all' });
		const hosted: Array<{ replay?: unknown[] }> = [];
		const out = await runReference(
			converted.source,
			{ trigger: { body: items }, now: 0, seed: 1, effects: { H: pages }, trace: true },
			{
				answer: async (effect) => {
					if (effect.kind !== 'node' || effect.step !== 'H (fallback host)') return undefined;
					hosted.push(effect.args as { replay?: unknown[] });
					return [{ fromHost: true }];
				},
			},
		);
		const sent = out.effects.filter((e) => e.step === 'H' && e.kind === 'http');
		return { out, hosted, sent };
	}

	it('gives the host the answers of the POST requests in their order, for a page that is a file', async () => {
		const { out, hosted, sent } = await handOver('POST', [json([{ id: 1 }]), FILE]);
		expect(out.status).toBe('ok');
		expect(sent).toHaveLength(2);
		expect(hosted).toHaveLength(1);
		const replay = hosted[0].replay as Array<Record<string, unknown>>;
		expect(replay.map((entry) => [entry.method, entry.url, entry.qs])).toEqual([
			['POST', `${base}/x`, { page: 1 }],
			['POST', `${base}/x`, { page: 2 }],
		]);
		expect((replay[0].response as { body: unknown }).body).toEqual([{ id: 1 }]);
		expect((out.trace ?? []).find((t) => t.step === 'H')?.items).toEqual([{ fromHost: true }]);
	});

	it('sends no request for several input items of a POST node: the host runs the node', async () => {
		const { out, hosted, sent } = await handOver('POST', [], [{ a: 1 }, { a: 2 }]);
		expect(out.status).toBe('ok');
		expect(sent).toEqual([]);
		expect(hosted).toHaveLength(1);
		expect(hosted[0].replay ?? []).toEqual([]);
	});

	it('sends the pages of several input items of a GET node', async () => {
		const { out, hosted, sent } = await handOver(
			'GET',
			[json([{ id: 1 }]), json([]), json([{ id: 2 }]), json([])],
			[{ a: 1 }, { a: 2 }],
		);
		expect(out.status).toBe('ok');
		expect(sent).toHaveLength(4);
		expect(hosted).toEqual([]);
	});

	it('fails a POST node at a limit of the runtime: the host cannot send the request again', async () => {
		const limit = { $error: 'http: the body is larger than 64 MB (limit: binary-max-file)' };
		const { out, hosted } = await handOver('POST', [json([{ id: 1 }]), limit]);
		expect(out.status).toBe('error');
		expect(hosted).toEqual([]);
		expect((out.result as { message?: string }).message).toContain('(limit: binary-max-file)');
	});

	it('fails a POST node with a file after more pages than the list of answers holds', async () => {
		const pages = Array.from({ length: 257 }, (_, k) => json([{ id: k }]));
		const { out, hosted, sent } = await handOver('POST', [...pages, FILE]);
		expect(sent).toHaveLength(258);
		expect(out.status).toBe('error');
		expect(hosted).toEqual([]);
		expect((out.result as { message?: string }).message).toContain(
			'The fallback host cannot run the node without a second copy of these requests (limit: replay)',
		);
	});

	it('sends the pages of a GET node again in the host after more pages than the list holds', async () => {
		const pages = Array.from({ length: 257 }, (_, k) => json([{ id: k }]));
		const { out, hosted } = await handOver('GET', [...pages, FILE]);
		expect(out.status).toBe('ok');
		expect(hosted).toHaveLength(1);
		expect(hosted[0].replay ?? []).toEqual([]);
	});

	it('gives a node with a fixed response format no fallback-host form', () => {
		const json = { response: { response: { responseFormat: 'json' } } };
		const converted = convertWorkflow(withMethod('POST', json), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		expect(converted.source).not.toContain('fileLimitInHost(error)');
	});
});

describe('HTTP Request pagination and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		current = c;
		log = [];
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const served = log;
		expect(served.length).toBeGreaterThan(0);
		const converted = convertWorkflow(workflow(c), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				H: served.map((s) => ({
					status: s.page.status,
					headers: { 'content-type': 'application/json' },
					body: s.page.body,
				})),
			},
			trace: true,
		});
		const requests = out.effects
			.filter((e) => e.step === 'H' && e.kind === 'http')
			.map((e) => {
				const args = e.args as {
					method?: string;
					url: string;
					qs?: Record<string, unknown>;
					body?: unknown;
				};
				const { path, query } = parse(args.url);
				const all: Record<string, string> = Object.fromEntries(query);
				for (const [k, v] of Object.entries(args.qs ?? {})) {
					if (v !== undefined && v !== null) all[k] = typeof v === 'string' ? v : JSON.stringify(v);
				}
				return { method: args.method ?? 'GET', path, query: all, body: args.body };
			});
		expect(requests.map(({ method, path, query }) => ({ method, path, query }))).toEqual(
			served.map((s) => ({ method: s.method, path: s.path, query: s.query })),
		);
		// The body of each request, when the node sends one.
		if (c.parameters?.sendBody === true) {
			expect(requests.map((r) => r.body)).toEqual(served.map((s) => JSON.parse(s.body)));
		}
		if (v1.error) {
			expect(out.status).toBe('error');
			const message = (out.result as { message?: string }).message ?? '';
			expect(message.startsWith(v1.error)).toBe(true);
			return;
		}
		expect(out.status).toBe('ok');
		const trace = (out.trace ?? [])
			.filter((t) => t.step === 'H')
			.flatMap((t) => t.items as unknown[]);
		expect(comparable(trace)).toEqual(comparable(v1.nodes.H?.[0] ?? []));
	});
});
