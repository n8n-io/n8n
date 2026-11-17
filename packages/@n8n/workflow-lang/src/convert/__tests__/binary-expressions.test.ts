/**
 * `$binary` in expressions, against v1: the names of the entries, the members of an entry
 * that v1 and the runtime both have, and tests of the map or of an entry. The first item has
 * two files, the second one file, and the third no binary data. Each case runs the workflow
 * in n8n's engine and the converted workflow on the reference runner.
 */
import { runReference } from '../../reference/runner.ts';
import { translateValue } from '../expression.ts';
import type { ExpressionScope } from '../expression.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEMS_CODE = `return [
	{ json: { a: 1 }, binary: {
		data: { data: 'aGVsbG8=', mimeType: 'text/plain', fileName: 'note.txt', fileExtension: 'txt' },
		scan: { data: 'AAEC', mimeType: 'application/pdf', fileName: 'scan.pdf', fileExtension: 'pdf' },
	} },
	{ json: { a: 2 }, binary: { file: { data: 'AA==', mimeType: 'image/png', fileName: 'dot.png' } } },
	{ json: { a: 3 } },
];`;

const head = [
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
];

function setWorkflow(expression: string) {
	return {
		name: 'Binary values',
		nodes: [
			...head,
			{
				name: 'S',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
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
			Items: { main: [[{ node: 'S', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

interface Condition {
	leftValue: string;
	rightValue: unknown;
	operator: { type: string; operation: string; singleValue?: boolean };
}

function ifWorkflow(condition: Condition) {
	return {
		name: 'Binary conditions',
		nodes: [
			...head,
			{
				name: 'S',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [400, 0],
				parameters: {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
						conditions: [{ id: 'c', ...condition }],
						combinator: 'and',
					},
					options: {},
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'S', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

const VALUES = [
	'{{ $binary.data.mimeType }}',
	'{{ $binary.data.fileName }}',
	'{{ $binary.file.fileExtension }}',
	'{{ $binary.scan.fileExtension }}',
	'{{ $binary.data.fileName || "none" }}',
	'{{ $binary["scan"].fileName }}',
	'{{ Object.keys($binary) }}',
	'{{ Object.keys($binary).length }}',
	'{{ Object.keys($binary || {}).length }}',
	'{{ Object.keys($binary ?? {}).length > 1 }}',
	'{{ $binary[Object.keys($binary)[0]].mimeType }}',
	'{{ $binary[Object.keys($binary || {})[0]].fileName }}',
	'{{ $binary.data ? "has data" : "no data" }}',
	'{{ $binary ? "binary" : "plain" }}',
	'{{ !$binary.file }}',
	'{{ !!$binary }}',
	'{{ $binary && $json.a }}',
	'{{ $binary.data != null }}',
	'{{ $binary === undefined }}',
	'{{ typeof $binary }}',
	'{{ Boolean($binary.scan) }}',
	'file {{ $binary.data.fileName }} of type {{ $binary.data.mimeType }}',
	'{{ $binary.data.mimeType.startsWith("text/") }}',
];

const CONDITIONS: Condition[] = [
	{
		leftValue: '={{ $binary }}',
		rightValue: '',
		operator: { type: 'object', operation: 'exists', singleValue: true },
	},
	{
		leftValue: '={{ $binary }}',
		rightValue: '',
		operator: { type: 'object', operation: 'notExists', singleValue: true },
	},
	{
		leftValue: '={{ $binary.data }}',
		rightValue: '',
		operator: { type: 'object', operation: 'exists', singleValue: true },
	},
	{
		leftValue: '={{ $binary }}',
		rightValue: '',
		operator: { type: 'object', operation: 'notEmpty', singleValue: true },
	},
	{
		leftValue: '={{ $binary.file }}',
		rightValue: '',
		operator: { type: 'object', operation: 'empty', singleValue: true },
	},
	{
		leftValue: '={{ $binary.data.mimeType }}',
		rightValue: 'text/plain',
		operator: { type: 'string', operation: 'equals' },
	},
	{
		leftValue: '={{ Object.keys($binary || {}).length }}',
		rightValue: 0,
		operator: { type: 'number', operation: 'gt' },
	},
	{
		leftValue: '={{ Object.keys($binary).length }}',
		rightValue: 1,
		operator: { type: 'number', operation: 'equals' },
	},
	{
		leftValue: '={{ $binary.scan.fileExtension }}',
		rightValue: 'pdf',
		operator: { type: 'string', operation: 'equals' },
	},
];

async function both(wf: { nodes: Array<{ name: string; type: string }>; connections: unknown }) {
	const v1 = await runOracle(wf, { start: 'T', item: {}, mode: 'trigger', timeoutMs: 20_000 });
	expect(v1.error).toBeNull();
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
	expect(out.status).toBe('ok');
	return { v1, traced: (out.trace ?? []).find((t) => t.step === 'S')?.items };
}

/** The items without their binary data: the runtime adds `bytes` to each entry. */
const plain = (items: unknown): unknown =>
	Array.isArray(items)
		? items.map((i: unknown) =>
				Array.isArray(i)
					? plain(i)
					: typeof i === 'object' && i !== null
						? Object.fromEntries(Object.entries(i).filter(([k]) => k !== '$binary'))
						: i,
			)
		: items;

describe('$binary in expressions', () => {
	it.each(VALUES)('value %s', async (expression) => {
		const { v1, traced } = await both(setWorkflow(expression));
		expect(plain(traced)).toEqual(v1.nodes.S?.[0]);
	});

	it.each(CONDITIONS.map((c) => [c.leftValue, c.operator.operation, c] as const))(
		'condition %s %s',
		async (_left, _operation, condition) => {
			const { v1, traced } = await both(ifWorkflow(condition));
			expect(plain(traced)).toEqual(v1.nodes.S);
		},
	);

	it.each([
		'{{ $binary }}',
		'{{ $binary.data }}',
		'{{ $binary.data || "x" }}',
		'{{ Object.values($binary) }}',
		'{{ Object.keys($binary.data) }}',
		'{{ JSON.stringify($binary) }}',
		'{{ $binary.data.data }}',
		'{{ $binary.data.id }}',
		'{{ Object.keys($binary || { a: 1 }) }}',
		'{{ [$binary.data] }}',
	])('does not translate %s as a value', (expression) => {
		const scope: ExpressionScope = {
			pairedItem: () => null,
			nodeList: () => null,
			nodeParameters: () => null,
			inputList: 'input',
			ownParameters: {},
			workflowName: 'W',
			workflowId: '1',
			prevNode: null,
		};
		expect(translateValue(`=${expression}`, scope, 'p').failures).toHaveLength(1);
	});
});
