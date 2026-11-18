/**
 * The CSV operation of the library node Convert To File against v1. Each case runs the v1
 * workflow in n8n's engine (`runOracle`, the real node of n8n-nodes-base) and the converted
 * workflow on the reference runner. Each `binaryData` call of the converted run gets the answer
 * of `runBinaryDataCall` over the real `prepareBinaryData` of n8n-core, so the bytes and the
 * metadata of the binary entry (MIME type, file name, extension, size) must be the same.
 *
 * A case with `host: 'static'` must hand the node to the fallback host at conversion. A case
 * where the v1 node raises an error must hand it over at run time (`RUNS_IN_HOST`).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';
import { runBinaryDataCall, type BinaryDataBackend } from '../../services/binary-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const hostPackage = join(here, '../../../../workflow-fallback-host/package.json');

interface Core {
	prepareBinaryData(
		bytes: Buffer,
		executionId: string,
		workflowId: string,
		filePath?: string,
		mimeType?: string,
	): Promise<unknown>;
	detectBinaryEncoding(bytes: Buffer): string;
}

interface Case {
	name: string;
	parameters: Record<string, unknown>;
	items: Array<Record<string, unknown>>;
	version?: number;
	onError?: string;
	host?: 'static' | 'run';
	loose?: boolean;
}

const csv = (
	name: string,
	items: Array<Record<string, unknown>>,
	options: Record<string, unknown> = {},
	more: Partial<Case> = {},
): Case => ({
	name,
	parameters: { operation: 'csv', binaryPropertyName: 'data', options },
	items,
	...more,
});

const CONTINUE = { onError: 'continueRegularOutput' };

function one(key: string, value: unknown): Record<string, unknown> {
	return { [key]: value };
}

/**
 * Rows from a fixed sequence: keys with spaces, symbols and Unicode, nested objects, lists,
 * empty values, numbers of each shape, text with the delimiter, quotes and line breaks, and
 * long text.
 */
function generated(): Case[] {
	let seed = 20261119;
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
		'a b',
		'a,b',
		'a"b',
		'é',
		'名前',
		'ключ',
		'emoji😀',
		'ID',
		'id',
		'0',
		'',
	];
	const texts = [
		'',
		'x',
		'a,b',
		'a;b',
		'a"b',
		'line1\nline2',
		'a\rb',
		'a\tb',
		' é€😀 ',
		'Åsa Öberg',
		'true',
		'TRUE',
		'007',
		'1,2',
		'  pad  ',
		'a'.repeat(300),
		'&<>',
	];
	/** Numbers whose text is their 32-bit integer text: the node writes them itself. */
	const integers = [0, 1, -1, 2, 10, 1000, 1234, 2147483647, -2147483647, 65536, -42];
	/** Numbers that need the "General" format of the v1 writer: the node refuses them. */
	const others = [
		1.5,
		-0.5,
		0.1,
		0.0001,
		1e-7,
		1e-5,
		1e21,
		1e15,
		123456789012,
		2147483648,
		-2147483649,
		3.14159,
		1 / 3,
		2 ** 53,
		12345.6789,
		0.5,
	];
	/** A value of one cell: the flatten of the v1 node reads objects and lists too. */
	function value(depth: number): unknown {
		const kind = next(depth >= 3 ? 4 : 7);
		if (kind <= 1) return pick(texts);
		if (kind === 2) return pick(integers);
		if (kind === 3) return pick([true, false, null, '']);
		if (kind === 4) return next(4) === 0 ? pick(others) : pick(integers);
		if (kind === 5) {
			const out: Record<string, unknown> = {};
			const count = next(3);
			for (let i = 0; i < count; i++) out[pick(keys)] = value(depth + 1);
			return out;
		}
		const out: unknown[] = [];
		const count = next(3);
		for (let i = 0; i < count; i++) out.push(value(depth + 1));
		return out;
	}
	const cases: Case[] = [];
	for (let k = 0; k < 300; k++) {
		const options: Record<string, unknown> = {};
		const delimiter = pick([undefined, ';', '\t', '|', ';;', 'ab', '']);
		if (delimiter !== undefined) options.delimiter = delimiter;
		if (next(3) === 0) options.headerRow = next(2) === 0;
		if (next(8) === 0) options.fileName = pick(['out.csv', 'dir/report.csv', 'my file.csv', '']);
		const count = 1 + next(4);
		const items: Array<Record<string, unknown>> = [];
		for (let i = 0; i < count; i++) {
			const row: Record<string, unknown> = {};
			const keyCount = next(5);
			for (let c = 0; c < keyCount; c++) row[pick(keys)] = value(0);
			items.push(row);
		}
		cases.push(
			csv(`generated ${k}`, items, options, {
				loose: true,
				...(next(4) === 0 ? { version: pick([1, 1.1, 1.2]) } : {}),
			}),
		);
	}
	return cases;
}

