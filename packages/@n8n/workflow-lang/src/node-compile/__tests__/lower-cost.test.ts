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
		expect(flat(out.code)).toContain("const headers = __plain({ a: 'b' });");
		expect(flat(out.code)).toContain("method: 'POST',");
		expect(flat(out.code)).toContain("url: 'https://x.test',");
		expect(flat(out.code)).toContain('const options = { body };');
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
return [await api('auth'), await api('form')];`;
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

	it('pushes the JSON values and the error of a failed item under a "continue" setting', () => {
		const out = lowerCost(body('').replace('__out(', '__outFailed('), false);
		expect(flat(out.code)).toContain('__pushJsonFailed(returnData, responseData);');
		expect(flat(out.code)).toContain('return __plainList(returnData);');
		expect(out.helpers.sort()).toEqual(['__plainList', '__pushJsonFailed']);
	});

	it('pushes the JSON values and the paired items in two lists', () => {
		const paired = `
const returnData = [];
for (let i = 0; i < items.length; i++) {
	const responseData = await api(i);
	const executionData = __withPaired(__jsonArray(responseData), { itemData: { item: i } });
	for (const __each$executionData of __spreadList(executionData, "executionData"))
		returnData.push(__each$executionData);
	returnData.push({ json: { a: 1 }, pairedItem: { item: i } });
	returnData.push({ json: { b: 1 }, pairedItem: pairOf(i) });
	returnData.push({ json: { c: 1 } });
}
return __outPaired([returnData]);`;
		const out = lowerCost(paired, false);
		const code = flat(out.code);
		expect(code).toContain('const __pairs = [];');
		expect(code).toContain('__pushPaired(returnData, __pairs, responseData, __pairAt(i));');
		expect(code).toContain('returnData.push({ a: 1 }); __pairs.push(__pairAt(i));');
		expect(code).toContain('returnData.push({ b: 1 }); __pairs.push(__pairOf(pairOf(i)));');
		expect(code).toContain('returnData.push({ c: 1 }); __pairs.push(null);');
		expect(code).toContain('return __pairedOut(__plainList(returnData), __pairs);');
		expect(out.helpers.sort()).toEqual([
			'__itemJson',
			'__pairAt',
			'__pairOf',
			'__pairedOut',
			'__plainList',
			'__pushPaired',
		]);
	});

	it.each([
		['an item with an error', 'returnData.push({ json: {}, error: failure });'],
		['an item with other fields', 'returnData.push({ json: {}, binary: files });'],
		['an item that is not a literal', 'returnData.push(made);'],
	])('keeps the general paired output for %s', (_label, push) => {
		const out = lowerCost(
			`const returnData = [];\n${push}\nreturn __outPaired([returnData]);`,
			false,
		);
		expect(flat(out.code)).toContain('return __outPaired([returnData]);');
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

describe('lowerCost: request options and templates', () => {
	const general = (extra: string) => `async function __request(options, wrapped, legacy, extra, nested) {
	${extra}
	return await ctx.http({ url: options.uri, inject: wrapped });
}`;

	it('lowers a request that gives no token options', () => {
		const out = lowerCost(
			`${general('')}
async function api(query) {
	const options = { uri: 'https://x.test', qs: query, json: true };
	return await __request(options, true, true, undefined, true);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(out.code).not.toContain('__request(');
		expect(out.code).not.toContain('skipTokenRefresh');
		expect(out.code).not.toContain('multipart');
		expect(flat(out.code)).toContain('json: true,');
		expect(flat(out.code)).toContain('const options = { qs: query };');
	});

	it('keeps the general request when the call gives token options', () => {
		const out = lowerCost(
			`${general('')}
async function api(query, token) {
	const options = { uri: 'https://x.test', qs: query };
	return await __request(options, true, true, token, true);
}
return [await api(a, t), await api(b, u)];`,
			false,
		);
		expect(flat(out.code)).toContain('__request(options, true, true, token, true)');
	});

	it('honours a full response and a lenient status in the lowered form', () => {
		const out = lowerCost(
			`${general('if (options.simple || options.resolveWithFullResponse || options.returnFullResponse) x();')}
async function api(query) {
	const options = { uri: 'https://x.test', qs: query };
	options.returnFullResponse = true;
	options.ignoreHttpStatusErrors = query.lenient;
	return await __request(options, true, false);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(flat(out.code)).toContain('response.status >= 400 && !(options.ignoreHttpStatusErrors)');
		expect(flat(out.code)).toContain(
			'return options.returnFullResponse ? { body: response.body, headers: response.headers, statusCode: response.status } : response.body;',
		);
	});

	it('keeps a constant of the options that other code reads or writes', () => {
		const out = lowerCost(
			`${general('')}
async function api(query) {
	const options = { method: 'GET', uri: 'https://x.test', qs: query };
	if (query.post) options.method = 'POST';
	return await __request(options, true, true);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(flat(out.code)).toContain("method: options.method ?? 'GET',");
		expect(flat(out.code)).toContain("url: 'https://x.test',");
		expect(flat(out.code)).toContain("const options = { method: 'GET', qs: query };");
	});
});

