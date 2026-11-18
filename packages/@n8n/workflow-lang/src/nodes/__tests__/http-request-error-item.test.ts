/**
 * The error item of a failed HTTP Request node under "continue on fail" and
 * "continue (using error output)", for node versions 4.2, 4.3 and 4.4. Each
 * case runs the v1 workflow in n8n's engine against a local server, and the
 * converted workflow on the reference runner with the responses the server
 * gave. The whole `json.error` object of each item must equal v1's.
 *
 * Two members cannot be equal by nature: `timestamp` is the clock of the run,
 * and `stack` is the text of a V8 stack in the install of n8n. For those two
 * only, the test requires the key to be present with the same kind and does
 * not compare its value. Every other member, including `code` and `status`,
 * must be equal.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Served {
	path: string;
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

type OnError = 'continueRegularOutput' | 'continueErrorOutput';

interface Case {
	name: string;
	version: number;
	onError: OnError;
	path: string;
	options?: Record<string, unknown>;
	/** The compiled side gets the failure of the runtime instead of a served response. */
	error?: string;
}

const JSON_HEADERS = { 'content-type': 'application/json' };
const JSON_BODY = '{"error":"nope","code":7}';

/** The kinds of a failed request. Each runs under both "continue" settings. */
const KINDS: Array<{ name: string; path: string; options?: Record<string, unknown>; error?: string }> = [
	{ name: '400 with a JSON body', path: '/s400' },
	{ name: '404 with a text body', path: '/s404text' },
	{ name: '500 with an empty body', path: '/s500empty' },
	{ name: '401', path: '/s401' },
	{ name: 'invalid JSON with the JSON format', path: '/invalid', options: { response: { response: { responseFormat: 'json' } } } },
	{ name: 'refused connection', path: '/refused' },
	{ name: 'timeout', path: '/slow', options: { timeout: 300 }, error: 'http: the request timed out after 300 ms' },
	{ name: 'redirect loop', path: '/loop', options: { redirect: { redirect: { maxRedirects: 3 } } } },
	{ name: 'never error', path: '/s404', options: { response: { response: { neverError: true } } } },
	{ name: 'full response', path: '/s404', options: { response: { response: { fullResponse: true } } } },
];

const CASES: Case[] = [4.2, 4.3, 4.4].flatMap((version) =>
	['continueRegularOutput', 'continueErrorOutput'].flatMap((onError) =>
		KINDS.map((kind) => ({
			name: `${kind.name}, version ${version}, ${onError}`,
			version,
			onError: onError as OnError,
			path: kind.path,
			options: kind.options,
			error: kind.error,
		})),
	),
);

let server: Server;
let base = '';
let closedPort = 0;
let log: Served[] = [];