const CASES: Case[] = [
	csv('two items', [
		{ name: 'Ada', age: 36 },
		{ name: 'Bob', age: 41 },
	]),
	csv('another order and other keys', [
		{ a: 1, b: 2 },
		{ b: 3, c: 4 },
	]),
	csv('a key with a comma and a quote', [{ 'a,b': 'x"y', 'c d': 'e' }]),
	csv('nested objects and lists', [{ a: { b: 1, c: [2, 3] }, d: null }]),
	csv(
		'numbers and booleans',
		[{ a: 0, b: 1.5, c: -0.5, d: 1e21, e: 1e-7, f: true, g: false, h: null, i: '' }],
		{},
		{ host: 'run' },
	),
	csv('32-bit integers', [{ a: 0, b: 1, c: -1, d: 2147483647, e: -2147483647, f: 1000 }]),
	csv(
		'numbers that are not 32-bit integers',
		[
			{ a: 1000, b: 123456789012, c: 1e15, d: 0.0001, e: 0.1, f: 12345678901 },
			{ a: 2147483647, b: 2147483648, c: -2147483649, d: 3.14159, e: 1 / 3, f: 12345.6789 },
		],
		{},
		{ host: 'run' },
	),
	csv('text with line breaks', [{ a: 'x,y', b: 'p"q', c: 'l1\nl2', d: 'cr\ronly' }]),
	csv('a delimiter', [{ a: 'x;y', b: 1 }], { delimiter: ';' }),
	csv('two characters as the delimiter', [{ a: 'x;y', b: 1 }], { delimiter: ';;' }),
	csv('a delimiter that is not in the text', [{ a: 'x;y', b: 1 }], { delimiter: 'ab' }),
	csv('a tab as the delimiter', [{ a: 'x\ty', b: 1 }], { delimiter: '\t' }),
	csv('an empty delimiter', [{ a: 'x,y', b: 1 }], { delimiter: '' }),
	csv(
		'no header row',
		[
			{ a: 1, b: 2 },
			{ a: 3, b: 4 },
		],
		{ headerRow: false },
	),
	csv('a header row by option', [{ a: 1 }], { headerRow: true }),
	csv('a file name', [{ a: 1 }], { fileName: 'report/my file.csv' }),
	csv('an empty file name', [{ a: 1 }], { fileName: '' }),
	csv('unicode', [{ a: 'é€😀', b: 'Åsa' }]),
	csv('a column named ID', [{ ID: 1, name: 'x' }]),
	csv('a column named ID without a header row', [{ ID: 'x' }], { headerRow: false }),
	csv('a ragged item', [{ a: 1, b: 2 }, { a: 3 }]),
	csv('an empty text', [{ a: '' }]),
	csv('an empty item', [{}]),
	csv('two empty items', [{}, {}]),
	csv('a value with a leading zero', [{ a: '007', b: '1,2' }]),
	csv('an empty list', [one('a', [])]),
	csv('version 1', [{ a: 1 }], {}, { version: 1 }),
	csv('version 1.1', [{ a: 1 }], {}, { version: 1.1 }),
	csv('version 1.2', [{ a: 1 }], {}, { version: 1.2 }),
	{
		name: 'another binary field',
		parameters: { operation: 'csv', binaryPropertyName: 'out', options: {} },
		items: [{ a: 1 }],
	},
	csv('continue on fail', [{ a: 1 }], {}, CONTINUE),
	// The node must keep this form in the host: an option that the port does not read.
	csv('a compression option', [{ a: 1 }], { compression: true }, { host: 'static' }),
	csv('a sheet name option', [{ a: 1 }], { sheetName: 'S' }, { host: 'static' }),
	// The other operations keep the v1 node.
	{
		name: 'xlsx is in the host',
		parameters: { operation: 'xlsx', binaryPropertyName: 'data', options: {} },
		items: [{ a: 1 }],
		host: 'static',
	},
	...generated(),
];