describe('lowerCost: more constants', () => {
	it('joins a first store with the declaration and folds a replace', () => {
		const evaluate = (code: string): unknown => new Function(`return ${code};`)();
		const out = lowerCost(
			`let domain = '';
domain = 'https://x.test//';
domain = domain.replace(/[/]+$/, "");
return await api(\`\${domain}/rest\`);`,
			false,
			evaluate,
		);
		expect(flat(out.code)).toBe('return await api("https://x.test/rest");');
	});

	it('does not fold a text of a credential', () => {
		const out = lowerCost(
			`const key = '{{$credentials.apiKey}}';
if (key === 'a') { await one(); }
return [key].includes('a');`,
			false,
		);
		expect(flat(out.code)).toContain("=== 'a'");
		expect(flat(out.code)).toContain('.includes(');
	});

	it('folds an argument that each call gives with the same value', () => {
		const out = lowerCost(
			`async function api(path, download) {
	if (download === true) { return await bytes(path); }
	return await json(path);
}
return [await api(a, false), await api(b, false)];`,
			false,
		);
		expect(out.code).not.toContain('bytes(');
		const kept = lowerCost(
			`async function api(path, download) {
	if (download === true) { return await bytes(path); }
	return await json(path);
}
return [await api(a, false), await api(b, true)];`,
			false,
		);
		expect(kept.code).toContain('bytes(');
	});

	it('knows an empty argument through a second function', () => {
		const out = lowerCost(
			`async function all(path, option = {}) {
	return await api(path, option);
}
async function api(path, option = {}) {
	if (option.download === true) { return await bytes(path); }
	return await json(path);
}
return [await all(a), await api(b)];`,
			false,
		);
		expect(out.code).not.toContain('bytes(');
	});
});

describe('lowerCost: values for each item', () => {
	const request = `async function __request(options, wrapped, legacy) {
	return await ctx.http({ url: options.uri, inject: wrapped });
}`;

	it('does not make a literal of a URL or a body that an item gives', () => {
		const out = lowerCost(
			`${request}
async function api(path, body) {
	const options = { method: 'POST', uri: \`https://x.test/\${path}\`, body, json: true };
	return await __request(options, true, true);
}
for (let i = 0; i < __items.length; i++) {
	await api(__deepCopy(__perItem[i]["path"]), { text: __deepCopy(__perItem[i]["text"]) });
}`,
			false,
		);
		expect(flat(out.code)).toContain('url: options.uri,');
		expect(flat(out.code)).toContain('body: __plain(__sendBody(options.body)),');
		expect(flat(out.code)).toContain("method: 'POST',");
		expect(flat(out.code)).toContain('uri: `https://x.test/${path}`, body');
		expect(flat(out.code)).toContain('__deepCopy(__perItem[i]["path"])');
	});

	it('makes a pattern once when the loop uses it for each item', () => {
		const out = lowerCost(
			`for (let i = 0; i < __items.length; i++) {
	if (/a+b/i.test(__perItem[i]["text"])) await one();
	await two(text.replace(/x/g, ''), /top/.test(text), () => /inner/.test(text));
}
const first = /top/.test(text);`,
			false,
		);
		expect(flat(out.code)).toContain('const __pattern0 = /a+b/i; const __pattern1 = /top/; for (');
		expect(flat(out.code)).toContain('__pattern0.test(__perItem[i]["text"])');
		expect(flat(out.code)).toContain("text.replace(/x/g, '')");
		expect(flat(out.code)).toContain('__pattern1.test(text), () => /inner/.test(text)');
		expect(flat(out.code)).toContain('const first = /top/.test(text);');
	});
});

describe('lowerCost: the options of a request', () => {
	const request = `async function __request(options, wrapped, legacy) {
	const parts = legacy ? __formParts(options, headers) : undefined;
	return await ctx.http({ url: options.uri, acceptAs: legacy ? 'legacy' : 'request', json: options.json, inject: wrapped });
}`;

	it('sends the json option as a constant and leaves out the members that are not there', () => {
		const out = lowerCost(
			`${request}
async function api(query) {
	const option = {};
	const options = { method: 'GET', uri: 'https://x.test', qs: query };
	options.json = true;
	if (Object.keys(option)) { __assign(options, option); }
	return await __request(options, true, true);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(out.code).not.toContain('__request(');
		expect(out.code).not.toContain('__assign(options');
		expect(flat(out.code)).toContain("acceptAs: 'legacy', json: true, inject: true,");
		expect(out.code).not.toContain('multipart');
		expect(out.code).not.toContain('basicAuth');
		expect(flat(out.code)).toContain('body: undefined,');
		expect(flat(out.code)).toContain('const options = { qs: query };');
	});

	it('keeps the json option of the node when the code can change it', () => {
		const out = lowerCost(
			`${request}
async function api(query) {
	const options = { uri: 'https://x.test', qs: query, json: true };
	if (query.text) options.json = false;
	return await __request(options, true, true);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(flat(out.code)).toContain('json: options.json,');
		expect(flat(out.code)).toContain('const options = { qs: query, json: true };');
	});

	it('folds the constant arguments of the general request', () => {
		const out = lowerCost(
			`${request}
async function api(options) {
	return await __request(options, false, true);
}
return [await api(a), await api(b)];`,
			false,
		);
		expect(flat(out.code)).toContain('const parts = __formParts(options, headers);');
		expect(flat(out.code)).toContain("acceptAs: 'legacy'");
		expect(flat(out.code)).toContain('inject: false');
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
