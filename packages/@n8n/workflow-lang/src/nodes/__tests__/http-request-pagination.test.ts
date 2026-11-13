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
	/** The page that the server sends for a request, by its path and query. */
	serve(path: string, query: URLSearchParams, base: string): Page;
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
];

let server: Server;
let current: Case = CASES[0];
let base = '';
let log: Array<{ path: string; query: Record<string, string>; page: Page }> = [];

function parse(url: string): { path: string; query: URLSearchParams } {
	const u = new URL(url, 'http://local');
	return { path: u.pathname, query: u.searchParams };
}

beforeAll(async () => {
	server = createServer((request: IncomingMessage, response) => {
		const { path, query } = parse(request.url ?? '/');
		const page = current.serve(path, query, base);
		log.push({ path, query: Object.fromEntries(query), page });
		response.statusCode = page.status;
		response.setHeader('content-type', 'application/json');
		response.end(JSON.stringify(page.body));
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
				const args = e.args as { url: string; qs?: Record<string, unknown> };
				const { path, query } = parse(args.url);
				const all: Record<string, string> = Object.fromEntries(query);
				for (const [k, v] of Object.entries(args.qs ?? {})) {
					if (v !== undefined && v !== null) all[k] = typeof v === 'string' ? v : JSON.stringify(v);
				}
				return { path, query: all };
			});
		expect(requests).toEqual(served.map((s) => ({ path: s.path, query: s.query })));
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
