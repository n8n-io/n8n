import { specialiseNode } from '../specialise.ts';

const SECRET = '{{$credentials.apiKey';
const WHOLE = '{{$credentials.';

const node = (body: string, tail = '') => `
import { createHash, createHmac } from 'crypto';
export class Acme {
	async execute() {
		const credentials = await this.getCredentials('acmeApi');
		const k = credentials.apiKey;
		const item = this.getInputData()[0].json;
		let v;
		${body}
		const response = await this.helpers.request({ method: 'GET', uri: 'https://api.acme.test/v1/items', qs: { v } });
		${tail}
		return [this.helpers.returnJsonArray(response)];
	}
}`;

const compileWith = (source: string) =>
	specialiseNode({
		type: 'n8n-nodes-acme.acme',
		version: 1,
		entry: '/acme/Acme.node.ts',
		readFile: (path) => (path === '/acme/Acme.node.ts' ? source : undefined),
		parameters: {},
		instanceId: null,
	});

const READS: Array<[string, string]> = [
	['if (x)', "if (k) v = 'a'; else v = 'b';"],
	['!x', 'v = !k;'],
	['!!x', 'v = !!k;'],
	['Boolean(x)', 'v = Boolean(k);'],
	['x || y', "v = k || 'd';"],
	['x && y', "v = k && 'd';"],
	['x ?? y', "v = k ?? 'd';"],
	['x ? a : b', 'v = k ? 1 : 2;'],
	['x ||= y', "let w = k; w ||= 'd'; v = w;"],
	['while (x)', "while (k) { v = 'a'; break; }"],
	['for (; x; )', "for (; k; ) { v = 'a'; break; }"],
	['do while (x)', "do { v = 'a'; } while (!k);"],
	['switch (x)', "switch (k) { case 'a': v = 1; break; default: v = 2; }"],
	['x === text', "v = k === 'x';"],
	['x == null', 'v = k == null;'],
	['x !== undefined', 'v = k !== undefined;'],
	['x > text', "v = k > 'a';"],
	['x === value of the run', 'v = k === item.key;'],
	['x === other field', 'v = k === credentials.accountName;'],
	['typeof x', 'v = typeof k;'],
	['typeof x === text', "v = typeof k === 'string';"],
	['x.length', 'v = k.length;'],
	['x.length > n', 'v = k.length > 3;'],
	['x.length + n', 'v = k.length + 1;'],
	['x?.length', 'v = k?.length;'],
	['x.includes', "v = k.includes('a');"],
	['x.startsWith', "v = k.startsWith('sk');"],
	['x.endsWith in if', "if (k.endsWith('z')) v = 1;"],
	['x.trim()', 'v = k.trim();'],
	['x.split', "v = k.split(':')[0];"],
	['x.split length', "v = k.split(':').length;"],
	['x.toLowerCase()', 'v = k.toLowerCase();'],
	['x.slice', 'v = k.slice(0, 4);'],
	['x.substring', 'v = k.substring(2);'],
	['x.replace', "v = k.replace('a', 'b');"],
	['x.indexOf', "v = k.indexOf(':');"],
	['x.charAt', 'v = k.charAt(0);'],
	['x[0]', 'v = k[0];'],
	['x.concat', "v = k.concat('x');"],
	['x.padStart', 'v = k.padStart(8);'],
	['x.match', 'v = k.match(/a/);'],
	['regex.test(x)', 'v = /^sk/.test(k);'],
	['String(x)', 'v = String(k);'],
	['x.toString()', 'v = k.toString();'],
	['template length', 'v = `${k}`.length;'],
	['template method', 'v = `Bearer ${k}`.toUpperCase();'],
	['JSON.stringify(x)', 'v = JSON.stringify(k);'],
	['JSON.stringify of an object', 'v = JSON.stringify({ k });'],
	['JSON.stringify length', 'v = JSON.stringify({ k }).length;'],
	['JSON.parse(x)', 'v = JSON.parse(k);'],
	['Object.values every', 'v = Object.values({ a: k }).every(Boolean);'],
	['Object.values some', 'v = Object.values({ a: k }).some(Boolean);'],
	['Object.values filter length', 'v = Object.values({ a: k }).filter(Boolean).length;'],
	['Object.values every arrow', 'v = Object.values({ a: k }).every((x) => x);'],
	['Object.keys of the credential', 'v = Object.keys(credentials).length;'],
	['Object.entries of the credential', 'v = Object.entries(credentials).length;'],
	['for in of the credential', 'v = 0; for (const key in credentials) v++;'],
	['in of the credential', "v = 'apiKey' in credentials;"],
	['array includes', "v = [k].includes('x');"],
	['array indexOf', "v = ['x'].indexOf(k);"],
	['array join', "v = [k, 'x'].join(',');"],
	['array filter', 'v = [k].filter((x) => x).length;'],
	['array find', 'v = [k].find((x) => x.length > 2);'],
	['array map method', 'v = [k].map((x) => x.trim());'],
	['array sort', "v = [k, 'b'].sort()[0];"],
	['spread of x', 'v = [...k].length;'],
	['Array.from(x)', 'v = Array.from(k).length;'],
	['for of x', 'v = 0; for (const ch of k) v++;'],
	['hmac key', "v = createHmac('sha256', k).update('text').digest('hex');"],
	['hmac data', "v = createHmac('sha256', 'key').update(k).digest('hex');"],
	['hash', "v = createHash('md5').update(k).digest('hex');"],
	['hash of a text with x', "v = createHash('sha256').update('a' + k).digest('base64');"],
	['Buffer.from(x)', "v = Buffer.from(k).toString('base64');"],
	['Buffer.from(text with x)', "v = Buffer.from(`${k}:`).toString('base64');"],
	['Buffer.byteLength', 'v = Buffer.byteLength(k);'],
	['btoa', 'v = btoa(k);'],
	['x * n', 'v = k * 2;'],
	['x - n', 'v = k - 1;'],
	['+x', 'v = +k;'],
	['Number(x)', 'v = Number(k);'],
	['parseInt(x)', 'v = parseInt(k, 10);'],
	['x++', 'let w = k; w++; v = w;'],
	['x += n', 'let w = k; w += 1; v = w * 2;'],
	['Math.max', 'v = Math.max(k, 1);'],
	['isNaN', 'v = isNaN(k);'],
	['Array.isArray', 'v = Array.isArray(k);'],
	['encodeURIComponent', 'v = encodeURIComponent(k);'],
	['encodeURI', 'v = encodeURI(k);'],
	['URLSearchParams', 'v = new URLSearchParams({ k }).toString();'],
	['computed key', 'v = { [k]: 1 };'],
	['index by x', 'v = { a: 1 }[k];'],
	['in a function: method', 'const f = (x) => x.trim(); v = f(k);'],
	['in a function: branch', "function g(x) { return x ? 'a' : 'b'; }\n\t\tv = g(k);"],
	['in a function: length', 'function h(x) { return x.length; }\n\t\tv = h(k);'],
	['destructured: branch', "const { apiKey } = credentials; v = apiKey ? 'a' : 'b';"],
	['destructured: method', 'const { apiKey } = credentials; v = apiKey.trim();'],
	['object member: branch', "const o = { key: k }; v = o.key ? 'a' : 'b';"],
	['instanceof', 'v = k instanceof String;'],
	['void and comma', "v = (k, 'a');"],
];

