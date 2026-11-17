/**
 * `$item(k).$node["Node"].json` and the binary data of an item of a node, against v1. Each
 * expression is a field of a Set node after two other nodes. The workflow runs in n8n's
 * engine and, converted, on the reference runner.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEMS_CODE = `return [
	{ json: { a: 1, tag: 'x' }, binary: { data: { data: 'aGk=', mimeType: 'text/plain', fileName: 'a.txt', fileExtension: 'txt' } } },
	{ json: { a: 2, tag: 'y' }, binary: { scan: { data: 'AA==', mimeType: 'image/png', fileName: 'b.png' } } },
	{ json: { a: 3, tag: 'z' } },
];`;

function workflow(expression: string) {
	return {
		name: 'Items of a node',
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
				parameters: { jsCode: ITEMS_CODE },
			},
			{
				name: 'Mid',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'm', name: 'mid', type: 'number', value: '={{ $json.a * 10 }}' }],
					},
					options: {},
				},
			},
			{
				name: 'S',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [600, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'f', name: 'f', type: 'object', value: `=${expression}` }],
					},
					options: { ignoreConversionErrors: true },
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Mid', type: 'main', index: 0 }]] },
			Mid: { main: [[{ node: 'S', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

const VALUES = [
	'{{ $item(0).$node["Items"].json.tag }}',
	'{{ $item(2).$node["Items"].json.a + $json.mid }}',
	"{{ $item(1).$node['Items'].json }}",
	'{{ $item(0).$node.Items.json.tag }}',
	'{{ $item($itemIndex).$node["Items"].json.tag }}',
	'{{ $item(2 - $itemIndex).$node["Mid"].json.mid }}',
	'{{ $item(0).$node["Items"].json.missing.deep }}',
	// An index that is not a number reads no item: the member of it is a TypeError.
	'{{ $item($json.a + 2).$node["Items"].json.tag }}',
	'{{ Object.keys($item(0).$node["Items"].json) }}',
	'first {{ $item(0).$node["Items"].json.tag }} of {{ $json.a }}',
	// The binary data of an item of a node.
	"{{ $('Items').item.binary.data.mimeType }}",
	"{{ $('Items').item.binary.scan.fileName }}",
	"{{ $('Items').first().binary.data.fileName }}",
	"{{ $('Items').last().binary.data.fileName }}",
	"{{ Object.keys($('Items').item.binary) }}",
	"{{ Object.keys($('Items').item.binary).length > 0 ? 'file' : 'none' }}",
	"{{ $('Items').item.binary.data ? 'data' : 'other' }}",
	'{{ $input.item.binary.data.fileExtension }}',
	'{{ Object.keys($input.first().binary) }}',
];

const FAILURES = [
	'{{ $item(5).$node["Items"].json.tag }}',
	'{{ $item($json.mid).$node["Items"].json.tag }}',
];

async function both(expression: string) {
	const wf = workflow(expression);
	const v1 = await runOracle(wf, { start: 'T', item: {}, mode: 'trigger', timeoutMs: 20_000 });
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(converted.fallbackNodes).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: {} },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	return { v1, out, traced: (out.trace ?? []).find((t) => t.step === 'S')?.items };
}

/** The items without their binary data: the runtime adds `bytes` to each entry. */
const plain = (items: unknown): unknown =>
	Array.isArray(items)
		? items.map((i: unknown) =>
				typeof i === 'object' && i !== null
					? Object.fromEntries(Object.entries(i).filter(([k]) => k !== '$binary'))
					: i,
			)
		: items;

describe('items of a node in expressions', () => {
	it.each(VALUES)('%s', async (expression) => {
		const { v1, out, traced } = await both(expression);
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(plain(traced)).toEqual(v1.nodes.S?.[0]);
	});

	it.each(FAILURES)('fails as v1: %s', async (expression) => {
		const { v1, out, traced } = await both(expression);
		expect(v1.error).not.toBeNull();
		expect(out.status).toBe('error');
		const failure = traced as { $error?: { message?: string } } | undefined;
		expect(v1.error).toContain(failure?.$error?.message);
	});
});
