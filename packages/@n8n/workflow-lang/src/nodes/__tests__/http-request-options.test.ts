/**
 * Redirect settings, the time limit and the query format of the HTTP Request node against
 * v1. Each case runs the v1 workflow in n8n's engine against a local server, and the
 * converted workflow on the reference runner with the responses that the server gave, in the
 * same order. The requests, the output items and the error message must be the same, and the
 * node must not run in the fallback host.
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

interface Case {
	name: string;
	version: number;
	path: string;
	parameters: Record<string, unknown>;
	onError?: string;
	/** The request of the converted node reaches its time limit (the runtime's error). */
	timeout?: number;
}

const row = (name: string, value: unknown) => ({ name, value });
const noFollow = { redirect: { redirect: { followRedirects: false } } };
const never = { response: { response: { neverError: true } } };
const limit = (n: number) => ({ redirect: { redirect: { maxRedirects: n } } });

const CASES: Case[] = [
	{
		name: 'no redirects: a redirect is an error',
		version: 4.2,
		path: '/r',
		parameters: { options: noFollow },
	},
	{
		name: 'no redirects, continue on fail',
		version: 4.2,
		path: '/r',
		parameters: { options: noFollow },
		onError: 'continueRegularOutput',
	},
	{
		name: 'no redirects, continue on fail, version 4.5',
		version: 4.5,
		path: '/r',
		parameters: { options: noFollow },
		onError: 'continueRegularOutput',
	},
	{
		name: 'no redirects, never error',
		version: 4.2,
		path: '/r',
		parameters: { options: { ...noFollow, ...never } },
	},
	{ name: 'version 3 follows no redirect', version: 3, path: '/r', parameters: { options: {} } },
	{
		name: 'version 3 with the option follows',
		version: 3,
		path: '/r',
		parameters: { options: { redirect: { redirect: { followRedirects: true } } } },
	},
	{ name: 'a limit that is enough', version: 4.2, path: '/r', parameters: { options: limit(1) } },
	{
		name: 'a limit that is reached',
		version: 4.2,
		path: '/loop?n=0',
		parameters: { options: limit(3) },
	},
	{
		name: 'a limit that is reached, continue on fail',
		version: 4.2,
		path: '/loop?n=0',
		parameters: { options: limit(3) },
		onError: 'continueRegularOutput',
	},
	{
		name: 'a limit that is reached, never error',
		version: 4.2,
		path: '/loop?n=0',
		parameters: { options: { ...limit(3), ...never } },
	},
	{ name: 'the default limit', version: 4.2, path: '/loop?n=0', parameters: { options: {} } },
	{
		name: 'a time limit that is reached',
		version: 4.2,
		path: '/slow',
		parameters: { options: { timeout: 300 } },
		timeout: 300,
	},
	{
		name: 'a time limit that is reached, continue on fail',
		version: 4.2,
		path: '/slow',
		parameters: { options: { timeout: 300 } },
		onError: 'continueRegularOutput',
		timeout: 300,
	},
	{
		name: 'a time limit that is reached, continue on fail, version 4.5',
		version: 4.5,
		path: '/slow',
		parameters: { options: { timeout: 300 } },
		onError: 'continueRegularOutput',
		timeout: 300,
	},
	{
		name: 'a time limit that is not reached',
		version: 4.2,
		path: '/slow',
		parameters: { options: { timeout: 8000 } },
	},
];

