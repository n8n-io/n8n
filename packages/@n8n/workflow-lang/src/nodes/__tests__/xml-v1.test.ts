/**
 * The library node XML against v1. Each case runs the v1 workflow in n8n's engine (`runOracle`,
 * the real node of n8n-nodes-base) and the converted workflow on the reference runner. The text
 * of each item must be the same, byte for byte. A case with `host: 'static'` must hand the node
 * to the fallback host at conversion, and a case where the v1 node raises an error must hand it
 * over at run time (`RUNS_IN_HOST`), so v1 gives its own error text.
 */
import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Case {
	name: string;
	parameters: Record<string, unknown>;
	items: Array<Record<string, unknown>>;
	onError?: string;
	/** The node must run in the fallback host: at conversion (`static`) or at run time (`run`). */
	host?: 'static' | 'run';
	/** A generated case: the node may hand a form that v1 runs over to the host. */
	loose?: boolean;
}

const jsonToXml = (
	name: string,
	items: Array<Record<string, unknown>>,
	options: Record<string, unknown> = {},
	more: Partial<Case> = {},
): Case => ({
	name,
	parameters: { mode: 'jsonToxml', dataPropertyName: 'data', options },
	items,
	...more,
});

const xmlToJson = (
	name: string,
	items: Array<Record<string, unknown>>,
	more: Partial<Case> = {},
): Case => ({
	name,
	parameters: { mode: 'xmlToJson', dataPropertyName: 'data' },
	items,
	...more,
});

/** An object with one key, so that the only key names the root element. */
const one = (key: string, value: unknown): Record<string, unknown> => ({ [key]: value });

/**
 * JSON values from a fixed sequence: keys with spaces, symbols and Unicode, deep nesting, lists
 * of lists, empty values, numbers of each shape and long texts.
 */
function generated(): Case[] {
	let seed = 20261118;
	const next = (n: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return Math.floor((seed / 2147483648) * n);
	};
	const pick = <T>(list: T[]): T => list[next(list.length)];
	const keys = [
		'a',
		'b',
		'name',
		'item_1',
		'a-b',
		'a.b',
		'a:b',
		'x/y',
		'é',
		'名前',
		'ключ',
		'emoji😀',
	];
	/** A key that is not an XML name: the v1 node raises an error for it. */
	const badKeys = ['1a', 'a b', 'a&b', 'a<b'];
	const texts = [
		'x',
		'a & b',
		'a < b',
		'a > b',
		'a " b',
		"a ' b",
		'line1\nline2',
		'a\rb',
		'a\tb',
		'x]]>y',
		'é€😀',
		'Åsa Öberg',
		'  padded  ',
		'a'.repeat(300),
		'&amp;',
		'&#xD;',
		'\u00a0nbsp',
	];
	const numbers = [0, 1, -1, 1.5, -0.25, 1000, 1e21, 1e-7, 123456789012, 3.14159];
	function scalar(): unknown {
		const kind = next(5);
		if (kind === 0) return pick(texts);
		if (kind === 1) return '';
		if (kind === 2) return pick(numbers);
		if (kind === 3) return pick([true, false]);
		return null;
	}
	function attrs(): Record<string, unknown> {
		const out: Record<string, unknown> = {};
		const count = 1 + next(2);
		for (let i = 0; i < count; i++) {
			out[pick(['id', 'x', 'a-b', 'n:s', 'name'])] = pick([
				'v',
				'',
				'1',
				2,
				true,
				null,
				'a & b < c > d " e',
				'tab\there\nnewline',
			]);
		}
		return out;
	}
	function list(depth: number): unknown[] {
		const out: unknown[] = [];
		const count = next(4);
		for (let i = 0; i < count; i++) {
			if (next(3) === 0) out.push({ [pick(['b', 'c', 'a-b'])]: scalar() });
			else if (next(4) === 0) out.push(list(depth + 1));
			else out.push(scalar());
		}
		return out;
	}
	function value(depth: number): unknown {
		if (depth >= 4 || next(3) === 0) return scalar();
		const out: Record<string, unknown> = {};
		const count = next(4);
		for (let i = 0; i < count; i++) {
			out[next(10) === 0 ? pick(badKeys) : pick(keys)] =
				next(4) === 0 ? list(depth + 1) : value(depth + 1);
		}
		if (next(5) === 0) out.$ = attrs();
		if (next(6) === 0) out._ = pick(texts);
		return out;
	}
	const cases: Case[] = [];
	for (let k = 0; k < 300; k++) {
		const options: Record<string, unknown> = {};
		if (next(5) === 0) options.headless = true;
		if (next(6) === 0) options.rootName = pick(['wrap', 'r', 'root', 'a-b']);
		if (next(6) === 0) options.cdata = true;
		if (next(8) === 0) options.attrkey = '@';
		if (next(8) === 0) options.charkey = '#';
		const count = 1 + next(2);
		const items: Array<Record<string, unknown>> = [];
		for (let i = 0; i < count; i++) {
			if (next(3) === 0) {
				items.push({ [pick(['a', 'b', 'item_1'])]: value(1) });
				continue;
			}
			const built = value(0);
			if (typeof built === 'object' && built !== null && !Array.isArray(built)) {
				items.push(built as Record<string, unknown>);
			} else {
				items.push({ a: built });
			}
		}
		cases.push(jsonToXml(`generated ${k}`, items, options, { loose: true }));
	}
	return cases;
}

