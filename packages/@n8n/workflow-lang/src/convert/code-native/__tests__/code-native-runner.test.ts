/**
 * Native Code nodes against n8n's real task runner (`runner-oracle.ts`): each case runs as
 * native code in the bytecode VM and as a Code node in n8n's engine with its task runner
 * process, on the same items. The result lists must be the same, and for a failed node the
 * message of the error, with the ` [line N]` that the task runner adds.
 *
 * The cases are made up. They need the built n8n CLI and task runner packages; without
 * them the suite is skipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import type { CodeMode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
	items?: unknown[];
	nodes?: Record<string, unknown[]>;
}

const ITEMS = [{ a: 1 }, { a: 2 }];

/** The message of an error: thrown values of each kind, and results that are not valid. */
const MESSAGES: Case[] = [
	{ name: 'top-level throw line 3', code: "const a = 1;\nconst b = 2;\nthrow new Error('top');" },
	{
		name: 'named function decl: thrown line 2, called line 5',
		code: "function f() {\n  throw new Error('in f');\n}\nconst x = 1;\nf();",
	},
	{
		name: 'named function expression in a declaration: throw line 3, call line 5',
		code: "const x = 1;\nconst run = function work(i) {\n  throw new Error('in work ' + i.json.a);\n};\nreturn items.map((i) => run(i));",
	},
	{
		name: 'named function expression that gives a value',
		code: 'var double = function twice(n) { return n * 2; };\nreturn $input.all(0).map((i) => ({ json: { a: double(i.json.a) } }));',
	},
	{
		name: 'anonymous callback: throw line 2, map call line 1',
		code: "const out = items.map((i) => {\n  throw new Error('in callback');\n});\nreturn out;",
	},
	{
		name: 'const arrow: throw line 2, call line 4',
		code: "const f = () => {\n  throw new Error('in arrow');\n};\nf();",
	},
	{
		name: 'TypeError on line 3 of a multi-line literal',
		code: 'const o = {\n  a: 1,\n  b: items[0].json.zz.y,\n};\nreturn [{ json: o }];',
	},
	{
		name: 'JSON.parse line 2',
		code: "const t = 'x';\nconst v = JSON.parse(t);\nreturn [{ json: { v } }];",
	},
	{ name: 'throw text', code: "throw 'just text';" },
	{ name: 'throw object with message', code: "throw { message: 'obj message', extra: 1 };" },
	{ name: 'throw object without message', code: 'throw { a: 1 };' },
	{ name: 'throw null', code: 'throw null;' },
	{ name: 'throw number', code: 'throw 42;' },
	{ name: 'multi-line message', code: "throw new Error('line one\\nline two');" },
	{ name: 'empty message', code: "\nthrow new Error('');" },
	{ name: 'no message', code: 'throw new Error();' },
	{
		name: 'custom name after construction',
		code: "const e = new Error('named');\ne.name = 'Custom';\nthrow e;",
	},
	{ name: 'TypeError constructed', code: "throw new TypeError('bad type');" },
	{ name: 'RangeError constructed', code: "throw new RangeError('bad range');" },
	{
		name: 'created line 1, thrown line 4',
		code: "const e = new Error('made early');\nconst a = 1;\nconst b = 2;\nthrow e;",
	},
	{
		name: 'rethrow of a runtime error',
		code: 'try {\n  items[0].json.zz.y;\n} catch (e) {\n  const z = 1;\n  throw e;\n}',
	},
	{ name: 'colons in message', code: "throw new Error('a: b: c');" },
	{ name: 'message with leading/trailing space', code: "throw new Error('  spaced  ');" },
	{
		name: 'async function after await',
		code: "async function g() {\n  await null;\n  throw new Error('after await');\n}\nawait g();",
	},
	{
		name: 'named inside callback inside named',
		code: 'function inner(v) {\n  return v.zz.y;\n}\nfunction outer() {\n  return items.map((i) => inner(i.json));\n}\nconst r =\n  outer();\nreturn r;',
	},
	{
		name: 'callback over two lines in named function',
		code: 'function outer() {\n  return items\n    .map((i) => i.json.zz.y);\n}\nouter();',
	},
	{
		name: 'each mode: second item fails line 2',
		code: "const v = $json.a;\nif (v === 2) throw new Error('item two');\nreturn { json: { v } };",
		mode: 'each',
	},
	{ name: 'result not an object', code: 'return 5;' },
	{ name: 'result item not an object', code: 'return [1];' },
	{ name: 'unknown top-level key', code: 'return [{ json: {}, extra: 1 }];' },
	{ name: 'json not an object', code: 'return [{ json: 5 }];' },
	{ name: 'each returns array', code: 'return [{ json: {} }];', mode: 'each' },
	{
		name: 'error with cause and props',
		code: "const e = new Error('with props');\ne.code = 'E1';\nthrow e;",
	},
	{
		name: 'string concat error in template',
		code: 'const id = items[0].json.a;\nthrow new Error(`Item $' + '{id} failed: reason`);',
	},
];

