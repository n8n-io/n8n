/**
 * Form bodies and raw bodies of the HTTP Request node against v1. Each case runs the v1
 * workflow in n8n's engine against a local server and the converted workflow on the reference
 * runner: the content type and the text of the body must be the same. Options that the
 * library node does not have (no redirects, a proxy, no certificate check) keep the v1 node
 * in the fallback host.
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

const form = (rows: unknown[], extra: Record<string, unknown> = {}) => ({
	method: 'POST',
	sendBody: true,
	contentType: 'form-urlencoded',
	bodyParameters: { parameters: rows },
	...extra,
});

const raw = (type: unknown, body: unknown, extra: Record<string, unknown> = {}) => ({
	method: 'POST',
	sendBody: true,
	contentType: 'raw',
	rawContentType: type,
	body,
	...extra,
});

const CASES: Case[] = [
	{
		name: 'a form body',
		version: 4.2,
		parameters: form([row('grant_type', 'client_credentials'), row('scope', 'read write')]),
	},
	{
		name: 'a form body with values that need an escape',
		version: 4.2,
		parameters: form([
			row('text', "a b+c&d=e/f?g#h%i'j(k)l!m*n~o-p_q.r"),
			row('unicode', 'Grüße € 😀'),
			row('k e y[0]', 'x'),
			row('empty', ''),
		]),
	},
	{
		name: 'a form body with values from the item',
		version: 4.2,
		parameters: form([
			row('n', '={{ $json.n }}'),
			row('flag', '={{ $json.flag }}'),
			row('none', '={{ $json.none }}'),
			row('missing', '={{ $json.missing }}'),
			row('list', '={{ $json.list }}'),
			row('obj', '={{ $json.obj }}'),
			row('={{ "f_" + $json.k }}', '={{ $json.v }}'),
		]),
	},
	{
		name: 'a form body with a repeated name from version 4.3',
		version: 4.3,
		parameters: form([row('tag', 'a'), row('tag', 'b c'), row('one', '1')]),
	},
	{
		name: 'a form body with a repeated name before version 4.3',
		version: 4.2,
		parameters: form([row('tag', 'a'), row('tag', 'b')]),
	},
	{
		name: 'a form body and a content type header of the user',
		version: 4.2,
		parameters: form([row('a', '1')], {
			sendHeaders: true,
			headerParameters: { parameters: [row('Content-Type', 'text/plain'), row('X-Test', 'y')] },
		}),
	},
	{
		name: 'a form body with PUT',
		version: 4.2,
		parameters: form([row('a', '1')], { method: 'PUT' }),
	},
	{
		name: 'a raw XML body',
		version: 4.2,
		parameters: raw('text/xml', '<order id="7"><item>x</item></order>'),
	},
	{
		name: 'a raw body from an expression',
		version: 4.2,
		parameters: raw('application/x-ndjson', '={{ JSON.stringify($json.obj) }}\n{{ $json.n }}'),
	},
	{
		name: 'a raw body whose content type is an expression',
		version: 4.2,
		parameters: raw('={{ "text/" + $json.k }}', 'plain text'),
	},
	{
		name: 'a raw body and a content type header of the user',
		version: 4.2,
		parameters: raw('text/csv', 'a,b\n1,2', {
			sendHeaders: true,
			headerParameters: { parameters: [row('Content-Type', 'text/plain'), row('X-Test', 'y')] },
		}),
	},
	{
		name: 'a raw body without a content type',
		version: 4.2,
		parameters: {
			method: 'POST',
			sendBody: true,
			contentType: 'raw',
			body: 'plain text',
			sendHeaders: true,
			headerParameters: { parameters: [row('Content-Type', 'text/csv'), row('X-Test', 'y')] },
		},
	},
	{
		name: 'a raw JSON body',
		version: 4.2,
		parameters: raw('application/json', '{"a": 1,  "b": [true, null]}'),
	},
];

const HOST: Case[] = [
	{
		name: 'a request that does not follow redirects',
		version: 4.2,
		parameters: { options: { redirect: { redirect: { followRedirects: false } } } },
	},
	{
		name: 'version 3 with an empty redirect option',
		version: 3,
		parameters: { options: { redirect: { redirect: {} } } },
	},
	{ name: 'version 3 without the redirect option', version: 3, parameters: {} },
	{
		name: 'a limit of redirects',
		version: 4.2,
		parameters: { options: { redirect: { redirect: { followRedirects: true, maxRedirects: 3 } } } },
	},
	{
		name: 'no certificate check',
		version: 4.2,
		parameters: { options: { allowUnauthorizedCerts: true } },
	},
	{ name: 'a proxy', version: 4.2, parameters: { options: { proxy: 'http://127.0.0.1:9' } } },
	{
		name: 'the format of arrays in the query',
		version: 4.3,
		parameters: {
			sendQuery: true,
			queryParameters: { parameters: [row('a', '1')] },
			options: { queryParameterArrays: 'brackets' },
		},
	},
	{
		name: 'a form body as text',
		version: 4.2,
		parameters: { ...form([]), specifyBody: 'string', body: 'a=1' },
	},
	{
		name: 'a raw body with GET',
		version: 4.2,
		parameters: raw('text/plain', 'x', { method: 'GET' }),
	},
	{
		name: 'a form body with a method that is an expression',
		version: 4.2,
		parameters: form([row('a', '1')], { method: '={{ $json.k }}' }),
	},
];

let server: Server;
let base = '';
let log: Array<{ method: string; type: string; test: string; body: string }> = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		let text = '';
		request.on('data', (chunk) => (text += String(chunk)));
		request.on('end', () => {
			log.push({
				method: request.method ?? '',
				type: String(request.headers['content-type'] ?? ''),
				test: String(request.headers['x-test'] ?? ''),
				body: text,
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
	const { options, ...parameters } = c.parameters;
	return {
		name: 'HTTP bodies',
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
				parameters: {
					jsCode:
						"return [{ json: { k: 'plain', v: 7, n: 1.5, flag: false, none: null, list: ['a', 'b c'], obj: { x: 1, y: { z: 'w' } } } }];",
				},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: c.version,
				position: [400, 0],
				parameters: { url: `${base}/x`, options: options ?? {}, ...parameters },
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'H', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** The value of a header of a request, by its name in any case. */
function header(headers: Record<string, string> | undefined, name: string): string {
	for (const [k, v] of Object.entries(headers ?? {})) if (k.toLowerCase() === name) return v;
	return '';
}