const CASES: Case[] = [
	jsonToXml('flat object', [{ a: 1, b: 'x' }]),
	jsonToXml('one key', [one('a', 1)]),
	jsonToXml('one key with an object', [one('a', { b: 1 })]),
	jsonToXml('nested object', [{ a: { b: 1, c: { d: 'x' } }, e: 'y' }]),
	jsonToXml('deep nesting', [one('a', { b: { c: { d: { e: 'deep' } } } })]),
	jsonToXml('list of objects', [one('a', [{ b: 1 }, { b: 2 }])]),
	jsonToXml('list of numbers, one key', [one('a', [1, 2, 3])]),
	jsonToXml('list of numbers, two keys', [{ a: [1, 2, 3], b: 4 }]),
	jsonToXml('list of strings, two keys', [{ a: ['x', 'y'], b: 4 }]),
	jsonToXml('list of strings, one key', [one('a', ['x', 'y'])], {}, { host: 'run' }),
	jsonToXml('list of lists', [{ a: [[1, 2], [3]], b: 4 }]),
	jsonToXml('list of objects and null', [{ a: [{ b: 1 }, null], b: 1 }]),
	jsonToXml('empty object', [{}]),
	jsonToXml('empty nested object', [one('a', {})]),
	jsonToXml('null value', [{ a: null }]),
	jsonToXml('empty string', [{ a: '' }]),
	jsonToXml('zero', [one('a', 0)]),
	jsonToXml('number and boolean', [{ a: 1.5, b: true, c: false, d: -3 }]),
	jsonToXml('a big and a small number', [{ a: 1e21, b: 1e-7, c: 123456789012 }]),
	jsonToXml('escaping', [one('a', 'a & b < c > d " e\n f\rg\th')]),
	jsonToXml('quote and apostrophe', [{ a: 'a " b \' c', b: '"quoted"' }]),
	jsonToXml('attribute key', [one('a', { $: { x: '1', y: 2 }, _: 'text' })]),
	jsonToXml('attribute only', [one('a', { $: { x: 'a & b < c > d " e\nf\tg\rh' } })]),
	jsonToXml('attribute with a null', [one('a', { $: { x: null, y: 'kept' } })]),
	jsonToXml('attribute with a boolean', [one('a', { $: { x: true } })]),
	jsonToXml('text key only', [one('a', { _: 'text' })]),
	jsonToXml('empty text key with a child', [{ a: { _: '', b: 1 } }]),
	jsonToXml('text and children', [{ a: { _: 't', b: 1 } }]),
	jsonToXml('headless', [{ a: 1, b: 2 }], { headless: true }),
	jsonToXml('root name', [{ a: 1, b: 2 }], { rootName: 'wrap' }),
	jsonToXml('root name with one key', [one('a', 1)], { rootName: 'wrap' }),
	jsonToXml('cdata', [{ a: 'x & <y>', b: 'plain' }], { cdata: true }),
	jsonToXml('cdata with ]]>', [one('a', 'x]]>y')], { cdata: true }),
	jsonToXml('cdata in a list of strings', [{ a: ['<x>', 'y'], b: 1 }], { cdata: true }),
	jsonToXml('another attribute key', [one('a', { '@': { x: '1' }, _: 't' })], { attrkey: '@' }),
	jsonToXml('another character key', [one('a', { '#': 't' })], { charkey: '#' }),
	jsonToXml('allow surrogate chars', [one('a', '😀 x')], { allowSurrogateChars: true }),
	jsonToXml('colon and dash in a key', [{ 'a:b-c': 1 }]),
	jsonToXml('unicode key', [{ é: 1 }]),
	jsonToXml('a long text', [one('a', 'a'.repeat(2000))]),
	jsonToXml('two items', [{ a: 1 }, { b: 2 }]),
	jsonToXml('three items', [{ a: 1 }, one('b', { c: 'x' }), {}]),
	// The v1 node raises an error for these forms: the node must run in the host.
	jsonToXml('a key with a space', [{ 'a b': 1 }], {}, { host: 'run' }),
	jsonToXml('a key that starts with a digit', [{ '1a': 1 }], {}, { host: 'run' }),
	jsonToXml('a control character in text', [one('a', 'x\u0001y')], {}, { host: 'run' }),
	jsonToXml('a lone surrogate', [one('a', 'x\ud800y')], {}, { host: 'run' }),
	jsonToXml('U+FFFF in text', [one('a', '\uffff')], {}, { host: 'run' }),
	jsonToXml('a bad attribute name', [one('a', { $: { 'x y': 1 } })], {}, { host: 'run' }),
	jsonToXml('an object as the text', [one('a', { _: { b: 1 } })], {}, { host: 'run' }),
	jsonToXml(
		'a root name that is not a name',
		[{ a: 1, b: 2 }],
		{ rootName: 'a b' },
		{ host: 'run' },
	),
	jsonToXml(
		'continue on fail',
		[{ a: 1 }, { 'b c': 2 }],
		{},
		{
			host: 'run',
			onError: 'continueRegularOutput',
		},
	),
	// The mode XML to JSON keeps the v1 node.
	xmlToJson('xmlToJson', [{ data: '<a>1</a>' }], { host: 'static' }),
	...generated(),
];