/** The line of an error: statements of several lines, callbacks, functions with a name, loops. */
const LINES: Case[] = [
	{
		name: 'chain over lines: error in filter callback',
		code: 'const out = items\n  .map((i) => i.json)\n  .filter((j) => j.zz.y)\n  .map((j) => j);\nreturn out;',
	},
	{
		name: 'chain over lines: receiver undefined at line 3',
		code: 'const list = items[0].json\n  .missing\n  .map((x) => x);\nreturn list;',
	},
	{
		name: 'object literal lines',
		code: 'const first = items[0].json;\nreturn [{ json: {\n  a: first.a,\n  b: first.zz.y,\n  c: first.a,\n} }];',
	},
	{
		name: 'call args over lines',
		code: 'function add(a, b) {\n  return a + b;\n}\nconst v = add(\n  items[0].json.a,\n  items[0].json.zz.y,\n);\nreturn [{ json: { v } }];',
	},
	{
		name: 'callback over lines in top statement',
		code: 'return items.map((i) => {\n  const j = i.json;\n  return {\n    json: { v: j.zz.y },\n  };\n});',
	},
	{
		name: 'callback in second statement on later line',
		code: 'const a = 1;\n\nconst out = items.map((i) => ({ json: { v: i.json.zz.y } }));\nreturn out;',
	},
	{
		name: 'while loop condition throws after body',
		code: 'let n = 0;\nlet o = { v: {} };\nwhile (o.v.k !== 1) {\n  n++;\n  o = n > 1 ? {} : o;\n}\nreturn [{ json: { n } }];',
	},
	{
		name: 'for-of over non-iterable',
		code: 'const xs = items[0].json.a;\nfor (const x of xs) {\n  const y = x;\n}\nreturn [];',
	},
	{
		name: 'for loop body throws on iteration 2',
		code: 'const out = [];\nfor (let k = 0; k < 3; k++) {\n  const o = k === 1 ? undefined : {};\n  out.push(o.x);\n}\nreturn out;',
	},
	{
		name: 'if else braceless',
		code: "const j = items[0].json;\nif (j.a === 2) throw new Error('two');\nelse if (j.a === 1) throw new Error('one');\nreturn [];",
	},
	{
		name: 'nested named functions',
		code: 'function outer(v) {\n  const inner = (w) => {\n    return w.zz.y;\n  };\n  return inner(v);\n}\nreturn [{ json: { v: outer(items[0].json) } }];',
	},
	{
		name: 'named arrow expression body',
		code: 'const pick = (j) => j.zz.y;\nconst a = 1;\nreturn [{ json: { v: pick(items[0].json) } }];',
	},
	{
		name: 'named arrow expression body multi-line',
		code: 'const pick = (j) =>\n  j.zz\n    .y;\nreturn [{ json: { v: pick(items[0].json) } }];',
	},
	{
		name: 'callback passed to named function',
		code: 'function each(list, fn) {\n  const out = [];\n  for (const x of list) out.push(\n    fn(x));\n  return out;\n}\nreturn each(items, (i) => ({ json: { v: i.json.zz.y } }));',
	},
	{
		name: 'catch then throw new',
		code: "try {\n  items[0].json.zz.y;\n} catch (e) {\n  throw new Error('wrapped: ' + e.message);\n}",
	},
	{
		name: 'error created in function, thrown at top',
		code: "function make(m) {\n  return new Error(m);\n}\nconst e = make('made in fn');\nthrow e;",
	},
	{
		name: 'error thrown in callback of forEach line 3',
		code: "const seen = [];\nitems\n  .forEach((i) => {\n    if (i.json.a === 2) throw new Error('second item');\n    seen.push(i);\n  });\nreturn seen;",
	},
	{
		name: 'method not a function with callee text',
		code: 'const data = items[0].json;\nconst out = data.a.map((x) => x);\nreturn out;',
	},
	{
		name: 'method not a function deep callee',
		code: 'const rows = $input.first().json.a.filter((x) => x);\nreturn rows;',
	},
	{
		name: 'string method on number',
		code: 'const t = items[0].json.a;\nreturn [{ json: { v: t.trim() } }];',
	},
	{
		name: 'split on undefined',
		code: "const t = items[0].json.zz;\nconst parts = t.split(',');\nreturn [{ json: { parts } }];",
	},
	{
		name: 'each mode error line 3 item 1',
		code: 'const j = $json;\nconst v = j.a;\nif (v === 2) return { json: { v: j.zz.y } };\nreturn { json: { v } };',
		mode: 'each',
	},
	{
		name: 'each mode callback line',
		code: 'const list = [1, 2];\nconst out = list.map((x) => $json.zz.y);\nreturn { json: { out } };',
		mode: 'each',
	},
	{
		name: 'switch case',
		code: "const j = items[0].json;\nswitch (j.a) {\n  case 1:\n    throw new Error('case one');\n  default:\n    return [];\n}",
	},
	{
		name: 'template literal with member on line 2',
		code:
			'const j = items[0].json;\nconst s = `a $' +
			'{j.a} b $' +
			'{\n  j.zz.y}`;\nreturn [{ json: { s } }];',
	},
	{ name: 'new Error multi-line args', code: "throw new Error(\n  'long ' +\n  'message',\n);" },
	{
		name: 'return in do-while',
		code: 'let k = 0;\ndo {\n  k++;\n} while (items[k - 1].json.zz.y);\nreturn [];',
	},
	{
		name: 'JSON.parse in callback of map chained',
		code: "const texts = ['{\"a\":1}', 'x'];\nconst parsed = texts\n  .map((t) => JSON.parse(t));\nreturn [{ json: { parsed } }];",
	},
	{
		name: 'function assigned later is named',
		code: 'let f;\nf = (j) => {\n  return j.zz.y;\n};\nreturn [{ json: { v: f(items[0].json) } }];',
	},
	{
		name: 'iife is anonymous',
		code: 'const v = (() => {\n  return items[0].json.zz.y;\n})();\nreturn [{ json: { v } }];',
	},
	{
		name: 'sort comparator throws',
		code: 'const xs = [{ v: 1 }, { v: 2 }];\nxs.sort((a, b) =>\n  a.zz.y - b.zz.y);\nreturn [{ json: { xs } }];',
	},
	{
		name: 'reduce callback line',
		code: 'const total = items.reduce((sum, i) => {\n  return sum + i.json.zz.y;\n}, 0);\nreturn [{ json: { total } }];',
	},
	{
		name: 'optional chain then throw',
		code: 'const j = items[0].json;\nconst v = j.zz?.y.z;\nconst w = j.a.b.c;\nreturn [{ json: { v, w } }];',
	},
];

