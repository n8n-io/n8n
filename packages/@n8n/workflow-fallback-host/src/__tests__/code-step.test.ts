import { parseCodeStepArgs, runCodeStep, runCodeStepAsync } from '../code-step';
import { StepInputError } from '../items';

/** A binary entry of an item, in the in-memory form of `binary.ts`. */
const BINARY = "{ data: 'aGk=', mimeType: 'text/plain' }";

/** The binary data of the item as the code runner gives it: the `$binary` key, with its sizes. */
const BINARY_ITEM = {
	$binary: { data: { data: 'aGk=', mimeType: 'text/plain', bytes: 2, fileSize: '2 B' } },
};

const run = (
	code: string,
	items: Array<Record<string, number | string>> = [],
	timeoutMs?: number,
) => runCodeStep({ name: 'test', code, items }, { timeoutMs });

/** A local server that answers each request with its path and method as JSON. */
async function withServer(check: (port: number) => Promise<void>): Promise<void> {
	const { createServer } = await import('node:http');
	const server = createServer((request, response) => {
		response.setHeader('content-type', 'application/json');
		response.end(JSON.stringify({ path: request.url, method: request.method }));
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	try {
		await check(port);
	} finally {
		server.close();
	}
}

/**
 * A local server for the tests of `helpers.httpRequest`: `/missing` answers
 * 404 with JSON, `/bytes` answers binary data, `/echo` answers the body, and
 * any other path answers its own path and query.
 */
async function withHttpServer(check: (port: number) => Promise<void>): Promise<void> {
	const { createServer } = await import('node:http');
	const server = createServer((request, response) => {
		if (request.url?.startsWith('/missing') === true) {
			response.writeHead(404, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ reason: 'gone' }));
			return;
		}
		if (request.url?.startsWith('/bytes') === true) {
			response.writeHead(200, { 'content-type': 'application/octet-stream' });
			response.end(Buffer.from([1, 2, 3]));
			return;
		}
		if (request.url?.startsWith('/echo') === true) {
			let body = '';
			request.on('data', (chunk: Buffer) => {
				body += chunk.toString();
			});
			request.on('end', () => {
				response.writeHead(200, { 'content-type': 'application/json' });
				response.end(
					JSON.stringify({
						method: request.method,
						body: body === '' ? null : (JSON.parse(body) as unknown),
					}),
				);
			});
			return;
		}
		response.writeHead(200, { 'content-type': 'application/json' });
		response.end(JSON.stringify({ path: request.url }));
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	try {
		await check(port);
	} finally {
		server.close();
	}
}

describe('runCodeStep', () => {
	it('returns the array that the code returns', () => {
		expect(run('return items.map((i) => ({ n: i.n * 2 }));', [{ n: 1 }, { n: 2 }])).toEqual([
			{ n: 2 },
			{ n: 4 },
		]);
	});

	it('gives the variables of the instance as $vars', () => {
		process.env.WF_FALLBACK_VARIABLES = JSON.stringify({ KEY: 'v' });
		try {
			expect(run('return { k: $vars.KEY, none: $vars.OTHER ?? null };')).toEqual([
				{ k: 'v', none: null },
			]);
		} finally {
			delete process.env.WF_FALLBACK_VARIABLES;
		}
	});

	it('gives static data that starts empty, as a manual run of n8n does', () => {
		expect(
			run(
				"const s = $getWorkflowStaticData('global'); s.n = (s.n || 0) + 1; return { n: $getWorkflowStaticData('global').n };",
			),
		).toEqual([{ n: 1 }]);
	});

	it('gives $env the environment of the host, as v1 does by default', () => {
		process.env.CODE_PARITY_ENV = 'yes';
		try {
			expect(run('return { v: $env.CODE_PARITY_ENV };')).toEqual([{ v: 'yes' }]);
		} finally {
			delete process.env.CODE_PARITY_ENV;
		}
	});

	it('keeps the settings of the host out of $env', () => {
		process.env.WF_FALLBACK_SECRET = 'host-secret';
		process.env.N8N_COMPILED_ENGINE_ADMIN_SECRET = 'engine-secret';
		try {
			expect(
				run(
					'return { fallback: $env.WF_FALLBACK_SECRET ?? null, engine: $env.N8N_COMPILED_ENGINE_ADMIN_SECRET ?? null };',
				),
			).toEqual([{ fallback: null, engine: null }]);
		} finally {
			delete process.env.WF_FALLBACK_SECRET;
			delete process.env.N8N_COMPILED_ENGINE_ADMIN_SECRET;
		}
	});

	it('blocks $env with v1\u2019s message when the instance blocks it', () => {
		process.env.WF_FALLBACK_BLOCK_ENV_ACCESS = 'true';
		try {
			expect(() => run('return { home: $env.HOME };')).toThrow('access to env vars denied');
		} finally {
			delete process.env.WF_FALLBACK_BLOCK_ENV_ACCESS;
		}
	});

	it("gives this.helpers.httpRequest, as n8n's Code node does", async () => {
		await withServer(async (port) => {
			const out = await runCodeStepAsync(
				{
					name: 'test',
					code: `const req = this.helpers.httpRequest.bind(this.helpers);
return [await req({ method: 'POST', url: 'http://127.0.0.1:${port}/x', qs: { a: 1 }, body: { b: 2 }, json: true })];`,
					items: [],
				},
				{ timeoutMs: 5000 },
			);
			expect(out).toEqual([{ path: '/x?a=1', method: 'POST' }]);
		});
	});

	it("gives a nested plain function the this of n8n's Code node", async () => {
		await withServer(async (port) => {
			const out = await runCodeStepAsync(
				{
					name: 'test',
					code: `return await (async function () {
  const self = this;
  const r = await self.helpers.httpRequest({ method: 'GET', url: 'http://127.0.0.1:${port}/x', json: true });
  return [{ json: { ok: true, r } }];
})();`,
					items: [],
				},
				{ timeoutMs: 5000 },
			);
			expect(out).toEqual([{ ok: true, r: { path: '/x', method: 'GET' } }]);
		});
	});

	it('makes this the context global, at the top level and in a nested plain function', () => {
		expect(
			run(
				'const nested = (function () { return this === globalThis; })(); return { top: this === globalThis, nested };',
			),
		).toEqual([{ top: true, nested: true }]);
	});

	it("gives n8n's error fields for an error status", async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `try {
	await helpers.httpRequest({ method: 'GET', url: 'http://127.0.0.1:${port}/missing' });
	return [{ json: { threw: false } }];
} catch (e) {
	return [{ json: {
		isError: e instanceof Error,
		message: e.message,
		name: e.name,
		code: e.code,
		status: e.status,
		httpCode: e.httpCode ?? null,
		description: e.description ?? null,
		responseStatus: e.response.status,
		responseText: e.response.statusText,
		responseData: e.response.data,
	} }];
}`,
				items: [],
			});
			expect(out).toEqual([
				{
					isError: false,
					message: 'Request failed with status code 404',
					name: 'AxiosError',
					code: 'ERR_BAD_REQUEST',
					status: 404,
					httpCode: null,
					description: null,
					responseStatus: 404,
					responseText: 'Not Found',
					responseData: { reason: 'gone' },
				},
			]);
		});
	});

	it('fails the step with the message of an error status', async () => {
		await withHttpServer(async (port) => {
			await expect(
				runCodeStepAsync({
					name: 'test',
					code: `await helpers.httpRequest({ url: 'http://127.0.0.1:${port}/missing' });`,
					items: [],
				}),
			).rejects.toThrow('Request failed with status code 404');
		});
	});

	it('returns the body of an error status with ignoreHttpStatusErrors', async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `return [await helpers.httpRequest({ url: 'http://127.0.0.1:${port}/missing', ignoreHttpStatusErrors: true })];`,
				items: [],
			});
			expect(out).toEqual([{ reason: 'gone' }]);
		});
	});

	it('returns the full response with returnFullResponse', async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `const r = await helpers.httpRequest({ url: 'http://127.0.0.1:${port}/full', ignoreHttpStatusErrors: true, returnFullResponse: true });
return [{ body: r.body, statusCode: r.statusCode, statusMessage: r.statusMessage, type: r.headers['content-type'] }];`,
				items: [],
			});
			expect(out).toEqual([
				{
					body: { path: '/full' },
					statusCode: 200,
					statusMessage: 'OK',
					type: 'application/json',
				},
			]);
		});
	});

	it("writes an array in qs as v1's default does", async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `const r = await helpers.httpRequest({ url: 'http://127.0.0.1:${port}/list', qs: { a: ['1', '2'] } });
return [{ search: decodeURIComponent(r.path) }];`,
				items: [],
			});
			expect(out).toEqual([{ search: '/list?a[0]=1&a[1]=2' }]);
		});
	});

	it('returns binary data as a Buffer with encoding arraybuffer', async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `const r = await helpers.httpRequest({ url: 'http://127.0.0.1:${port}/bytes', encoding: 'arraybuffer' });
return [{ isBuffer: Buffer.isBuffer(r), bytes: [...r] }];`,
				items: [],
			});
			expect(out).toEqual([{ isBuffer: true, bytes: [1, 2, 3] }]);
		});
	});

	it('sends a JSON body for an object', async () => {
		await withHttpServer(async (port) => {
			const out = await runCodeStepAsync({
				name: 'test',
				code: `return [await helpers.httpRequest({ method: 'POST', url: 'http://127.0.0.1:${port}/echo', body: { b: 2 }, json: true })];`,
				items: [],
			});
			expect(out).toEqual([{ method: 'POST', body: { b: 2 } }]);
		});
	});

	it("gives helpers without this, as n8n's Code node does", async () => {
		await withServer(async (port) => {
			const out = await runCodeStepAsync(
				{
					name: 'test',
					code: `const r = await helpers.httpRequest({ method: 'GET', url: 'http://127.0.0.1:${port}/x', json: true });
return [{ json: r }];`,
					items: [],
				},
				{ timeoutMs: 5000 },
			);
			expect(out).toEqual([{ path: '/x', method: 'GET' }]);
		});
	});

	it('gives Luxon the time zone of the workflow, as v1 does', () => {
		const out = runCodeStep({
			name: 'zone',
			code: "return [{ now: $now.zoneName, dt: DateTime.fromISO('2026-01-02T03:04:05Z').toFormat('HH:mm') }];",
			items: [],
			timezone: 'Asia/Tokyo',
		});
		expect(out).toEqual([{ now: 'Asia/Tokyo', dt: '12:04' }]);
	});

	it('runs in sloppy mode, as n8n does: a name that the code does not declare works', () => {
		expect(run('total = 3;\nreturn { total };')).toEqual([{ total: 3 }]);
	});

	it('wraps one returned object in a list', () => {
		expect(run('return { total: items.length };', [{ n: 1 }])).toEqual([{ total: 1 }]);
	});

	it('unwraps n8n items', () => {
		expect(run('return [{ json: { a: 1 } }];')).toEqual([{ a: 1 }]);
	});

	it('rejects a result that mixes an n8n item key with other top-level keys, as v1 does', () => {
		expect(() => run('return [{ json: { a: 1 }, other: 2 }];')).toThrow(
			'Invalid output format [item 0]',
		);
	});

	it('gives an empty list when the code returns nothing', () => {
		expect(run('const x = 1;')).toEqual([]);
	});

	it('defaults items to an empty array', () => {
		expect(run('return { count: items.length };')).toEqual([{ count: 0 }]);
	});

	it('supports await', async () => {
		expect(run('const v = await Promise.resolve(3); return { v };')).toEqual([{ v: 3 }]);
	});

	it('reports a thrown error', () => {
		expect(() => run('throw new Error("bad input");')).toThrow('bad input');
	});

	it('reports a thrown non-error value', () => {
		expect(() => run('throw "plain";')).toThrow('plain');
	});

	it('reports a syntax error', () => {
		expect(() => run('return {')).toThrow(/syntax error/);
	});

	it('stops a synchronous endless loop', () => {
		expect(() => run('while (true) {}', [], 50)).toThrow('Code did not finish within 50 ms');
	});

	it('stops an endless loop after an await', () => {
		expect(() => run('await null; while (true) {}', [], 50)).toThrow(/within 50 ms/);
	});

	it('reports code that waits forever', () => {
		expect(() => run('await new Promise(() => {});')).toThrow(/never settles/);
	});

	it('has no require, process or timers', () => {
		expect(run('return { r: typeof require, p: typeof process, t: typeof setTimeout };')).toEqual([
			{ r: 'undefined', p: 'undefined', t: 'undefined' },
		]);
	});

	it('does not share state between calls', () => {
		run('globalThis.leak = 1;');
		expect(run('return { leak: typeof globalThis.leak };')).toEqual([{ leak: 'undefined' }]);
	});

	it('does not let the code change the caller items', () => {
		const items = [{ n: 1 }];
		run('items[0].n = 99; return items;', items);
		expect(items).toEqual([{ n: 1 }]);
	});

	it('runs code that it generates from a string, as v1 does', () => {
		expect(run('return { eval: eval("1 + 1"), fn: new Function("return 2")() };')).toEqual([
			{ eval: 2, fn: 2 },
		]);
	});

	it('rejects a result that is not a list of objects', () => {
		expect(() => run('return [1, 2];')).toThrow(/must return an object/);
	});

	it('takes the binary data of an item out of its JSON, as v1 does', () => {
		// v1's normalizeItems: an item with `binary` and no `json` keeps its other keys as JSON.
		expect(run('return [{ binary: { data: ' + BINARY + ' } }];')).toEqual([BINARY_ITEM]);
		expect(run('return [{ json: { a: 1 }, binary: { data: ' + BINARY + ' } }];')).toEqual([
			{ a: 1, ...BINARY_ITEM },
		]);
	});

	it('keeps the "binary" key of an object that v1 wraps in json', () => {
		// v1 wraps a single object that has no `json`: the binary map stays part of the JSON.
		expect(run('return { binary: { data: ' + BINARY + ' } };')).toEqual([
			{ binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } },
		]);
	});

	it('rejects the top-level key of a binary item that v1 rejects', () => {
		expect(() => run('return [{ a: 1, binary: { data: ' + BINARY + ' } }];')).toThrow(
			'Invalid output format [item 0]',
		);
	});

	it('rejects a mix of items with and without binary data, as v1 does', () => {
		expect(() => run('return [{ json: { a: 1 } }, { binary: { data: ' + BINARY + ' } }];')).toThrow(
			'Inconsistent item format',
		);
	});

	it('rejects a json or binary value that is not an object, as v1 does', () => {
		expect(() => run('return [{ json: 5 }];')).toThrow(
			"A 'json' property isn't an object [item 0]",
		);
		expect(() => run('return [{ json: {}, binary: 5 }];')).toThrow(
			"A 'binary' property isn't an object [item 0]",
		);
	});

	it('rejects a result that is not JSON', () => {
		expect(() => run('return { n: 1n };')).toThrow(/not JSON/);
	});
});