let server: Server;
let base = '';
let log: Served[] = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		const url = request.url ?? '';
		const send = (status: number, headers: Record<string, string>, body: string) => {
			log.push({
				path: url,
				status,
				headers,
				body: headers['content-type'] === 'application/json' ? JSON.parse(body) : body,
			});
			response.writeHead(status, headers);
			response.end(body);
		};
		if (url.startsWith('/r')) {
			send(302, { location: `${base}/ok`, 'content-type': 'text/plain' }, 'moved');
		} else if (url.startsWith('/loop')) {
			const n = Number(url.split('=')[1] ?? '0');
			send(302, { location: `${base}/loop?n=${n + 1}`, 'content-type': 'text/plain' }, '');
		} else if (url.startsWith('/slow')) {
			setTimeout(() => send(200, { 'content-type': 'application/json' }, '{"slow":true}'), 1200);
		} else {
			send(200, { 'content-type': 'application/json' }, '{"ok":true}');
		}
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function workflow(c: Case) {
	return {
		name: 'HTTP options',
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
				parameters: { url: `${base}${c.path}`, ...c.parameters },
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

/** An item without the fields that differ by run: the stack of an error and the date. */
function stable(value: unknown): unknown {
	return JSON.parse(
		JSON.stringify(value, (key, v: unknown) => (key === 'stack' || key === 'date' ? undefined : v)),
	);
}

describe('HTTP Request redirects, time limit and query format, and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))(
		'$label',
		async (c) => {
			log = [];
			const v1 = await runOracle(workflow(c), {
				start: 'T',
				item: {},
				mode: 'trigger',
				timeoutMs: 20_000,
			});
			// A request that v1 stopped still gets its answer from the server a moment later.
			if (c.timeout !== undefined) await new Promise((resolve) => setTimeout(resolve, 1500));
			const served = log;
			const converted = convertWorkflow(workflow(c), { trace: 'all' });
			expect(converted.fallbackNodes).toEqual([]);
			const out = await runReference(converted.source, {
				trigger: { body: {} },
				now: 0,
				seed: 1,
				effects: {
					H:
						c.timeout !== undefined
							? [{ $error: `http: the request timed out after ${c.timeout} ms` }]
							: served.map((s) => ({ status: s.status, headers: s.headers, body: s.body })),
				},
				trace: true,
			});
			const requests = out.effects.filter((e) => e.step === 'H' && e.kind === 'http');
			expect(
				requests.map(
					(e) =>
						new URL((e.args as { url: string }).url).pathname +
						new URL((e.args as { url: string }).url).search,
				),
			).toEqual(served.map((s) => s.path));
			if (c.timeout !== undefined) {
				expect(requests.map((e) => (e.args as { timeoutMs?: number }).timeoutMs)).toEqual([
					c.timeout,
				]);
			}
			const traced = (out.trace ?? []).find((t) => t.step === 'H')?.items;
			if (v1.error !== null) {
				expect(out.status).toBe('error');
				const failure = traced as { $error?: { message?: string } } | undefined;
				expect(failure?.$error?.message).toBe(v1.error);
				return;
			}
			expect(out.status).toBe('ok');
			expect(stable(traced)).toEqual(stable(v1.nodes.H?.[0]));
		},
		40_000,
	);

	it.each([
		{
			label: 'a repeated name is a list',
			version: 4.3,
			parameters: [row('tag', 'a b'), row('tag', 'c'), row('x', '1')],
			qs: { tag: ['a b', 'c'], x: '1' },
		},
		{
			label: 'a value that is a list or an object',
			version: 4.2,
			parameters: [row('tag', '={{ ["a b", "c"] }}'), row('o', '={{ ({ k: 1 }) }}')],
			qs: { tag: ['a b', 'c'], o: { k: 1 } },
		},
	])('writes the query as the qs library: $label', async (c) => {
		const converted = convertWorkflow(
			workflow({
				name: c.label,
				version: c.version,
				path: '/q',
				parameters: {
					sendQuery: true,
					queryParameters: { parameters: c.parameters },
					options: {},
				},
			}),
			{ trace: 'all' },
		);
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: { H: [{ status: 200, headers: {}, body: {} }] },
		});
		const args = out.effects.find((e) => e.step === 'H')?.args as {
			qs: unknown;
			qsFormat: string;
		};
		// The runtime writes `brackets` as v1 writes its query: `tag%5B0%5D=a%20b` (spec 7.1).
		expect(args.qsFormat).toBe('brackets');
		expect(args.qs).toEqual(c.qs);
	});

	it.each(['brackets', 'repeat'])('keeps the array format "%s" in the host', (format) => {
		const converted = convertWorkflow(
			workflow({
				name: format,
				version: 4.3,
				path: '/q',
				parameters: {
					sendQuery: true,
					queryParameters: { parameters: [row('a', '1')] },
					options: { queryParameterArrays: format },
				},
			}),
		);
		expect(converted.fallbackNodes).toEqual(['H']);
	});
});