const OPEN: Array<[string, string]> = [
	[
		'keys of an object in a variable',
		'const o = { key: k }; delete o.key; v = Object.keys(o).length;',
	],
	[
		'values of an object in a variable',
		'const o = { key: k }; v = Object.values(o).every(Boolean);',
	],
	['JSON text of an object in a variable', 'const o = { key: k }; v = JSON.stringify(o);'],
	['a method on a member of an object in a variable', 'const o = { key: k }; v = o.key.trim();'],
	['the length of a member of an object in a variable', 'const o = { key: k }; v = o.key.length;'],
];

const SINKS: Array<[string, string, string]> = [
	['an output item', '', 'return [[{ json: { key: k } }]];'],
	['an output item with text', '', 'return [[{ json: { key: `Bearer ${k}` } }]];'],
	['an output item of a derived value', '', 'return [[{ json: { key: k.trim() } }]];'],
	['an error message', "if (item.fail) throw new Error('bad ' + k);", ''],
	['the description of an error', '', 'if (response.fail) throw new Error(`key ${k}`);'],
	['a binary file name', '', 'return [[{ json: {}, binary: { data: { fileName: k } } }]];'],
	['a paired value', '', 'return [[{ json: response, pairedItem: { item: 0, key: k } }]];'],
];

const OPEN_SINKS: Array<[string, string, string]> = [
	['an output item through the response', '', 'response.key = k;'],
];

describe('reads of a secret credential field in node code', () => {
	it.each(OPEN)('%s compiles: an open difference', (_name, form) => {
		const result = compileWith(node(form));
		expect(result.errors).toEqual([]);
		expect(result.source).toContain(SECRET);
	});

	it.each(OPEN_SINKS)('%s compiles: an open difference', (_name, body, tail) => {
		const result = compileWith(node(body, tail));
		expect(result.errors).toEqual([]);
		expect(result.source).toContain(SECRET);
	});

	it.each(READS)('%s is refused or is a value that n8n computes', (_name, form) => {
		const result = compileWith(node(form));
		const kind =
			result.errors.length > 0
				? 'refused'
				: (result.source ?? '').includes(SECRET)
					? `holds the marker: ${(result.source ?? '')
							.split('\n')
							.filter((l) => l.includes(SECRET))
							.join(' | ')
							.slice(0, 300)}`
					: 'computed';
		expect(kind).toMatch(/^(refused|computed)$/);
	});

	it.each(SINKS)('%s does not get a credential value', (_name, body, tail) => {
		const result = compileWith(node(body, tail));
		const kind =
			result.errors.length > 0
				? 'refused'
				: (result.source ?? '').includes(WHOLE)
					? `holds a marker: ${(result.source ?? '')
							.split('\n')
							.filter((l) => l.includes(WHOLE))
							.join(' | ')
							.slice(0, 300)}`
					: 'no marker';
		expect(kind).toBe('refused');
	});
});