describe('globals of the Code node', () => {
	it('gives Luxon, $now and $today', () => {
		const [out] = run(
			"return { iso: DateTime.fromISO('2024-01-02T03:04:05Z', { zone: 'utc' }).plus(Duration.fromObject({ days: 1 })).toISO(), now: $now.isValid, midnight: $today.hour };",
		);
		expect(out).toEqual({ iso: '2024-01-03T03:04:05.000Z', now: true, midnight: 0 });
	});

	it('makes binary data with this.helpers.prepareBinaryData', () => {
		const [out] = run(
			"const data = await this.helpers.prepareBinaryData(Buffer.from('hello'), 'a.txt'); return [{ json: {}, binary: { data } }];",
		);
		expect(out).toEqual({
			$binary: {
				data: {
					mimeType: 'text/plain',
					fileType: 'text',
					fileExtension: 'txt',
					fileName: 'a.txt',
					data: 'aGVsbG8=',
					fileSize: '5 B',
					bytes: 5,
				},
			},
		});
	});

	it('reads binary data of an item', () => {
		const item = { $binary: { file: { data: 'aGk=', mimeType: 'text/plain' } } };
		const [out] = runCodeStep(
			{
				name: 'test',
				code: "return { text: this.helpers.getBinaryDataBuffer(0, 'file').toString() };",
				items: [item],
			},
			{},
		);
		expect(out).toEqual({ text: 'hi' });
	});

	it('refuses modules that are not allowed, as n8n does by default', () => {
		expect(() => run("const _ = require('lodash'); return {};")).toThrow(
			"Module 'lodash' is disallowed",
		);
	});
});

