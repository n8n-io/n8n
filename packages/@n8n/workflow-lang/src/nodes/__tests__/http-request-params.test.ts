/**
 * Key-value parameters of the HTTP Request node against v1: names that are
 * expressions, rows without a name, repeated names (version 4.3 and later)
 * and dotted names in a JSON body (version 4 and later). Each case runs the v1
 * workflow in n8n's engine against a local server and the converted workflow
 * on the reference runner; the query (as name-value pairs) and the body must
 * be the same.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Case {
	name: string;
	version: number;
	parameters: Record<string, unknown>;
}

const row = (name: unknown, value: unknown) => ({ name, value });

const CASES: Case[] = [
	{
		name: 'query names that are expressions',
		version: 4.2,
		parameters: {
			sendQuery: true,
			queryParameters: {
				parameters: [row('={{ "f_" + $json.k }}', '={{ $json.v }}'), row('=fixed', 'x')],
			},
		},
	},
	{
		name: 'a query row without a name',
		version: 4.2,
		parameters: { sendQuery: true, queryParameters: { parameters: [{}, row('a', '1')] } },
	},
	{
		name: 'repeated query names before version 4.3',
		version: 4.2,
		parameters: {
			sendQuery: true,
			queryParameters: { parameters: [row('tag', 'a'), row('tag', 'b')] },
		},
	},
	{
		name: 'dotted names in a JSON body',
		version: 4.2,
		parameters: {
			method: 'POST',
			sendBody: true,
			contentType: 'json',
			specifyBody: 'keypair',
			bodyParameters: {
				parameters: [row('user.name', 'Ada'), row('={{ "user." + $json.k }}', '={{ $json.v }}')],
			},
		},
	},
];

let server: Server;
let base = '';
let log: Array<{ path: string; query: string[][]; body: unknown }> = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		let text = '';
		request.on('data', (chunk) => (text += String(chunk)));
		request.on('end', () => {
			const url = new URL(request.url ?? '/', 'http://local');
			log.push({
				path: url.pathname,
				query: [...url.searchParams.entries()].sort(),
				body: text === '' ? undefined : JSON.parse(text),
			});
			response.setHeader('content-type', 'application/json');
			response.end('{"ok":true}');
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
		name: 'HTTP params',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Items',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: { jsCode: "return [{ json: { k: 'id', v: 7 } }];" },
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: c.version,
				position: [400, 0],
				parameters: { url: `${base}/x`, options: {}, ...c.parameters },
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'H', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** The query of a request as sorted name-value pairs: an array value is one pair for each entry. */
function queryPairs(url: string, qs: Record<string, unknown> | undefined): string[][] {
	const pairs = [...new URL(url).searchParams.entries()];
	for (const [k, v] of Object.entries(qs ?? {})) {
		for (const one of Array.isArray(v) ? v : [v]) {
			if (one !== undefined && one !== null) {
				pairs.push([k, typeof one === 'string' ? one : JSON.stringify(one)]);
			}
		}
	}
	return pairs.sort();
}

describe('HTTP Request key-value parameters and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		log = [];
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		expect(v1.error).toBeFalsy();
		const served = log;
		const converted = convertWorkflow(workflow(c), { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				H: [{ status: 200, headers: { 'content-type': 'application/json' }, body: { ok: true } }],
			},
			trace: true,
		});
		expect(out.status).toBe('ok');
		const requests = out.effects
			.filter((e) => e.step === 'H' && e.kind === 'http')
			.map((e) => {
				const args = e.args as { url: string; qs?: Record<string, unknown>; body?: unknown };
				return {
					path: new URL(args.url).pathname,
					query: queryPairs(args.url, args.qs),
					body: args.body,
				};
			});
		expect(requests).toEqual(served);
	});
});
