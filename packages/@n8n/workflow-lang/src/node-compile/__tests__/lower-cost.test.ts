import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import { allocationsOf, emptyCost, runModule } from '../../testing/vm.ts';
import {
	COST_HELPERS,
	foldTextMethod,
	lowerCost,
	PLAIN_LIST_SAME,
	reachableHelpers,
} from '../lower-cost.ts';

const REQUEST = `async function __request(options, wrapped, legacy) {
	return await ctx.http({ url: options.uri, inject: wrapped });
}`;

const flat = (code: string) => code.replace(/\s+/g, ' ');

describe('lowerCost: requests', () => {
	it('gives a request with a known shape its own form', () => {
		const out = lowerCost(
			`${REQUEST}
async function api(body) {
	const options = { method: 'POST', headers: { a: 'b' }, uri: 'https://x.test', body };
	if (Object.keys(body).length === 0) delete options.body;
	return await __request(options, true, true);
}
return await api({});`,
			false,
		);
		expect(out.code).not.toContain('__request(');
		expect(out.code).not.toContain('__formParts');
		expect(out.code).not.toContain('options.auth');
		expect(flat(out.code)).toContain('const headers = __plain(options.headers ?? {});');
		expect(flat(out.code)).toContain('throw __apiError(failure, undefined);');
	});

	it('keeps the copy of the headers and the form when the node can set a form', () => {
		const out = lowerCost(
			`${REQUEST}
async function api(form) {
	const options = { uri: 'https://x.test' };
	options.form = form;
	return await __request(options, false, false);
}
return await api({});`,
			false,
		);
		expect(flat(out.code)).toContain('const headers = __assign({}, {});');
		expect(flat(out.code)).toContain('const form = options.form;');
		expect(flat(out.code)).toContain('throw failure;');
	});

	it('keeps the general request when the options go to other code', () => {
		const code = `${REQUEST}
async function api(extra) {
	const options = { uri: 'https://x.test' };
	__assign(options, extra);
	return await __request(options, true, true);
}
return await api({ auth: 1 });`;
		expect(flat(lowerCost(code, false).code)).toContain('__request(options, true, true)');
	});

	it('keeps the general request when a key is not a constant', () => {
		const code = `${REQUEST}
async function api(key) {
	const options = { uri: 'https://x.test' };
	options[key] = 1;
	return await __request(options, true, true);
}
return await api('auth');`;
		expect(flat(lowerCost(code, false).code)).toContain('__request(options, true, true)');
	});

	it('keeps the general request when the response can be bytes', () => {
		const code = `${REQUEST}
async function api() {
	const options = { uri: 'https://x.test', encoding: null };
	return await __request(options, true, true);
}
return await api();`;
		expect(flat(lowerCost(code, false).code)).toContain('__request(options, true, true)');
	});

	it('keeps the general output when the module holds bytes', () => {
		const code = `const returnData = [];
returnData.push({ json: await api() });
return __out([returnData]);`;
		expect(flat(lowerCost(code, true).code)).toContain('return __out([returnData]);');
		expect(flat(lowerCost(code, false).code)).toContain('return __plainList(returnData);');
	});

	it('removes the copy of the options with an empty object', () => {
		const out = lowerCost(
			`${REQUEST}
async function api() {
	const option = {};
	let options = { uri: 'https://x.test' };
	options = Object.assign({}, options, option);
	return await __request(options, true, true);
}
return await api();`,
			false,
		);
		expect(out.code).not.toContain('Object.assign');
		expect(out.code).not.toContain('const option');
	});
});

describe('lowerCost: output and items', () => {
	const body = (extra: string) => `const items = __items;
const returnData = [];
for (let i = 0; i < items.length; i++) {
	const responseData = await api(i);
	const executionData = __jsonArray(responseData);
	for (const __each$executionData of __spreadList(executionData, "executionData"))
		returnData.push(__each$executionData);
	${extra}
}
return __out([returnData]);`;

	it('pushes the JSON values and counts the items', () => {
		const out = lowerCost(body(''), false);
		expect(flat(out.code)).toContain('__pushJson(returnData, responseData);');
		expect(flat(out.code)).toContain('return __plainList(returnData);');
		expect(flat(out.code)).toContain('i < __count');
		expect(out.items).toContain('__count');
		expect(out.helpers.sort()).toEqual(['__plainList', '__pushJson']);
	});

	it('keeps the general output when other code reads the list', () => {
		const out = lowerCost(body('if (returnData.length > 3) break;'), false);
		expect(flat(out.code)).toContain('return __out([returnData]);');
		expect(out.helpers).toEqual([]);
	});

	it('keeps the wrapped items when other code reads an item', () => {
		const out = lowerCost(body('const file = __binaryOf(__items, i, "data");'), false);
		expect(out.items).toContain('__wrap(items0)');
		expect(out.code).toContain('items.length');
	});

	it('gives the same output as the general helpers', () => {
		const load = (names: string[], sources: Record<string, string>) =>
			ts.transpile(names.map((name) => sources[name]).join('\n'), {
				target: ts.ScriptTarget.ES2022,
			});
		const general = `function __plain(value) { return value; }
function __jsonArray(data) {
	const out = [];
	const list = Array.isArray(data) ? data : [data];
	for (const json of list) {
		if (json !== null && json !== undefined && json.json) {
			const kept = {};
			for (const [key, value] of Object.entries(json)) kept[key] = value;
			out.push(kept);
		} else out.push({ json });
	}
	return out;
}
function __out(result) {
	const out = [];
	for (const item of result[0] ?? []) out.push(__plain(item.json));
	return out;
}`;
		const lowered = load(['__pushJson', '__plainList'], {
			...COST_HELPERS,
			__plainList: PLAIN_LIST_SAME,
		});
		const run = new Function(
			'data',
			`${general}\n${lowered}
const a = []; for (const each of __jsonArray(data)) a.push(each);
const b = []; __pushJson(b, data);
return [JSON.stringify(__out([a])), JSON.stringify(__plainList(b))];`,
		);
		const cases: unknown[] = [
			{ id: 1 },
			[{ id: 1 }, { id: 2 }],
			[],
			null,
			undefined,
			'text',
			5,
			[null, 'a', 0, { json: { id: 3 }, pairedItem: 1 }, { json: 0 }, { json: '' }, [1, 2]],
			{ json: { id: 4 }, binary: {} },
			{ json: null },
		];
		for (const data of cases) {
			const [before, after] = run(data) as string[];
			expect(after).toBe(before);
		}
	});
});