describe('parseCodeStepArgs', () => {
	it('reads the options', () => {
		expect(parseCodeStepArgs({ name: 'x', code: 'return 1', items: [{ a: 1 }] })).toEqual({
			name: 'x',
			code: 'return 1',
			items: [{ a: 1 }],
			language: 'javaScript',
		});
	});

	it('reads the Python language', () => {
		expect(parseCodeStepArgs({ name: 'x', code: 'return 1', language: 'python' }).language).toBe(
			'python',
		);
		expect(() => parseCodeStepArgs({ name: 'x', code: '', language: 'ruby' })).toThrow(
			StepInputError,
		);
	});

	it('rejects code that is not a string', () => {
		expect(() => parseCodeStepArgs({ name: 'x', code: 1 })).toThrow(StepInputError);
	});

	it('rejects items that are not objects', () => {
		expect(() => parseCodeStepArgs({ name: 'x', code: '', items: [1] })).toThrow(
			'"items[0]" must be an object',
		);
	});
});

describe('runCodeStepAsync', () => {
	it("gives timers, as n8n's JavaScript runner does", async () => {
		const out = await runCodeStepAsync({
			name: 'sleep',
			code: 'await new Promise((r) => setTimeout(r, 20)); return { n: items.length };',
			items: [{ a: 1 }],
		});
		expect(out).toEqual([{ n: 1 }]);
	});

	it('ends code that waits longer than the timeout', async () => {
		await expect(
			runCodeStepAsync(
				{
					name: 'slow',
					code: 'await new Promise((r) => setTimeout(r, 5000)); return {};',
					items: [],
				},
				{ timeoutMs: 50 },
			),
		).rejects.toThrow('did not finish within 50 ms');
	});
});

