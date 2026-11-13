import { parseCodeStepArgs, runCodeStep, runCodeStepAsync } from '../code-step';
import { StepInputError } from '../items';

const run = (
	code: string,
	items: Array<Record<string, number | string>> = [],
	timeoutMs?: number,
) => runCodeStep({ name: 'test', code, items }, { timeoutMs });

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

	it('blocks $env as n8n does by default', () => {
		expect(() => run('return { home: $env.HOME };')).toThrow('access to env vars denied');
	});

	it("gives this.helpers.httpRequest, as n8n's Code node does", async () => {
		const { createServer } = await import('node:http');
		const server = createServer((request, response) => {
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ path: request.url, method: request.method }));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const address = server.address();
		const port = typeof address === 'object' && address ? address.port : 0;
		try {
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
		} finally {
			server.close();
		}
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

	it('keeps a plain object that has a "json" key and other keys', () => {
		expect(run('return [{ json: { a: 1 }, other: 2 }];')).toEqual([{ json: { a: 1 }, other: 2 }]);
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

	it('blocks code generation from strings', () => {
		expect(() => run('return eval("1");')).toThrow(/Code generation from strings/);
	});

	it('rejects a result that is not a list of objects', () => {
		expect(() => run('return [1, 2];')).toThrow(/must return an object/);
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
