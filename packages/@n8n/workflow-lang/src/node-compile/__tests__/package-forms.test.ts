import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const load = createRequire(join(nodesBase, 'package.json'));
const installed = existsSync(join(nodesBase, 'node_modules/lodash/set.js'));

const ENTRY = '/probe/Probe.node.ts';

function probe(imports: string, expression: string) {
	const source = `${imports}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const text = items[i].json.text;
			returnData.push({ json: { r: ${expression} } });
		}
		return [returnData];
	}
}`;
	return specialiseNode({
		type: 'n8n-nodes-base.probe',
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters: {},
		aliases: {},
		instanceId: null,
	});
}

function workflowSource(texts: unknown[]): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(texts.map((text) => ({ text })))},
		});
	},
});
`;
}

const fixture = { trigger: { body: {}, headers: {}, query: {} }, now: 0, seed: 1, effects: {} };

async function run(imports: string, expression: string, texts: unknown[]) {
	const result = probe(imports, expression);
	expect(result.errors).toEqual([]);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(texts), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflowSource(texts), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

async function values(imports: string, expression: string, texts: unknown[]): Promise<unknown[]> {
	const out = await run(imports, expression, texts);
	expect(out.status).toBe('ok');
	const rows: unknown = out.result;
	return Array.isArray(rows) ? rows.map((row: { r: unknown }) => row.r) : [];
}

function randomOf(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

const SET_IMPORT = "import set from 'lodash/set';";
const PATH_PARTS = [
	'a',
	'b',
	'a',
	'.',
	'.',
	'[',
	']',
	'[0]',
	'[1]',
	'0',
	'1',
	'-',
	'"',
	"'",
	'\\',
	' ',
	'_',
	'["a.b"]',
	"['c d']",
	'[]',
	'[-1]',
	'[1.5]',
	'["x\\"y"]',
	'__proto__',
	'constructor',
	'é',
];
const TARGETS: unknown[] = [
	{},
	{ a: { b: 1, c: { d: 2 } }, b: 5 },
	{ a: [{ b: 1 }, 2], 'a.b': 3, b: null },
	{ a: 'text', '': { '': 1 }, 0: { 1: 2 } },
];

function isDense(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return true;
	if (Array.isArray(value) && Object.keys(value).length !== value.length) return false;
	return Object.values(value).every(isDense);
}

function setCases(count: number): Array<{ target: unknown; path: unknown }> {
	const random = randomOf(7);
	const cases: Array<{ target: unknown; path: unknown }> = [];
	for (let k = 0; k < count; k++) {
		const length = 1 + Math.floor(random() * 6);
		let path = '';
		for (let j = 0; j < length; j++) path += PATH_PARTS[Math.floor(random() * PATH_PARTS.length)];
		cases.push({ target: TARGETS[k % TARGETS.length], path });
	}
	for (const path of ['', 'a', 'a.b', 'a.b.c.d', 'x.y.z', 'a[0].b', 'a[2]', 'x[0][0]', 'a.b.c'])
		for (const target of TARGETS) cases.push({ target, path });
	for (const target of TARGETS) {
		cases.push({ target, path: ['a', 'b'] });
		cases.push({ target, path: ['a.b', 'c'] });
		cases.push({ target, path: [] });
	}
	return cases;
}

describe.skipIf(!installed)('node compiler: lodash set with a path of the run', () => {
	const set: (target: unknown, path: unknown, value: unknown) => unknown = load('lodash/set');
	const expected = (c: { target: unknown; path: unknown }) =>
		set(structuredClone(c.target), c.path, 'v');

	it('gives the object of lodash for each generated path', async () => {
		const cases = setCases(6000).filter((c) => isDense(expected(c)));
		expect(cases.length).toBeGreaterThan(4500);
		const got = await values(SET_IMPORT, "set(text.target, text.path, 'v')", cases);
		expect(got.length).toBe(cases.length);
		cases.forEach((c, k) => {
			expect(got[k], JSON.stringify(c)).toEqual(JSON.parse(JSON.stringify(expected(c))));
		});
	});

	it('gives a value that is not an object as it is', async () => {
		const got = await values(SET_IMPORT, 'set(text.target, text.path, 1)', [
			{ target: null, path: 'a.b' },
			{ target: 5, path: 'a.b' },
			{ target: 'x', path: 'a.b' },
		]);
		expect(got).toEqual([null, 5, 'x']);
	});

	it.each([
		['a member after the next index', { target: { a: [] }, path: 'a[1]' }],
		['a member of a list that is not an index', { target: { a: [1] }, path: 'a.b' }],
		['a path that is a number', { target: {}, path: 5 }],
	])('stops for %s', async (_, text) => {
		const out = await run(SET_IMPORT, "set(text.target, text.path, 'v')", [text]);
		expect(out.status).not.toBe('ok');
		expect(JSON.stringify(out)).toContain('has no compiled form');
	});

	it('keeps the compiled form of a path that is a constant of dotted names', () => {
		const result = probe(SET_IMPORT, "set(text, 'a.b', 1)");
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__setPath');
	});
});

describe.skipIf(!installed)('node compiler: the column functions of the sheet package', () => {
	const XLSX_IMPORT = "import { utils as xlsxUtils } from '@e965/xlsx';";
	const MAX_COLUMN = 18500;
	const LONG_TEST_MS = 120000;

	it(
		'gives the name and the index of the package for each column up to the limit',
		async () => {
			const { utils } = load('@e965/xlsx');
			const indexes = Array.from({ length: MAX_COLUMN + 1 }, (_, k) => k);
			const got = await values(
				XLSX_IMPORT,
				'[xlsxUtils.encode_col(text), xlsxUtils.decode_col(xlsxUtils.encode_col(text))]',
				indexes,
			);
			expect(got).toEqual(indexes.map((k) => [utils.encode_col(k), k]));
			expect(utils.decode_col(utils.encode_col(MAX_COLUMN))).toBe(MAX_COLUMN);
		},
		LONG_TEST_MS,
	);

	it('gives the index of the package for text that is not a column name', async () => {
		const { utils } = load('@e965/xlsx');
		const texts = [
			'',
			'$A',
			'$AB',
			'$a',
			'$',
			'$$A',
			'a',
			'A1',
			'A$',
			' B',
			'é',
			'AAAAAAAAAAAAAAAAAAAA',
		];
		const got = await values(XLSX_IMPORT, 'xlsxUtils.decode_col(text)', texts);
		expect(got).toEqual(texts.map((text) => utils.decode_col(text)));
	});

	it('gives the name of the package for an index that is not a whole number', async () => {
		const { utils } = load('@e965/xlsx');
		const indexes = [0.5, 25.9, 26.1, 1e15, 701.5];
		const got = await values(XLSX_IMPORT, 'xlsxUtils.encode_col(text)', indexes);
		expect(got).toEqual(indexes.map((k) => utils.encode_col(k)));
	});

	it('stops with the error of the package for a negative index', async () => {
		const out = await run(XLSX_IMPORT, 'xlsxUtils.encode_col(text)', [-1]);
		expect(out.status).not.toBe('ok');
		expect(JSON.stringify(out)).toContain('invalid column -1');
	});
});

describe('node compiler: a read of a parameter that is not there, in a try with an empty catch', () => {
	const source = (catchBody: string) => `
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		let kind = 'fallback';
		try {
			kind = this.getNodeParameter('notThere', 0);
		} catch (error) {${catchBody}}
		return [items.map(() => ({ json: { r: kind } }))];
	}
}`;
	const specialise = (text: string) =>
		specialiseNode({
			type: 'n8n-nodes-base.probe',
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? text : undefined),
			parameters: {},
			aliases: {},
			instanceId: null,
		});

	it('keeps the value from before the try', async () => {
		const result = specialise(source(''));
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__missing(');
		const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
		const out = await runReference(workflowSource(['a']), fixture, { nodes });
		expect(out.status).toBe('ok');
		expect(out.result).toEqual([{ r: 'fallback' }]);
	});

	it('keeps the try when the catch has code', () => {
		const result = specialise(source(" kind = 'caught'; "));
		expect(result.source ?? '').toContain('__missing(');
	});
});