describe('lowerCost: constants', () => {
	it('folds a value that the code never changes and the branches that follow', () => {
		const out = lowerCost(
			`let returnAll = false;
const single = ['a:b', 'c:d'];
if (returnAll) { await all(); } else { await one(); }
if (single.includes('a:b') || other.includes('a:b')) { await kept(); }
async function all() {}
async function one() {}
async function kept() {}`,
			false,
		);
		expect(out.code).not.toContain('returnAll');
		expect(out.code).not.toContain('single');
		expect(out.code).not.toContain('all()');
		expect(flat(out.code)).toContain('await one();');
		expect(flat(out.code)).toContain('await kept();');
	});

	it('keeps a value that the code changes', () => {
		const out = lowerCost(
			`let returnAll = false;
if (x) returnAll = true;
if (returnAll) { await all(); }`,
			false,
		);
		expect(flat(out.code)).toContain('if (returnAll)');
	});

	it('keeps a list that other code can change', () => {
		const out = lowerCost(
			`const single = ['a'];
single.push(x);
if (single.includes('a')) { await kept(); }`,
			false,
		);
		expect(flat(out.code)).toContain("single.includes('a')");
	});

	it('knows that an argument that no call gives is its empty default', () => {
		const out = lowerCost(
			`async function api(body, option = {}) {
	const options = { body };
	if (Object.keys(option).length !== 0) { __assign(options, option); }
	return options;
}
return await api(1);`,
			false,
		);
		expect(out.code).not.toContain('__assign');
		const kept = lowerCost(
			`async function api(body, option = {}) {
	if (Object.keys(option).length !== 0) { return 1; }
	return 2;
}
return [await api(1), await api(1, x)];`,
			false,
		);
		expect(flat(kept.code)).toContain('Object.keys(option).length !== 0');
	});

	it('folds the members of a constant object', () => {
		const out = lowerCost(
			`const paths = { deal: '/dealFields' };
if (paths["deal"] !== undefined) { await a(paths.deal); } else { await b(); }`,
			false,
		);
		expect(flat(out.code)).toBe('await a("/dealFields");');
	});
});

describe('foldTextMethod', () => {
	it('gives the value of a text method on constants', () => {
		expect(foldTextMethod('/path', 'startsWith', ['https'])).toEqual({ value: false });
		expect(foldTextMethod('Abc', 'toLowerCase', [])).toEqual({ value: 'abc' });
		expect(foldTextMethod('abc', 'indexOf', ['c'])).toEqual({ value: 2 });
	});

	it('does not fold other methods or other arguments', () => {
		expect(foldTextMethod('a,b', 'split', [','])).toBeUndefined();
		expect(foldTextMethod('abc', 'startsWith', [undefined])).toBeUndefined();
	});
});

describe('reachableHelpers', () => {
	it('keeps only the helpers that the code can reach', () => {
		const sources = { __a: 'function __a() { return __b(); }', __b: 'x', __c: 'y' };
		expect([...reachableHelpers(['__a()'], sources)].sort()).toEqual(['__a', '__b']);
	});
});

describe('the cost counters of the test VM', () => {
	const source = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'cost' })],
	async run(ctx) {
		const list: number[] = [];
		for (let k = 0; k < 3; k++) list.push(k);
		return { text: 'a' + String(list.length), list };
	},
});`;
	const fixture = { trigger: { body: {}, headers: {}, query: {} }, now: 0, seed: 1, effects: {} };

	it('counts and does not change the run', () => {
		const built = compile(source);
		expect(built.ok).toBe(true);
		const module = decodeModule(built.module ?? new Uint8Array());
		const cost = emptyCost();
		const counted = runModule(module, fixture, { cost });
		expect(JSON.stringify(counted)).toBe(JSON.stringify(runModule(module, fixture)));
		expect(cost.ops).toBeGreaterThan(10);
		expect(cost.arrays).toBe(1);
		expect(cost.objects).toBe(1);
		expect(cost.concats).toBe(1);
		expect(cost.branches).toBeGreaterThan(3);
		expect(allocationsOf(cost)).toBe(cost.objects + cost.arrays + cost.strings + cost.closures);
		const limited = runModule(module, fixture, { fuel: cost.ops - 1 });
		expect(limited.status).toBe('limit');
		expect(runModule(module, fixture, { fuel: cost.ops }).status).toBe('ok');
	});
});