describe('HTTP Request form bodies and raw bodies and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))(
		'$label',
		async (c) => {
			log = [];
			const v1 = await runOracle(workflow(c), {
				start: 'T',
				item: {},
				mode: 'trigger',
				timeoutMs: 10_000,
			});
			expect(v1.error).toBeFalsy();
			const served = log;
			expect(served).toHaveLength(1);
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
					const args = e.args as {
						method: string;
						headers?: Record<string, string>;
						body?: unknown;
					};
					return {
						method: args.method,
						type: header(args.headers, 'content-type'),
						test: header(args.headers, 'x-test'),
						body: args.body,
					};
				});
			expect(requests).toEqual(served);
		},
		30_000,
	);

	it.each([
		{ label: 'an empty redirect option from version 4', version: 4.2, redirect: {} },
		{ label: 'the default limit of redirects', version: 4.2, redirect: { maxRedirects: 21 } },
		{ label: 'version 3 that follows redirects', version: 3, redirect: { followRedirects: true } },
	])('follows redirects as v1: $label', (c) => {
		const converted = convertWorkflow(
			workflow({
				name: c.label,
				version: c.version,
				parameters: { options: { redirect: { redirect: c.redirect } } },
			}),
		);
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual([]);
	});

	it.each(HOST.map((c) => ({ ...c, label: c.name })))('runs in the host: $label', (c) => {
		const converted = convertWorkflow(workflow(c));
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual(['H']);
	});
});
