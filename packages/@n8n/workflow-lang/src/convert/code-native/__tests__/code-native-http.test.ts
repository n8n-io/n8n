/**
 * `this.helpers.httpRequest` in native Code nodes.
 *
 * The fallback host runs the code with n8n's own HTTP client against a local server, which
 * records each request and answers by its path. The native code runs in the bytecode VM,
 * where the `http` effect gets the same responses in the form that the runtime gives them
 * (spec 7.1). The test compares the requests (method, URL, query, headers, body bytes) and
 * the results.
 *
 * The host gives a failed request an error with `response` and `isAxiosError`. The task
 * runner of v1 does not (`AxiosError.toJSON`), so native code keeps reads of them in the host.
 */
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { convertWorkflow } from '../../index.ts';
import { runReference, useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

const here = dirname(fileURLToPath(import.meta.url));
const hostDist = join(here, '../../../../../workflow-fallback-host/dist');

interface Seen {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
	answer: { status: number; type: string | null; text: string };
}

/** The answer of the server for a path. */
function answerOf(path: string): { status: number; type: string | null; text: string } {
	const [, kind, arg] = path.split('?')[0].split('/');
	switch (kind) {
		case 'json':
			return {
				status: 200,
				type: 'application/json; charset=utf-8',
				text: '{"ok":true,"n":[1,2.5,"x"],"nested":{"a":null}}',
			};
		case 'json-string':
			return { status: 200, type: 'application/json', text: '"123"' };
		case 'json-broken':
			return { status: 200, type: 'application/json', text: '{"ok":' };
		case 'json-blank':
			return { status: 200, type: 'application/json', text: '  ' };
		case 'vendor-json':
			return { status: 201, type: 'application/vnd.api+json', text: '[{"id":1}]' };
		case 'text':
			return { status: 200, type: 'text/plain', text: 'plain text, not JSON' };
		case 'text-json':
			return { status: 200, type: 'text/plain', text: ' {"hidden":[true,null]} ' };
		case 'text-number':
			return { status: 200, type: 'text/html', text: '42' };
		case 'text-quoted':
			return { status: 200, type: 'text/plain', text: '"123"' };
		case 'untyped':
			return { status: 200, type: null, text: '{"untyped":1}' };
		case 'empty':
			return { status: 204, type: null, text: '' };
		case 'status':
			return { status: Number(arg), type: 'application/json', text: `{"error":"status ${arg}"}` };
		case 'status-text':
			return { status: Number(arg), type: 'text/plain', text: `failed with ${arg}` };
		default:
			return { status: 200, type: 'application/json', text: '{"echo":true}' };
	}
}

let server: Server;
let base = '';
const seen: Seen[] = [];

beforeAll(async () => {
	server = createServer((request, response) => {
		let body = '';
		request.setEncoding('utf8');
		request.on('data', (chunk: string) => {
			body += chunk;
		});
		request.on('end', () => {
			const answer = answerOf(request.url ?? '/');
			const headers: Record<string, string> = {};
			for (const [name, value] of Object.entries(request.headers)) {
				headers[name] = Array.isArray(value) ? value.join(', ') : (value ?? '');
			}
			seen.push({ method: request.method ?? '', url: request.url ?? '', headers, body, answer });
			response.writeHead(
				answer.status,
				answer.type === null ? {} : { 'content-type': answer.type },
			);
			response.end(answer.text);
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const address = server.address() as AddressInfo;
	base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

type Outcome = { ok: true; value: unknown } | { ok: false };

async function host(code: string, mode: CodeMode, input: unknown[]): Promise<Outcome> {
	// The host process must have the runners loaded: they set up n8n's modules.
	hostRunners();
	const req = createRequire(join(hostDist, 'index.js'));
	const mod = req(join(hostDist, 'code-step.js')) as {
		runCodeStepAsync: (args: unknown) => Promise<unknown>;
		parseCodeStepArgs: (args: unknown) => unknown;
	};
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false);
	try {
		const value = await mod.runCodeStepAsync(
			mod.parseCodeStepArgs({ name: 'code', code: body, items: input }),
		);
		return { ok: true, value };
	} catch {
		return { ok: false };
	}
}

/** The result of the `http` effect for an answer, as the runtime gives it (spec 7.1). */
function effectResult(answer: Seen['answer']): unknown {
	const headers: Record<string, string> =
		answer.type === null ? {} : { 'content-type': answer.type };
	let body: unknown = answer.text;
	// A response with a JSON content type and a body is parsed once; it stays text when it does not parse.
	if (answer.type !== null && /json/i.test(answer.type) && answer.text.trim() !== '') {
		try {
			body = JSON.parse(answer.text);
		} catch {}
	}
	return { status: answer.status, headers, body };
}

/** The pairs of a query, as the `brackets` format writes them (qs with `indices`). */
function queryPairs(value: unknown, prefix: string, out: Array<[string, string]>): void {
	if (value === undefined) return;
	if (value === null) out.push([prefix, '']);
	else if (Array.isArray(value)) value.forEach((v, k) => queryPairs(v, `${prefix}[${k}]`, out));
	else if (typeof value === 'object') {
		for (const [k, v] of Object.entries(value))
			queryPairs(v, prefix === '' ? k : `${prefix}[${k}]`, out);
	} else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		out.push([prefix, String(value)]);
	}
}

/** Headers that the transport sets, on both sides. */
const TRANSPORT = new Set(['host', 'connection', 'content-length', 'accept-encoding']);

function native(code: string, mode: CodeMode, input: unknown[], requests: Seen[]): Outcome {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok)
		throw new Error(`blocked: ${t.blockers.map((b) => `${b.feature}: ${b.message}`).join(', ')}`);
	expect(t.translation.usesHttp).toBe(true);
	const c = checkTranslation(t.translation, mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: { code: requests.map((r) => effectResult(r.answer)) },
	});
	const sent = (out.effects ?? []).filter((e) => e.kind === 'http');
	// The same requests, in the same order.
	expect(sent.length).toBe(requests.length);
	sent.forEach((effect, k) => {
		const args = effect.args as {
			method: string;
			url: string;
			headers: Record<string, string>;
			qs?: unknown;
			qsFormat: string;
			body?: unknown;
		};
		const wire = requests[k];
		expect(args.method).toBe(wire.method);
		expect(args.qsFormat).toBe('brackets');
		const url = new URL(args.url);
		const pairs: Array<[string, string]> = [...url.searchParams.entries()];
		queryPairs(args.qs, '', pairs);
		const wireUrl = new URL(wire.url, base);
		expect(url.origin + url.pathname).toBe(wireUrl.origin + wireUrl.pathname);
		expect(pairs).toEqual([...wireUrl.searchParams.entries()]);
		const headers: Record<string, string> = {};
		for (const [name, value] of Object.entries(args.headers)) headers[name.toLowerCase()] = value;
		const wireHeaders: Record<string, string> = {};
		for (const [name, value] of Object.entries(wire.headers)) {
			if (!TRANSPORT.has(name)) wireHeaders[name] = value;
		}
		expect(headers).toEqual(wireHeaders);
		// The body is text: the bytes that v1 sends.
		expect(args.body === undefined ? '' : args.body).toBe(wire.body);
	});
	return out.status === 'ok' ? { ok: true, value: out.result } : { ok: false };
}

/** Runs the code in the host and natively, and compares the requests and the results. */
async function same(code: string, input: unknown[], mode: CodeMode = 'all'): Promise<Outcome> {
	seen.length = 0;
	const items = input.map((i) => ({ base, ...(i as object) }));
	const h = await host(code, mode, items);
	const requests = [...seen];
	const n = native(code, mode, items, requests);
	expect(n).toEqual(h);
	return n;
}

const rows = [
	{ id: 1, name: 'Ada Lovelace', token: 'tok-1', tags: ['a', 'b c'], note: null },
	{ id: 2, name: "Grace O'Hopper (x) ~!*", token: 'tok-2', tags: [], note: 'ü €' },
];

/** A request for each item, with the outcome in the item: [name, options with `i` as the item]. */
const requests: Array<[string, string]> = [
	['a GET of JSON', "{ url: i.json.base + '/json', json: true }"],
	['a GET with an explicit method', "{ method: 'GET', url: i.json.base + '/json' }"],
	['a JSON string', "{ url: i.json.base + '/json-string' }"],
	['JSON that does not parse', "{ url: i.json.base + '/json-broken', json: true }"],
	['a blank JSON body', "{ url: i.json.base + '/json-blank' }"],
	['a vendor JSON type', "{ url: i.json.base + '/vendor-json' }"],
	['plain text', "{ url: i.json.base + '/text', json: true }"],
	['text that is JSON', "{ url: i.json.base + '/text-json' }"],
	['text that is a number', "{ url: i.json.base + '/text-number' }"],
	['text that is a JSON string', "{ url: i.json.base + '/text-quoted' }"],
	['a body without a type', "{ url: i.json.base + '/untyped' }"],
	['an empty answer', "{ method: 'DELETE', url: i.json.base + '/empty/' + i.json.id }"],
	[
		'a POST of an object',
		"{ method: 'POST', url: i.json.base + '/echo', body: { id: i.json.id, name: i.json.name, tags: i.json.tags, note: i.json.note, gone: undefined, n: 1.5e21 }, json: true }",
	],
	[
		'a POST with headers of each kind',
		"{ method: 'post', url: i.json.base + '/echo', headers: { Authorization: 'Bearer ' + i.json.token, 'X-Id': i.json.id, 'X-Null': null, 'X-False': false, 'X-True': true, 'X-Missing': i.json.zzz, ACCEPT: 'text/csv', 'User-Agent': 'custom/1' }, body: { a: 1 }, json: true }",
	],
	['a POST of text', "{ method: 'POST', url: i.json.base + '/echo', body: 'raw ' + i.json.name }"],
	['a POST without a body', "{ method: 'POST', url: i.json.base + '/echo', json: true }"],
	['a POST of an empty object', "{ method: 'POST', url: i.json.base + '/echo', body: {} }"],
	[
		'a POST of a list',
		"{ method: 'PUT', url: i.json.base + '/echo', body: [i.json.id, { a: i.json.name }] }",
	],
	['a POST of an empty list', "{ method: 'PATCH', url: i.json.base + '/echo', body: [] }"],
	[
		'JSON text with a JSON type',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'Content-Type': 'application/json' }, body: '  ' + JSON.stringify({ id: i.json.id, name: i.json.name }) + '\\n' }",
	],
	[
		'text that is not JSON with a JSON type',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'content-type': 'application/json; charset=utf-8' }, body: 'name=' + i.json.name }",
	],
	[
		'an object with another type',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'content-type': 'text/plain' }, body: { name: i.json.name } }",
	],
	[
		'a form of plain values',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: { grant_type: 'client_credentials', name: i.json.name, id: i.json.id, on: true, none: null, missing: undefined, note: i.json.note, ' padded ': 'x' } }",
	],
	[
		'a form of nested values',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' }, body: { tags: i.json.tags, 'ids[]': [1, null, 2], user: { name: i.json.name, roles: ['a', { deep: true }] }, 'meta{}': { a: [1] }, rows: [{ a: 1 }, 'b'], empty: {} } }",
	],
	[
		'a form as text',
		"{ method: 'POST', url: i.json.base + '/echo', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1&name=' + i.json.id + '%20x+y' }",
	],
	['a GET with a body', "{ method: 'GET', url: i.json.base + '/echo', body: { a: 1 } }"],
	['a body without a method', "{ url: i.json.base + '/echo', body: { a: i.json.id } }"],
	['a DELETE with text', "{ method: 'DELETE', url: i.json.base + '/echo', body: 'x' }"],
	[
		'a query',
		"{ url: i.json.base + '/echo?fixed=1&also=a%20b', qs: { q: i.json.name, id: i.json.id, on: true, none: null, missing: undefined, tags: i.json.tags, filter: { status: 'open', range: [1, 2] } } }",
	],
	['an empty query', "{ url: i.json.base + '/echo', qs: {} }"],
	['a time limit', "{ url: i.json.base + '/json', timeout: 5000 }"],
	[
		'a status that is ignored',
		"{ url: i.json.base + '/status/404', ignoreHttpStatusErrors: true }",
	],
	[
		'a status 500 that is ignored',
		"{ method: 'POST', url: i.json.base + '/status-text/500', ignoreHttpStatusErrors: true, body: { a: 1 } }",
	],
	['a status 404', "{ url: i.json.base + '/status/404', json: true }"],
	[
		'a status 401 with text',
		"{ method: 'POST', url: i.json.base + '/status-text/401', body: { a: 1 } }",
	],
	['a status 500', "{ url: i.json.base + '/status/500' }"],
	[
		'a status 503 that is not ignored',
		"{ url: i.json.base + '/status/503', ignoreHttpStatusErrors: false }",
	],
	['a status 304', "{ url: i.json.base + '/status/304' }"],
];