describe('runCodeStep: no state from one step reaches the next', () => {
	const after = (setup: string, check: string) => {
		try {
			run(setup);
		} catch {
			// The first step may fail. The second step must still see a new context.
		}
		return run(check);
	};

	it('drops a global that a step assigned without a declaration', () => {
		expect(after('leaked = 1; return {};', 'return { t: typeof leaked };')).toEqual([
			{ t: 'undefined' },
		]);
	});

	it('drops a global that a step defined as not configurable', () => {
		expect(
			after(
				"Object.defineProperty(globalThis, 'pinned', { value: 1 }); return {};",
				'return { t: typeof pinned };',
			),
		).toEqual([{ t: 'undefined' }]);
	});

	it('drops a change to a builtin prototype', () => {
		expect(
			after(
				'Array.prototype.last = function () { return 1; }; return {};',
				'return { t: typeof [].last };',
			),
		).toEqual([{ t: 'undefined' }]);
	});

	it('drops a replaced builtin function', () => {
		expect(
			after('JSON.stringify = () => "x"; return {};', 'return { s: JSON.stringify({ a: 1 }) };'),
		).toEqual([{ s: '{"a":1}' }]);
	});

	it('drops a change to the prototype of a builtin object', () => {
		expect(
			after(
				'Object.setPrototypeOf(Math, { extra: 1 }); return {};',
				'return { t: typeof Math.extra };',
			),
		).toEqual([{ t: 'undefined' }]);
	});

	it('drops the match of a regular expression', () => {
		expect(after("/(sec)ret/.test('secret'); return {};", 'return { m: RegExp.$1 };')).toEqual([
			{ m: '' },
		]);
	});

	it('drops a change that a step made before it failed', () => {
		expect(
			after(
				'Object.prototype.polluted = 1; throw new Error("boom");',
				'return { t: typeof ({}).polluted };',
			),
		).toEqual([{ t: 'undefined' }]);
	});

	it('gives each step its own static data and items', () => {
		run("$getWorkflowStaticData('global').n = 5; return {};");
		expect(
			run("return { n: $getWorkflowStaticData('global').n ?? null, c: items.length };", [{ n: 1 }]),
		).toEqual([{ n: null, c: 1 }]);
	});
});

describe('$jmespath in code steps', () => {
	it('searches as n8n does, and refuses unsafe queries', async () => {
		const out = await runCodeStepAsync({
			name: 'Code',
			code: "return [{ names: $jmespath(items[0], 'list[*].name') }];",
			items: [{ list: [{ name: 'a' }, { name: 'b' }] }],
		});
		expect(out).toEqual([{ names: ['a', 'b'] }]);
		await expect(
			runCodeStepAsync({
				name: 'Code',
				code: "return [{ x: $jmespath(items[0], 'constructor') }];",
				items: [{}],
			}),
		).rejects.toThrow('security concerns');
	});
});