function workflow(c: Case) {
	return {
		name: 'XML',
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
				parameters: { jsCode: `return ${JSON.stringify(c.items.map((json) => ({ json })))};` },
			},
			{
				name: 'F',
				type: 'n8n-nodes-base.xml',
				typeVersion: 1,
				position: [400, 0],
				parameters: c.parameters,
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'F', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** Runs the converted workflow. A step of the fallback host ends the run: the node is in the host. */
async function runCompiled(source: string, c: Case) {
	const items = c.items.map((json) => json);
	const effects: Record<string, unknown[]> = { Items: [items] };
	for (let round = 0; round < 20; round++) {
		const out = await runReference(source, { trigger: { body: {} }, now: 0, seed: 1, effects });
		const seen = new Map<string, number>();
		let added = false;
		for (const e of out.effects) {
			const k = seen.get(e.step) ?? 0;
			seen.set(e.step, k + 1);
			if (e.step !== 'Items') {
				if (e.kind === 'node') return { out, host: true };
				throw new Error(`An effect without an answer: ${e.kind} ${e.step}`);
			}
			const list = (effects[e.step] ??= []);
			if (list[k] !== undefined) continue;
			if (e.kind === 'node') return { out, host: true };
			list[k] = items;
			added = true;
			break;
		}
		if (!added) return { out, host: false };
	}
	throw new Error('The service calls did not settle');
}

const tally = { native: 0, refused: 0, strict: 0 };

describe('the XML library node and v1', () => {
	afterAll(() => {
		// Most generated items must have a compiled form, and the node must refuse only the forms
		// that it has no proof for.
		expect(tally.native).toBeGreaterThan(tally.refused);
		// Every generated item that the v1 node reads has a compiled form.
		expect(tally.strict).toBe(0);
	});

	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const converted = convertWorkflow(workflow(c), { codeNodes: 'host' });
		expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		if (c.host === 'static') {
			expect(converted.fallbackNodes).toContain('F');
			return;
		}
		expect(converted.fallbackNodes).not.toContain('F');
		const { out, host } = await runCompiled(converted.source, c);
		if (c.host === 'run') {
			expect(host, 'the node runs in the fallback host').toBe(true);
			tally.refused++;
			return;
		}
		if (host) {
			// The node handed this item over to the host. A hand-written case must be a form where
			// v1 raises an error; a generated case may be a form with no proof.
			tally.refused++;
			if (v1.error === null) tally.strict++;
			if (!c.loose) expect(v1.error, 'v1 raises an error for this form').not.toBeNull();
			return;
		}
		tally.native++;
		expect(v1.error, `v1 gives an error: ${JSON.stringify(v1.error)}`).toBeNull();
		expect(out.status, JSON.stringify(out.result)).toBe('ok');
		expect(JSON.stringify((out.result as Record<string, unknown>).F)).toBe(
			JSON.stringify(v1.nodes.F?.[0] ?? []),
		);
	});
});