/** The members of the error that v1's task runner, the host and native code give alike. */
const READ_ERROR =
	'{ message: e.message, name: e.name, code: e.code, status: e.status, statusCode: e.statusCode, httpCode: e.httpCode, description: e.description, text: String(e), joined: "failed: " + e, template: `$' +
	'{e}`, own: e.toString(), truthy: e ? 1 : 0, kind: typeof e }';

describe('this.helpers.httpRequest in native code', () => {
	it.each(requests)('sends %s as n8n does, and gives the same result', async (_, options) => {
		const code = `const out = [];
for (const i of items) {
	try {
		const result = await this.helpers.httpRequest(${options});
		out.push({ json: { id: i.json.id, result, kind: typeof result } });
	} catch (e) {
		out.push({ json: { id: i.json.id, failed: ${READ_ERROR} } });
	}
}
return out;`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.length).toBe(rows.length);
	});

	it('sends the requests of `call` and `apply` as n8n does', async () => {
		const code = `const out = [];
for (const i of items) {
	const a = await this.helpers.httpRequest.call(this, { url: i.json.base + '/json' });
	const b = await this.helpers.httpRequest.call(undefined, { method: 'POST', url: i.json.base + '/echo', body: { id: i.json.id }, json: true });
	const c = await this.helpers.httpRequest.apply(this, [{ url: i.json.base + '/text', json: true }]);
	const d = await this.helpers.httpRequest.apply(null, [{ url: i.json.base + '/untyped' }]);
	out.push({ json: { a, b, c, d } });
}
return out;`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.map((r) => r.url)).toEqual(
			rows.flatMap(() => ['/json', '/echo', '/text', '/untyped']),
		);
	});

	it('sends the options of a constant through `call` and `apply`', async () => {
		const code = `const options = { url: items[0].json.base + '/json', json: true };
const a = await this.helpers.httpRequest.call(this, options);
const b = await this.helpers.httpRequest.apply(this, [options]);
return [{ json: { a, b } }];`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.map((r) => r.url)).toEqual(['/json', '/json']);
	});

	it('reads the request helper of a constant and sends its `call`', async () => {
		const code = `const request = this.helpers.httpRequest;
const results = [];
for (const i of items) results.push(await request.call(this, { url: i.json.base + '/json' }));
return [{ json: { results } }];`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.map((r) => r.url)).toEqual(['/json', '/json']);
	});

	it.each([
		['a second argument of `call`', 'request.call(this, { url: url }, 1)'],
		['two elements of `apply`', 'request.apply(this, [{ url: url }, 1])'],
		['a spread list of `apply`', 'request.apply(this, list)'],
	])('keeps the request of %s in the host', (_, form) => {
		const code =
			`const list = [{ url: URL }]; const r = await ${form}; return [{ json: { r } }];`.replace(
				'URL',
				"'http://127.0.0.1/x'",
			);
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok).toBe(false);
	});

	it('fails the node with the message of the error when the code does not catch it', async () => {
		const code =
			"const r = await this.helpers.httpRequest({ url: items[0].json.base + '/status/404' }); return [{ json: { r } }];";
		expect((await same(code, rows)).ok).toBe(false);
		expect(seen.length).toBe(1);
	});

	it('throws the error again, and stops at the first failed request', async () => {
		const code = `const out = [];
for (const path of ['/json', '/status/418', '/json']) {
	try {
		out.push({ json: await this.helpers.httpRequest({ url: items[0].json.base + path }) });
	} catch (error) {
		if (error.status !== 404) throw error;
	}
}
return out;`;
		expect((await same(code, rows)).ok).toBe(false);
		expect(seen.length).toBe(2);
	});

	it('runs requests in local async functions, one after the other', async () => {
		const code = `const call = async (path, body) => {
	try {
		if (body) return await this.helpers.httpRequest({ method: 'POST', url: items[0].json.base + path, body, json: true });
		return await this.helpers.httpRequest({ url: items[0].json.base + path, json: true });
	} catch (err) {
		return { error: err.message, status: err.status };
	}
};
async function page(n) {
	const first = await call('/echo?page=' + n);
	const second = await call('/status/' + (400 + n), { n });
	return { first, second };
}
const pages = [];
for (let n = 1; n <= 3; n++) pages.push(await page(n));
const plain = await 5;
return [{ json: { pages, plain, last: await call('/text') } }];`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.map((r) => r.url)).toEqual([
			'/echo?page=1',
			'/status/401',
			'/echo?page=2',
			'/status/402',
			'/echo?page=3',
			'/status/403',
			'/text',
		]);
	});

	it('starts the requests of Promise.all in the order of the items', async () => {
		const code = `const results = await Promise.all(items.map(async (i) => {
	try {
		return await this.helpers.httpRequest({ method: 'POST', url: i.json.base + (i.json.id === 1 ? '/status/500' : '/echo'), body: { id: i.json.id } });
	} catch (e) {
		return { failed: e.message };
	}
}));
return [{ json: { results } }];`;
		const n = await same(code, rows);
		expect(n.ok).toBe(true);
		expect(seen.map((r) => r.body)).toEqual(['{"id":1}', '{"id":2}']);
	});

	it('gives the message of the error to the error setting of the node', async () => {
		const jsCode =
			"await this.helpers.httpRequest({ method: 'GET', url: 'http://localhost/missing' }); return [{ json: { threw: false } }];";
		const wf = {
			name: 'Fails',
			nodes: [
				{
					name: 'Hook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: { path: 'a' },
				},
				{
					name: 'Fails',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [200, 0],
					parameters: { jsCode },
					onError: 'continueRegularOutput',
				},
			],
			connections: { Hook: { main: [[{ node: 'Fails', type: 'main', index: 0 }]] } },
		};
		const out = convertWorkflow(wf, { trace: 'all' });
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([]);
		const run = await runReference(out.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: { Fails: [{ status: 404, headers: {}, body: '' }] },
			trace: true,
		});
		// As v1 (the behaviour case `31-code-http-helper`).
		expect((run.trace ?? []).find((t) => t.step === 'Fails')?.items).toEqual([
			{ error: 'Request failed with status code 404' },
		]);
	});

	it('runs a request for each item in "each item" mode', async () => {
		const code = `try {
	const r = await this.helpers.httpRequest({ method: 'POST', url: $json.base + ($json.id === 1 ? '/echo' : '/status/429'), body: { name: $json.name } });
	return { json: { id: $json.id, r } };
} catch (e) {
	return { json: { id: $json.id, error: e.message, code: e.code } };
}`;
		const n = await same(code, rows, 'each');
		expect(n.ok).toBe(true);
		expect(seen.length).toBe(2);
	});

	it.each([
		['the config of the error', 'catch (e) { return [{ json: { s: e.config } }]; }'],
		['the stack of the error', 'catch (e) { return [{ json: { s: e.stack } }]; }'],
		['the error as a value', 'catch (e) { return [{ json: { e } }]; }'],
		['the error as JSON', 'catch (e) { return [{ json: { s: JSON.stringify(e) } }]; }'],
	])('keeps code that reads %s in the host', (_, handler) => {
		const code = `try { return [{ json: await this.helpers.httpRequest({ url: 'http://localhost/x' }) }]; } ${handler}`;
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok).toBe(false);
	});

	// v1's task runner gets the error as JSON (`AxiosError.toJSON`): it has no `response`.
	it.skipIf(!taskRunnerAvailable())(
		'reads the members of the error of a request as the task runner of v1 gives them',
		async () => {
			const code = `const out = [];
for (const path of ['/status/404', '/status-text/500', '/json']) {
	try {
		out.push({ json: { ok: await this.helpers.httpRequest({ url: items[0].json.base + path }) } });
	} catch (e) {
		out.push({ json: { message: e.message, name: e.name, code: e.code, status: e.status, response: e.response === undefined, responseStatus: e.response?.status, data: e.response?.data ?? null, axios: e.isAxiosError === undefined, statusCode: e.statusCode ?? null, text: String(e) } });
	}
}
return out;`;
			seen.length = 0;
			const items = [{ base }];
			const runner = await runnerCode(code, 'all', items);
			const requests = [...seen];
			const n = native(code, 'all', items, requests);
			expect(runner.ok && n.ok).toBe(true);
			if (runner.ok && n.ok) expect(n.value).toEqual(runner.value);
		},
		120_000,
	);

	it.skipIf(!taskRunnerAvailable())(
		'fails the node with the message of the task runner of v1',
		async () => {
			const code =
				"const r = await this.helpers.httpRequest({ url: items[0].json.base + '/status/404' });\nreturn [{ json: { r } }];";
			seen.length = 0;
			const items = [{ base }];
			const runner = await runnerCode(code, 'all', items);
			const requests = [...seen];
			expect(runner).toEqual({ ok: false, error: 'Request failed with status code 404' });
			expect(
				nativeCode(code, 'all', items, {
					effects: { code: requests.map((r) => effectResult(r.answer)) },
				}),
			).toEqual(runner);
		},
		120_000,
	);

	it.each([
		[
			'bytes',
			"await this.helpers.httpRequest({ url: 'http://localhost/x', encoding: 'arraybuffer' })",
		],
		[
			'a computed method',
			"await this.helpers.httpRequest({ method: items[0].json.m, url: 'http://localhost/x' })",
		],
		['options in a variable', 'await this.helpers.httpRequest(items[0].json.options)'],
		[
			'spread options',
			"await this.helpers.httpRequest({ ...items[0].json.options, url: 'http://localhost/x' })",
		],
		[
			'a computed ignore setting',
			"await this.helpers.httpRequest({ url: 'http://localhost/x', ignoreHttpStatusErrors: items.length > 1 })",
		],
		[
			'a multipart body',
			"await this.helpers.httpRequest({ method: 'POST', url: 'http://localhost/x', headers: { 'content-type': 'multipart/form-data' }, body: { a: 1 } })",
		],
		[
			'a request that the code does not await',
			"this.helpers.httpRequest({ url: 'http://localhost/x' })",
		],
		[
			'a request with then',
			"await this.helpers.httpRequest({ url: 'http://localhost/x' }).then((r) => r.id)",
		],
		['the legacy request helper', "await this.helpers.request({ url: 'http://localhost/x' })"],
		[
			'another helper',
			"await this.helpers.httpRequestWithAuthentication.call(this, 'api', { url: 'http://localhost/x' })",
		],
		[
			'requests at the same time',
			"await Promise.all(items.map((i) => this.helpers.httpRequest({ url: 'http://localhost/x' })))",
		],
	])('keeps %s in the host', (_, expression) => {
		const code = `const r = ${expression}; return [{ json: { r } }];`;
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});

	it.each([
		[
			'a function expression',
			"const get = async function (u) { return await this.helpers.httpRequest({ url: u }); }; return [{ json: await get('http://localhost/x') }];",
		],
		[
			'a function that the code uses as a value',
			"async function get(u) { return await this.helpers.httpRequest({ url: u }); } const o = { get }; return [{ json: await get('http://localhost/x') }];",
		],
		[
			'strict mode',
			"'use strict'; return [{ json: await this.helpers.httpRequest({ url: 'http://localhost/x' }) }];",
		],
	])('keeps a request in %s in the host: `this` can be another value', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});

	it.each([
		[
			'a constant for the bound helper',
			`const http = this.helpers.httpRequest.bind(this);
const out = [];
for (const i of items) out.push({ json: await http({ url: i.json.base + '/json', json: true }) });
return out;`,
		],
		[
			'constants for this and its helpers',
			`const self = this;
const tools = self.helpers;
const call = async (url) => {
	try {
		return await tools.httpRequest({ method: 'POST', url, body: { a: 1 } });
	} catch (e) {
		return { failed: e.message, status: e.status };
	}
};
return [{ json: { ok: await call(items[0].json.base + '/echo'), bad: await call(items[0].json.base + '/status/409') } }];`,
		],
		[
			'options in a constant',
			`const first = { method: 'POST', url: items[0].json.base + '/echo', body: { a: 1 }, json: true };
const second = { url: items[0].json.base + '/json', json: true };
const out = [];
for (let k = 0; k < 2; k++) out.push({ json: await this.helpers.httpRequest(second) });
out.push({ json: await this.helpers.httpRequest(first) });
return out;`,
		],
		[
			'the global helpers',
			"return [{ json: await helpers.httpRequest({ url: items[0].json.base + '/text-json' }) }];",
		],
		[
			'the status and the body of the full response',
			`const out = [];
for (const path of ['/json', '/status/404', '/text', '/empty/1']) {
	const res = await this.helpers.httpRequest({ url: items[0].json.base + path, returnFullResponse: true, ignoreHttpStatusErrors: true });
	out.push({ json: { status: res.statusCode, body: res.body, ok: res.statusCode < 300 } });
}
return out;`,
		],
		[
			'a destructured full response',
			`try {
	const { body, statusCode: code } = await this.helpers.httpRequest({ method: 'POST', url: items[0].json.base + '/echo', body: { a: 1 }, returnFullResponse: true });
	const failed = await this.helpers.httpRequest({ url: items[0].json.base + '/status/500', returnFullResponse: true });
	return [{ json: { body, code, failed: failed.statusCode } }];
} catch (e) {
	return [{ json: { message: e.message, status: e.status } }];
}`,
		],
	])('makes requests through %s', async (_, code) => {
		expect((await same(code, [rows[0]])).ok).toBe(true);
		expect(seen.length).toBeGreaterThan(0);
	});

	it.each([
		[
			'the headers of the full response',
			"const res = await this.helpers.httpRequest({ url: 'http://localhost/x', returnFullResponse: true }); return [{ json: { h: res.headers } }];",
		],
		[
			'the full response as a value',
			"const res = await this.helpers.httpRequest({ url: 'http://localhost/x', returnFullResponse: true }); return [{ json: res }];",
		],
		[
			'a full response that the code does not keep in a constant',
			"return [{ json: (await this.helpers.httpRequest({ url: 'http://localhost/x', returnFullResponse: true })).body }];",
		],
		[
			'options in a constant that the code changes',
			"const o = { url: 'http://localhost/x' }; o.headers = { a: '1' }; return [{ json: await this.helpers.httpRequest(o) }];",
		],
		[
			'options in a variable',
			"let o = { url: 'http://localhost/x' }; return [{ json: await this.helpers.httpRequest(o) }];",
		],
		[
			'a constant of the helpers with another use',
			"const h = this.helpers; const b = h.prepareBinaryData; return [{ json: await h.httpRequest({ url: 'http://localhost/x' }) }];",
		],
		[
			'a constant of this with another use',
			"const self = this; const f = () => self; return [{ json: await self.helpers.httpRequest({ url: 'http://localhost/x' }) }];",
		],
		[
			'a request through a constant that the code does not await',
			"const http = this.helpers.httpRequest; const p = http({ url: 'http://localhost/x' }); return [{ json: await p }];",
		],
	])('keeps %s in the host', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		expect(t.ok && checkTranslation(t.translation, 'all').ok).toBe(false);
	});

	it('writes the code of a workflow as an async function with one http step', () => {
		const node = (name: string, type: string, parameters: Record<string, unknown>) => ({
			name,
			type: `n8n-nodes-base.${type}`,
			typeVersion: 2,
			position: [0, 0],
			parameters,
		});
		const jsCode =
			"try { return [{ json: await this.helpers.httpRequest({ url: 'http://localhost/x', json: true }) }]; } catch (e) { return [{ json: { error: e.message } }]; }";
		const wf = {
			name: 'Requests',
			nodes: [node('Hook', 'webhook', { path: 'a' }), node('Fetch', 'code', { jsCode })],
			connections: { Hook: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] } },
		};
		const out = convertWorkflow(wf);
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([]);
		expect(out.source).toContain('await ctx.http({ name: "Fetch"');
		expect(out.source).not.toContain('ctx.code(');
	});
});