beforeAll(async () => {
	// A port with no listener, for the refused-connection case.
	const closed = createServer();
	await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
	closedPort = (closed.address() as AddressInfo).port;
	await new Promise<void>((resolve) => closed.close(() => resolve()));

	server = createServer((request, response) => {
		const url = request.url ?? '';
		const send = (status: number, headers: Record<string, string>, body: string) => {
			let parsed: unknown = body;
			if (headers['content-type'] === 'application/json') {
				try {
					parsed = JSON.parse(body);
				} catch {
					parsed = body;
				}
			}
			log.push({ path: url, status, headers, body: parsed });
			response.writeHead(status, headers);
			response.end(body);
		};
		if (url.startsWith('/s400')) {
			send(400, JSON_HEADERS, JSON_BODY);
		} else if (url.startsWith('/s404text')) {
			send(404, { 'content-type': 'text/plain' }, 'plain text body');
		} else if (url.startsWith('/s500empty')) {
			send(500, {}, '');
		} else if (url.startsWith('/s401')) {
			send(401, JSON_HEADERS, JSON_BODY);
		} else if (url.startsWith('/invalid')) {
			send(200, JSON_HEADERS, 'not json');
		} else if (url.startsWith('/s404')) {
			send(404, JSON_HEADERS, JSON_BODY);
		} else if (url.startsWith('/loop')) {
			send(302, { location: `${base}/loop` }, '');
		} else if (url.startsWith('/slow')) {
			setTimeout(() => send(200, JSON_HEADERS, '{"slow":true}'), 2000);
		} else {
			send(200, JSON_HEADERS, '{"ok":true}');
		}
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function urlOf(c: Case): string {
	return c.path === '/refused' ? `http://127.0.0.1:${closedPort}/x` : `${base}${c.path}`;
}

function workflow(c: Case) {
	return {
		name: 'HTTP error item',
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
				typeVersion: c.version,
				position: [200, 0],
				parameters: { url: urlOf(c), options: c.options ?? {} },
				onError: c.onError,
			},
		],
		connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

/**
 * The JSON form of v1's items. The item of v1 holds an Error object, and n8n
 * saves it with its `toJSON` form; `JSON.stringify` applies that here. Then the
 * members that cannot be equal are replaced with a marker that keeps their kind:
 * `timestamp` is the clock of the run, and `stack` is the text of a V8 stack.
 * A compiled item that is missing one of these keys, or gives a different kind,
 * keeps its value and fails the comparison.
 */
function comparable(value: unknown): unknown {
	return mask(JSON.parse(JSON.stringify(value)) as unknown);
}

function mask(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(mask);
	if (typeof value !== 'object' || value === null) return value;
	const out: Record<string, unknown> = {};
	for (const [key, v] of Object.entries(value)) {
		if (key === 'timestamp' && typeof v === 'number') {
			out[key] = '<number>';
			continue;
		}
		if (key === 'stack' && typeof v === 'string') {
			out[key] = '<string>';
			continue;
		}
		out[key] = mask(v);
	}
	return out;
}

/** The output lists of the node `H`, as `runReference` traces them. */
function listsOf(out: Awaited<ReturnType<typeof runReference>>): unknown[][] {
	const traces = (out.trace ?? []) as Array<{ step: string; items?: unknown }>;
	return traces
		.filter((t) => t.step === 'H')
		.flatMap((t) => {
			const items = (t.items ?? []) as unknown[];
			return items.length > 0 && items.every((x) => Array.isArray(x))
				? (items as unknown[][])
				: [items];
		});
}

/** The message of the first error item that v1 gave, for the runtime failure of the case. */
function refusedMessage(nodes: Record<string, unknown[][]>): string {
	for (const list of nodes.H ?? []) {
		for (const item of list) {
			const message = (item as { error?: { message?: unknown } } | null | undefined)?.error?.message;
			if (typeof message === 'string') return message;
		}
	}
	return 'connect ECONNREFUSED';
}

describe('HTTP Request error item and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		log = [];
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 20_000,
		});
		// A request that v1 stopped still gets its answer from the server a moment later.
		if (c.error?.startsWith('http: the request timed out')) {
			await new Promise((resolve) => setTimeout(resolve, 2300));
		}
		const converted = convertWorkflow(workflow(c), { trace: 'all' });
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes ?? []).toEqual([]);
		const failure =
			c.path === '/refused' ? refusedMessage(v1.nodes) : c.error;
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				H:
					failure !== undefined
						? [{ $error: failure }]
						: log.map((s) => ({ status: s.status, headers: s.headers, body: s.body })),
			},
			trace: true,
		});
		expect(out.status).toBe('ok');
		expect(comparable(listsOf(out))).toEqual(comparable(v1.nodes.H ?? []));
	}, 40_000);
});

describe('HTTP Request error item of two items and v1', () => {
	it.each([4.2, 4.3, 4.4].flatMap((version) => ['continueRegularOutput', 'continueErrorOutput'].map((onError) => ({ version, onError: onError as OnError, label: `two items where the second fails, version ${version}, ${onError}` }))))(
		'$label',
		async (c) => {
			log = [];
			const data = JSON.stringify([
				{ url: `${base}/ok` },
				{ url: `${base}/s404` },
			]);
			const wf = {
				name: 'HTTP two items',
				nodes: [
					{
						name: 'T',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						name: 'D',
						type: 'n8n-nodes-testing.testData',
						typeVersion: 1,
						position: [200, 0],
						parameters: { data },
					},
					{
						name: 'H',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: c.version,
						position: [400, 0],
						parameters: { url: '={{ $json.url }}', options: {} },
						onError: c.onError,
					},
				],
				connections: {
					T: { main: [[{ node: 'D', type: 'main', index: 0 }]] },
					D: { main: [[{ node: 'H', type: 'main', index: 0 }]] },
				},
				settings: { executionOrder: 'v1' },
			};
			const v1 = await runOracle(wf, { start: 'T', item: {}, mode: 'trigger', timeoutMs: 20_000 });
			const converted = convertWorkflow(wf, { trace: 'all' });
			expect(converted.ok).toBe(true);
			expect(converted.fallbackNodes ?? []).toEqual([]);
			const out = await runReference(converted.source, {
				trigger: { body: {} },
				now: 0,
				seed: 1,
				effects: {
					H: [
						{ status: 200, headers: JSON_HEADERS, body: { ok: true } },
						{ status: 404, headers: JSON_HEADERS, body: { error: 'nope', code: 7 } },
					],
				},
				trace: true,
			});
			expect(out.status).toBe('ok');
			expect(comparable(listsOf(out))).toEqual(comparable(v1.nodes.H ?? []));
		},
		40_000,
	);
});
