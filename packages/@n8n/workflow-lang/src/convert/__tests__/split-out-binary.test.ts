/**
 * The Split Out node and binary data, against v1: the field `$binary` (one row for each file
 * of the item), the option "Include Binary", and rows that keep the other fields of an item
 * with binary data. Each case runs the workflow in n8n's engine and the converted workflow on
 * the reference runner. The rows and the names and types of their files must be the same.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEMS_CODE = `return [
	{ json: { id: 1, tags: ['a', 'b'], rows: [{ n: 1 }, { n: 2 }, { n: 3 }] }, binary: {
		data: { data: 'aGk=', mimeType: 'text/plain', fileName: 'a.txt' },
		scan: { data: 'AA==', mimeType: 'image/png', fileName: 'b.png' },
	} },
	{ json: { id: 2, tags: ['c'], rows: [] }, binary: { only: { data: 'AQ==', mimeType: 'application/pdf', fileName: 'c.pdf' } } },
	{ json: { id: 3, tags: [], rows: [{ n: 9 }] } },
];`;

interface Case {
	name: string;
	parameters: Record<string, unknown>;
}

const CASES: Case[] = [
	{ name: 'the files of an item', parameters: { fieldToSplitOut: '$binary', options: {} } },
	{
		name: 'the files of an item with all other fields',
		parameters: { fieldToSplitOut: '$binary', include: 'allOtherFields', options: {} },
	},
	{
		name: 'the files of an item with selected fields',
		parameters: {
			fieldToSplitOut: '$binary',
			include: 'selectedOtherFields',
			fieldsToInclude: 'id',
			options: {},
		},
	},
	{
		name: 'the files and a list of an item',
		parameters: { fieldToSplitOut: '$binary, tags', options: {} },
	},
	{
		name: 'a list and the files of an item, with the binary data of the item',
		parameters: {
			fieldToSplitOut: 'rows, $binary',
			include: 'allOtherFields',
			options: { includeBinary: true },
		},
	},
	{
		name: 'a list with the binary data of the item',
		parameters: { fieldToSplitOut: 'tags', options: { includeBinary: true } },
	},
	{
		name: 'a list of objects with the binary data of the item',
		parameters: {
			fieldToSplitOut: 'rows',
			include: 'allOtherFields',
			options: { includeBinary: true },
		},
	},
	{
		name: 'a list without the binary data of the item',
		parameters: { fieldToSplitOut: 'tags', include: 'allOtherFields', options: {} },
	},
	{
		name: 'a list with selected fields, without the binary data of the item',
		parameters: {
			fieldToSplitOut: 'rows',
			include: 'selectedOtherFields',
			fieldsToInclude: 'id, tags',
			options: { includeBinary: false },
		},
	},
];

function workflow(c: Case) {
	return {
		name: 'Split out binary',
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
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [400, 0],
				parameters: c.parameters,
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** The rows with the name and the type of each file: the runtime adds the sizes of a file. */
function files(items: unknown): unknown {
	if (!Array.isArray(items)) return items;
	return items.map((item: Record<string, unknown>) => {
		const binary = item.$binary as Record<string, Record<string, unknown>> | undefined;
		if (binary === undefined) return item;
		const names = Object.fromEntries(
			Object.entries(binary).map(([key, file]) => [key, `${file.fileName} ${file.mimeType}`]),
		);
		return { ...item, $binary: names };
	});
}

describe('Split Out and binary data', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		const wf = workflow(c);
		const v1 = await runOracle(wf, {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 20_000,
			withBinary: true,
		});
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
		const traced = (out.trace ?? []).find((t) => t.step === 'Split')?.items;
		expect(files(traced)).toEqual(files(v1.nodes.Split?.[0]));
	});
});
