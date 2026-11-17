/**
 * n8n's expression extensions that have a helper (`extension-helpers.ts`) against v1: each
 * expression is a field of a Set node. The workflow runs in n8n's engine and, converted, on
 * the reference runner. The fields (or the failure of the node) must be the same, and the Set
 * node must not run in the fallback host.
 */
import { runReference } from '../../reference/runner.ts';
import { rewriteExtensions } from '../expression.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEM = {
	text: 'Hello',
	empty: '',
	blank: ' ',
	n: 42,
	zero: 0,
	yes: true,
	no: false,
	none: null,
	list: [3, 1, 2],
	emptyList: [],
	obj: { a: 1, toString: 2 },
	emptyObj: {},
	isoDate: '2024-03-09T07:05:00.000Z',
	otherDate: '2024-03-09 07:05',
	json: '{"a":[1,2,{"b":null}]}',
	badJson: "{'a': 1}",
	worseJson: '{a',
	price: '$1,250.50',
	euro: '€ 99',
	franc: 'CHF12.5',
	real: 'R$ 7',
	krone: '12 kr',
	numeric: ' 12.5 ',
	hex: '0x1f',
	notNumber: 'abc',
};

/** Expressions whose value v1 gives. */
const VALUES: string[] = [
	// isEmpty and isNotEmpty for each type.
	...[
		'text',
		'empty',
		'blank',
		'n',
		'zero',
		'yes',
		'no',
		'none',
		'missing',
		'list',
		'emptyList',
		'obj',
		'emptyObj',
		'isoDate',
	].flatMap((k) => [`{{ $json.${k}.isEmpty() }}`, `{{ $json.${k}.isNotEmpty() }}`]),
	'{{ $json.missing.deep.isEmpty() }}',
	'{{ "".isEmpty() }}',
	'{{ [].isEmpty() ? "none" : "some" }}',
	'{{ $json.list.filter(x => x > 5).isEmpty() }}',
	// toJsonString.
	'{{ $json.text.toJsonString() }}',
	'{{ $json.list.toJsonString() }}',
	'{{ $json.obj.toJsonString() }}',
	'{{ $json.toJsonString() }}',
	'{{ $json.otherDate.toJsonString() }}',
	'{{ ({ a: [1, "x"], b: null }).toJsonString() }}',
	'{ "payload": {{ $json.obj.toJsonString() }}, "text": {{ $json.text.toJsonString() }} }',
	// first and last.
	'{{ $json.list.first() }}',
	'{{ $json.list.last() }}',
	'{{ $json.emptyList.first() }}',
	'{{ $json.emptyList.last() }}',
	'{{ $json.list.map(x => x * 2).last() }}',
	'{{ $input.first().json.n }}',
	'{{ $input.last().json.text }}',
	'{{ $input.all().first().json.n }}',
	'{{ $json.text.split("l").first() }}',
	// toNumber.
	'{{ $json.numeric.toNumber() }}',
	'{{ $json.hex.toNumber() }}',
	'{{ $json.price.replace(",", "").toNumber() }}',
	'{{ $json.euro.toNumber() }}',
	'{{ $json.franc.toNumber() }}',
	'{{ $json.real.toNumber() }}',
	'{{ $json.krone.toNumber() }}',
	'{{ $json.empty.toNumber() }}',
	'{{ $json.yes.toNumber() + $json.no.toNumber() }}',
	'{{ "12".toNumber() + 1 }}',
	// parseJson.
	'{{ $json.json.parseJson() }}',
	'{{ $json.json.parseJson().a[2].b }}',
	'{{ "[1,2]".parseJson().length }}',
	// length.
	'{{ $json.text.length() }}',
	'{{ $json.empty.length() }}',
	// hasField.
	'{{ $json.obj.hasField("a") }}',
	'{{ $json.obj.hasField("b") }}',
	'{{ $json.emptyObj.hasField("toString") }}',
	'{{ $json.hasField("text") }}',
	// toBoolean.
	...['text', 'empty', 'n', 'zero', 'yes', 'no', 'list', 'obj', 'isoDate'].map(
		(k) => `{{ $json.${k}.toBoolean() }}`,
	),
	'{{ "No".toBoolean() }}',
	'{{ "0".toBoolean() }}',
	'{{ "false".toBoolean() }}',
	// $if.
	'{{ $if($json.n > 10, "big", "small") }}',
	'{{ $if($json.zero, "yes") }}',
	'{{ $if($json.zero, $json.missing.deep, "lazy") }}',
	'{{ $if($json.list.isEmpty(), "none", $json.list.first()) }}',
	'{{ $if($json.n > 10 ? $json.yes : $json.no, [1, 2], { a: 1 }) }}',
	// Extensions together with the native form.
	'{{ $json.text.replace(/l+/, "L").isEmpty() }}',
	'{{ $json.json.parseJson().a.toString().length() }}',
];