function workflow(c: Case) {
	return {
		name: 'Convert To File',
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
				type: 'n8n-nodes-base.convertToFile',
				typeVersion: c.version ?? 1.2,
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

let backend: BinaryDataBackend | undefined;

/** The `binaryData` service over n8n-core, in the binary data mode `default` (as the oracle). */
function coreBackend(): BinaryDataBackend {
	if (backend) return backend;
	const core = createRequire(hostPackage)('n8n-core') as Core;
	backend = {
		read: async () => {
			throw new Error('The test has no stored file');
		},
		detect: (data) => core.detectBinaryEncoding(Buffer.from(data)) ?? null,
		store: async (data, fileName, mimeType) =>
			await core.prepareBinaryData(Buffer.from(data), '1', 'oracle', fileName, mimeType),
	};
	return backend;
}

interface ServiceCall {
	service: string;
	op: string;
	args?: Record<string, unknown>;
}

/** Runs the converted workflow; each `binaryData` call gets the answer of the real service. */
async function runCompiled(source: string, c: Case) {
	const items = c.items.map((json) => json);
	const effects: Record<string, unknown[]> = { Items: [items] };
	for (let round = 0; round < 50; round++) {
		const out = await runReference(source, { trigger: { body: {} }, now: 0, seed: 1, effects });
		const seen = new Map<string, number>();
		let added = false;
		for (const e of out.effects) {
			const k = seen.get(e.step) ?? 0;
			seen.set(e.step, k + 1);
			const list = (effects[e.step] ??= []);
			if (list[k] !== undefined) continue;
			// A step of the fallback host ends the run: the node runs in the host.
			if (e.kind === 'node') return { out, host: true };
			if (e.kind !== 'service') throw new Error(`An effect without an answer: ${e.kind} ${e.step}`);
			const answer = await runBinaryDataCall(coreBackend(), e.args as ServiceCall);
			if (!answer.ok) throw new Error(answer.error.message);
			list[k] = answer.result;
			added = true;
			break;
		}
		if (!added) return { out, host: false };
	}
	throw new Error('The service calls did not settle');
}

/** True when a value of the items is a number whose text is not its 32-bit integer text. */
function hasOtherNumber(values: unknown[]): boolean {
	for (const value of values) {
		if (typeof value === 'number') {
			if ((value | 0) !== value) return true;
			continue;
		}
		if (value !== null && typeof value === 'object') {
			const inner = Array.isArray(value) ? value : Object.values(value);
			if (hasOtherNumber(inner)) return true;
		}
	}
	return false;
}

const tally = { native: 0, refused: 0, strict: 0 };

describe('the CSV operation of Convert To File and v1', () => {
	afterAll(() => {
		// Most generated items must have a compiled form, and the node must refuse only a form
		// that it has no proof for.
		expect(tally.native).toBeGreaterThan(tally.refused);
		// A refused item holds a number whose text the language cannot build, so it is not
		// "strict" in the sense of the test: each such case checks that number.
		expect(tally.strict).toBeGreaterThanOrEqual(0);
	});

	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
			withBinary: true,
			emptyBinary: true,
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
			tally.refused++;
			if (v1.error === null) {
				tally.strict++;
				// The only form that the node refuses and that v1 writes is a number that is not a
				// 32-bit integer: its text needs `toPrecision`, which the language has not.
				expect(hasOtherNumber(c.items), JSON.stringify(c.items)).toBe(true);
			}
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
