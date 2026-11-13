import { decodeModule } from '../compiler/decode.ts';
import {
	compileLegacyExpression,
	extractExpressions,
	importWorkflowExpressions,
	rewriteLegacy,
	wrapExpressions,
} from '../legacy/index.ts';

const D = '$';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

async function evaluate(body: string, json: unknown, nodes: Record<string, unknown> = {}) {
	const r = compileLegacyExpression(body);
	if (!r.ok) throw new Error(JSON.stringify(r.issues));
	const fixture = {
		trigger: { body: { json, nodes }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: {},
	};
	const bytecode = runModule(decodeModule(r.result.module ?? new Uint8Array()), fixture);
	const source = wrapExpressions([r.rewritten.code], r.rewritten.nodes).source;
	const reference = await runReference(source, fixture, { nodes: {} });
	expect(bytecode).toEqual(reference);
	return bytecode.result;
}

describe('legacy expressions', () => {
	it('extracts the bodies of {{ }} in a parameter value', () => {
		expect(
			extractExpressions('=Hello {{ $json.name }}, you owe {{ $json.total.toFixed(2) }}'),
		).toEqual(['$json.name', '$json.total.toFixed(2)']);
		expect(extractExpressions('plain {{ text }}')).toEqual([]);
	});

	it('maps node references to variables', () => {
		const r = rewriteLegacy(
			'$(\'Get order\').item.json.id + $node["Get order"].json.n + $node.Webhook.json.x + $input.item.json.y',
		);
		expect(r.code).toBe('$node_Get_order.id + $node_Get_order.n + $node_Webhook.x + $json.y');
		expect([...r.nodes.entries()]).toEqual([
			['Get order', '$node_Get_order'],
			['Webhook', '$node_Webhook'],
		]);
		expect(r.unsupported).toEqual([]);
	});

	it('compiles and runs $json expressions', async () => {
		expect(await evaluate('$json.price * $json.qty', { price: 2.5, qty: 4 })).toBe(10);
		expect(
			await evaluate(`\`${D}{$json.first} ${D}{$json.last}\`.toUpperCase()`, {
				first: 'Zoë',
				last: 'Ng',
			}),
		).toBe('ZOË NG');
		expect(
			await evaluate('$json.items.map(i => i.sku).join(",")', {
				items: [{ sku: 'a' }, { sku: 'b' }],
			}),
		).toBe('a,b');
	});

	it('compiles and runs references to other nodes', async () => {
		expect(
			await evaluate(
				"$('Order').item.json.total + $json.fee",
				{ fee: 1 },
				{ Order: { total: 41 } },
			),
		).toBe(42);
	});

	it('reports n8n variables that have no mapping', () => {
		const r = compileLegacyExpression("$now.toFormat('yyyy')");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.issues.map((i) => i.feature)).toEqual(['$now']);
	});

	it('compiles and runs Date expressions', async () => {
		expect(await evaluate('new Date($json.ts * 1000).toISOString()', { ts: 1700000000 })).toBe(
			'2023-11-14T22:13:20.000Z',
		);
		expect(
			await evaluate('new Date($json.at).toLocaleTimeString()', { at: '2020-01-01T13:05:00Z' }),
		).toBe('1:05:00 PM');
		expect(await evaluate('(new Date()).toGMTString()', {})).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
		expect(await evaluate('new Date($json.at)', { at: 'Jan 2 2021' })).toBe(
			'2021-01-02T00:00:00.000Z',
		);
		expect(await evaluate('$now.toISO() + " " + $today.toISO()', {})).toBe(
			'1970-01-01T00:00:00.000Z 1970-01-01T00:00:00.000Z',
		);
	});

	it('reports library gaps with the subset rule', () => {
		const r = compileLegacyExpression(
			'new Date().toLocaleDateString("en-US", { weekday: "long" })',
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.issues.map((i) => i.feature)).toEqual(['Date: locale options']);
		const m = compileLegacyExpression('$json.email.match("x")');
		if (!m.ok) expect(m.issues.map((i) => i.feature)).toEqual(['.match()']);
	});

	it('reports the expressions of a workflow that do not fit, at import', () => {
		const report = importWorkflowExpressions({
			nodes: [
				{
					name: 'Set',
					parameters: { values: { a: '={{ $json.a + 1 }}', b: '={{ $execution.id }}' } },
				},
				{ name: 'If', parameters: { conditions: [{ left: '={{ Math.random() }}' }] } },
			],
		});
		expect(report.total).toBe(3);
		expect(report.compiled).toBe(1);
		expect(report.issues.map((i) => [i.node, i.parameter, i.issues[0].feature])).toEqual([
			['Set', 'values.b', '$execution'],
			['If', 'conditions[0].left', 'Math.random'],
		]);
	});
});