/** Expressions that stop the node in v1. */
const FAILURES: string[] = [
	'{{ $json.n.toJsonString() }}',
	'{{ $json.yes.toJsonString() }}',
	'{{ $json.none.toJsonString() }}',
	'{{ $json.missing.toJsonString() }}',
	'{{ $json.isoDate.toJsonString() }}',
	'{{ $json.text.first() }}',
	'{{ $json.none.last() }}',
	'{{ $json.obj.first() }}',
	'{{ $json.notNumber.toNumber() }}',
	'{{ $json.price.toNumber() }}',
	'{{ $json.n.toNumber() }}',
	'{{ $json.list.toNumber() }}',
	'{{ $json.isoDate.toNumber() }}',
	'{{ $json.badJson.parseJson() }}',
	'{{ $json.worseJson.parseJson() }}',
	'{{ $json.n.parseJson() }}',
	'{{ $json.list.length() }}',
	'{{ $json.n.length() }}',
	'{{ $json.text.hasField("a") }}',
	'{{ $json.none.toBoolean() }}',
	'{{ $json.notNumber.replace(/a/, "b").toNumber() }}',
];

function workflow(expression: string) {
	return {
		name: 'Extensions',
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
					assignments: {
						assignments: [{ id: 'f', name: 'f', type: 'object', value: `=${expression}` }],
					},
					options: { ignoreConversionErrors: true },
				},
			},
		],
		connections: { T: { main: [[{ node: 'S', type: 'main', index: 0 }]] } },
	};
}

async function both(expression: string) {
	const wf = workflow(expression);
	const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(converted.fallbackNodes).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: ITEM },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	return { v1, out };
}

describe('expression extensions', () => {
	it.each(VALUES)('%s', async (expression) => {
		const { v1, out } = await both(expression);
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		const traced = (out.trace ?? []).find((t) => t.step === 'S')?.items;
		expect(traced).toEqual(v1.nodes.S?.[0]);
	});

	it.each(FAILURES)('fails as v1: %s', async (expression) => {
		const { v1, out } = await both(expression);
		expect(v1.error).not.toBeNull();
		expect(out.status).toBe('error');
		const traced = (out.trace ?? []).find((t) => t.step === 'S')?.items as
			| { $error?: { message?: string } }
			| undefined;
		expect(v1.error).toContain(traced?.$error?.message);
	});

	it('leaves an extension in an optional chain, on a Date, and with other arguments', () => {
		expect(rewriteExtensions('$json.a?.isEmpty()').code).toBe('$json.a?.isEmpty()');
		expect(rewriteExtensions('$json.a?.b.isEmpty()').code).toBe('$json.a?.b.isEmpty()');
		expect(rewriteExtensions('$json.a.isEmpty(1)').code).toBe('$json.a.isEmpty(1)');
		expect(rewriteExtensions('$input.first().json').code).toBe('$input.first().json');
		expect(rewriteExtensions("$('A').last().json").code).toBe("$('A').last().json");
		expect(rewriteExtensions('$if($json.a)').code).toBe('$if($json.a)');
		expect(rewriteExtensions('new Date($json.a).isEmpty()').code).toBe(
			'new Date($json.a).isEmpty()',
		);
	});

	it('rewrites nested extensions from the outside in', () => {
		expect(rewriteExtensions('$json.a.first().isEmpty()').code).toBe(
			'extIsEmpty(extFirst($json.a))',
		);
		expect(rewriteExtensions('$if(a.isEmpty(), b.hasField("x"), 1).toJsonString()').code).toBe(
			'extToJsonString(((extIsEmpty(a)) ? (extHasField(b, "x")) : (1)))',
		);
	});
});
