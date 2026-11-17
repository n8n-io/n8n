/**
 * The native form of expressions (`native-expression.ts`) against v1: each expression is a
 * field of a Set node. The workflow runs in n8n's engine and, converted, on the reference
 * runner. The fields must be the same, and the Set node must not run in the fallback host.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEM = {
	text: 'Order INV-042 for Ada Lovelace, total 1.250,50 EUR',
	email: ' Ada.Lovelace@Example.COM ',
	csv: 'a, b,c ,  d',
	html: '<p>Hello <b>world</b></p>\n<p>bye</p>',
	phone: '+49 (0) 151-234 567',
	n: 42,
	zero: 0,
	flag: true,
	none: null,
	list: [3, 1, 2, 3, 1],
	tags: ['x', 'y'],
	nested: { a: { b: 'deep' } },
	date: '2024-03-09T07:05:00.000Z',
};

/** Expressions whose plain form the compiler rejects. */
const EXPRESSIONS: string[] = [
	// Regular expressions.
	'{{ $json.text.replace(/\\d+/g, "#") }}',
	'{{ $json.text.replace(/(\\w+) (\\w+),/, "$2 $1;") }}',
	'{{ $json.html.replace(/<[^>]*>/g, "").replace(/\\s+/g, " ").trim() }}',
	'{{ $json.phone.replace(/\\D/g, "") }}',
	'{{ $json.text.match(/INV-(\\d+)/)[1] }}',
	'{{ $json.text.match(/INV-(\\d+)/)?.[1] || "none" }}',
	'{{ $json.text.match(/XYZ-(\\d+)/)?.[1] || "none" }}',
	'{{ $json.text.match(/[A-Z][a-z]+/g) }}',
	'{{ $json.text.match(/nothing/g) }}',
	'{{ /^order/i.test($json.text) }}',
	'{{ /^order$/.test($json.text) ? "yes" : "no" }}',
	'{{ $json.csv.split(/\\s*,\\s*/) }}',
	'{{ $json.csv.split(/\\s*,\\s*/).map(s => s.toUpperCase()).join("|") }}',
	'{{ $json.text.search(/total/) }}',
	'{{ $json.text.replace(/[aeiou]/g, (m) => m.toUpperCase()) }}',
	'{{ $json.email.trim().toLowerCase().replace(/@.*$/, "") }}',
	'{{ $json.none.replace(/a/, "b") }}',
	'{{ $json.missing.replace(/a/, "b") }}',
	'{{ $json.n.replace(/a/, "b") }}',
	'{{ ($json.missing || "").replace(/a/, "b") }}',
	'{{ String($json.n).replace(/4/, "four") }}',
	'{{ $json.text.replaceAll(/o/g, "0") }}',
	'{{ new RegExp("inv-\\\\d+", "i").test($json.text) }}',
	// Text templates with a part that has a regular expression.
	'Id: {{ $json.text.match(/INV-\\d+/)[0] }} of {{ $json.n }}',
	'Id: {{ $json.missing.match(/INV-\\d+/)[0] }} of {{ $json.n }}',
	// Loose equality.
	'{{ $json.n == "42" }}',
	'{{ $json.zero == "" }}',
	'{{ $json.none == undefined }}',
	'{{ $json.flag != 1 }}',
	'{{ $json.n == 42 && $json.flag == true }}',
	// toString.
	'{{ $json.n.toString() }}',
	'{{ $json.flag.toString() }}',
	'{{ $json.list.toString() }}',
	'{{ $json.none.toString() }}',
	'{{ ($json.missing ?? "").toString().trim() }}',
	'{{ $json.n.toString(2) }}',
	// Functions with statements.
	'{{ (() => { const m = $json.text.match(/(\\d+)\\.(\\d+),(\\d+)/); return m ? Number(m[1] + m[2] + "." + m[3]) : null; })() }}',
	'{{ (function () { var out = []; for (var k = 0; k < $json.list.length; k++) { if (out.indexOf($json.list[k]) < 0) out.push($json.list[k]); } return out; })() }}',
	'{{ (() => { let s = 0; for (const x of $json.list) s += x; return s; })() }}',
	// Sets.
	'{{ [...new Set($json.list)] }}',
	'{{ Array.from(new Set($json.list)).length }}',
	'{{ new Set($json.list).size }}',
	'{{ new Set($json.list).has(2) }}',
	// Other globals with a helper.
	'{{ encodeURIComponent($json.text) }}',
	'{{ Number.isNaN(parseInt($json.csv)) }}',
	'{{ String.fromCharCode(64 + $json.list[1]) }}',
	'{{ Object.fromEntries($json.tags.map((t, k) => [t, k])) }}',
	'{{ $json.text.lastIndexOf("o") }}',
	'{{ $json.text.substr(6, 7) }}',
	'{{ isFinite($json.n) }}',
	// Errors that are not a TypeError.
	'{{ $json.n.toString(99) }}',
	'{{ (() => { if (!/^\\d+$/.test($json.text)) throw new Error("stop"); return 1; })() }}',
	'{{ "abc".repeat(-1).replace(/a/, "b") }}',
];

const FIELDS = EXPRESSIONS.map((expression, k) => ({
	id: `f${k}`,
	name: `f${k}`,
	type: 'string',
	value: `=${expression}`,
}));

function workflow(fields: typeof FIELDS, ignoreErrors = true) {
	return {
		name: 'Native expressions',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'S',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {
					assignments: { assignments: fields.map((f) => ({ ...f, type: 'object' })) },
					options: { ignoreConversionErrors: ignoreErrors },
				},
			},
		],
		connections: { T: { main: [[{ node: 'S', type: 'main', index: 0 }]] } },
	};
}

async function both(fields: typeof FIELDS) {
	const wf = workflow(fields);
	const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: ITEM },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	return { v1, converted, out };
}

describe('the native form of expressions', () => {
	it.each(FIELDS.map((f, k) => [EXPRESSIONS[k], f] as const))('%s', async (_name, field) => {
		const { v1, converted, out } = await both([field]);
		expect(converted.fallbackNodes).toEqual([]);
		const traced = (out.trace ?? []).find((t) => t.step === 'S')?.items;
		if (v1.error !== null) {
			expect(out.status).toBe('error');
			return;
		}
		expect(out.status).toBe('ok');
		expect(traced).toEqual(v1.nodes.S?.[0]);
	});

	it('keeps an expression with an extension without a helper in the fallback host', () => {
		const converted = convertWorkflow(
			workflow([
				{
					id: 'a',
					name: 'a',
					type: 'string',
					value: '={{ $json.text.replace(/a/, "b").toTitleCase() }}',
				},
			]),
		);
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual(['S']);
	});
});