/** The forms of a result, binary data, and the items that the code reads. */
const RESULTS: Case[] = [
	{ name: 'all mode inconsistent', code: 'return [{ json: { a: 1 } }, { binary: {} }];' },
	{
		name: 'all mode binary only items',
		code: "return [{ binary: { f: { data: 'aGk=', mimeType: 'a/b' } }, other: 1 }, { binary: {}, x: 2 }];",
	},
	{ name: 'all mode error key', code: "return [{ error: 'x' }];" },
	{ name: 'all mode nested array result', code: 'return [[{ json: { a: 1 } }]];' },
	{ name: 'all mode object with falsy json', code: 'return { json: null, a: 1 };' },
	{ name: 'all mode empty array', code: 'return [];' },
	{ name: 'all mode empty object', code: 'return {};' },
	{
		name: 'each: item with binary only',
		code: "return { binary: { f: { data: 'aGk=', mimeType: 'a/b' } } };",
		mode: 'each',
	},
	{ name: 'each: null', code: 'return null;', mode: 'each' },
	{ name: 'each: number 5', code: 'return 5;', mode: 'each' },
	{ name: 'each: true', code: 'return true;', mode: 'each' },
	{ name: 'each: array of objects', code: 'return [{ a: 1 }];', mode: 'each' },
	{
		name: 'each: json+binary+pairedItem keys',
		code: "return { json: { a: 1 }, pairedItem: 5, error: 'e', index: 3 };",
		mode: 'each',
	},
	{
		name: 'each: json undefined with binary',
		code: 'return { json: undefined, binary: {} };',
		mode: 'each',
	},
	{
		name: 'made binary: sizes?',
		code: "return [{ json: { a: 1 }, binary: { data: { data: 'aGk=', mimeType: 'text/plain', fileName: 'x.txt' } } }];",
	},
	{
		name: 'input binary pass',
		code: 'return items.map((i) => ({ json: { id: i.json.id, has: i.binary !== undefined, keys: Object.keys(i), jsonKeys: Object.keys(i.json) }, binary: i.binary }));',
		items: [{ id: 1, $binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } }, { id: 2 }],
	},
	{
		name: "$('Src') binary",
		code: "const s = $('Src').first(); return [{ json: { keys: Object.keys(s), jsonKeys: Object.keys(s.json), name: s.binary.f.mimeType, same: s.json === $('Src').first().json } }];",
		nodes: { Src: [{ s: 1, $binary: { f: { data: 'aGk=', mimeType: 'text/plain' } } }] },
	},
	{
		name: 'pairedItem of input',
		code: 'return items.map((i) => ({ json: { p: i.pairedItem, keys: Object.keys(i) } }));',
	},
	{ name: 'return item with pairedItem etc', code: 'return items;' },
	{ name: 'result null', code: 'return null;' },
	{ name: 'result undefined', code: 'const x = 1;' },
	{ name: 'result single object', code: 'return { a: 1 };' },
	{ name: 'result object with json', code: 'return { json: { a: 1 } };' },
	{ name: 'result string', code: "return 'x';" },
	{ name: 'result array with null', code: 'return [null];' },
	{ name: 'result array of plain objects', code: 'return [{ a: 1 }, { b: 2 }];' },
	{ name: 'result mix json and plain', code: 'return [{ json: { a: 1 } }, { b: 2 }];' },
	{ name: 'result json null', code: 'return [{ json: null }];' },
	{ name: 'result json array', code: 'return [{ json: [1] }];' },
	{ name: 'result binary not object', code: "return [{ json: {}, binary: 'x' }];" },
	{
		name: 'result with undefined and NaN and Date',
		code: 'return [{ json: { u: undefined, n: NaN, d: new Date(0), f: () => 1, inf: Infinity, neg: -0 } }];',
	},
	{
		name: 'each: return undefined for some',
		code: 'if ($json.a === 1) return; return { json: { a: $json.a } };',
		mode: 'each',
	},
	{ name: 'each: return 0', code: 'return 0;', mode: 'each' },
	{ name: 'each: return string', code: "return 'x';", mode: 'each' },
	{ name: 'each: plain object', code: 'return { b: $json.a };', mode: 'each' },
	{ name: 'each: json not object', code: 'return { json: 5 };', mode: 'each' },
	{ name: 'each: unknown key', code: 'return { json: {}, zz: 1 };', mode: 'each' },
	{
		name: 'node family identity',
		code: "const a = $('Src').all(); a[0].json.m = 1; return [{ json: { same: a === $('Src').all(), firstEl: $('Src').first() === a[0], seen: $('Src').first().json.m, node: $node['Src'].json === a[0].json, nodeSeen: $node['Src'].json.m, itemsFn: $items('Src')[0] === a[0], itemsSeen: $items('Src')[0].json.m } }];",
		nodes: { Src: [{ s: 1 }, { s: 2 }] },
	},
	{
		name: 'pairedItem after filter-like node',
		code: 'return items.map((i) => ({ json: { p: i.pairedItem, pi: $input.all()[0].pairedItem } }));',
	},
];

const FILE_ITEMS = [
	{
		id: 1,
		$binary: {
			data: { data: 'aGVsbG8gYnl0ZXM=', mimeType: 'text/plain', fileName: 'a.txt' },
			empty: { data: '', mimeType: 'text/plain' },
		},
	},
	{ id: 2 },
];

/** `this.helpers.getBinaryDataBuffer`: the bytes, and the error for a file that is not there. */
const BINARY_CASES: Case[] = [
	{
		name: 'the bytes of a file',
		code: "const b = await this.helpers.getBinaryDataBuffer(0, 'data');\nconst e = await this.helpers.getBinaryDataBuffer(0, 'empty');\nreturn [{ json: { text: b.toString(), n: b.length, b64: b.toString('base64'), empty: e.length } }];",
	},
	{
		name: 'the bytes of the current item',
		code: "if ($itemIndex > 0) return { json: { skipped: true } };\nconst b = await this.helpers.getBinaryDataBuffer($itemIndex, 'data');\nreturn { json: { text: b.toString('utf8') } };",
		mode: 'each',
	},
	{
		name: 'a binary property that the item does not have',
		code: "const x = 1;\nconst b = await this.helpers.getBinaryDataBuffer(0, 'nope');\nreturn [{ json: { n: b.length } }];",
	},
	{
		name: 'an item without binary data',
		code: "const b = await this.helpers.getBinaryDataBuffer(1, 'data');\nreturn [{ json: { n: b.length } }];",
	},
	{
		name: 'an item that is not there',
		code: "const b = await this.helpers.getBinaryDataBuffer(7, 'data');\nreturn [{ json: { n: b.length } }];",
	},
];
const BINARY: Case[] = BINARY_CASES.map((c) => ({ ...c, items: FILE_ITEMS }));

describe.skipIf(!taskRunnerAvailable())("native Code nodes against n8n's task runner", () => {
	// n8n's modules and the runner process take some seconds to start.
	beforeAll(async () => await startRunner(), 120_000);

	const same = async (c: Case) => {
		const items = c.items ?? ITEMS;
		const runner = await runnerCode(c.code, c.mode ?? 'all', items, { nodes: c.nodes });
		expect(nativeCode(c.code, c.mode ?? 'all', items, { nodes: c.nodes })).toEqual(runner);
		return runner;
	};

	it.each(MESSAGES)('gives the message of v1: ', async (c) => {
		await same(c);
	});

	it.each(LINES)('gives the line of v1: ', async (c) => {
		expect((await same(c)).ok).toBe(false);
	});

	it.each(RESULTS)('gives the result of v1: ', async (c) => {
		await same(c);
	});

	it.each(BINARY)('reads the bytes of binary data as v1: $name', async (c) => {
		await same(c);
	});
});
