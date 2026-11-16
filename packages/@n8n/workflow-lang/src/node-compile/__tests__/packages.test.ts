import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const changeCasePath = join(nodesBase, 'node_modules/change-case/dist/index.js');

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

const CASE_FUNCTIONS = [
	'noCase',
	'snakeCase',
	'kebabCase',
	'dotCase',
	'pathCase',
	'constantCase',
	'capitalCase',
	'trainCase',
	'pascalSnakeCase',
	'sentenceCase',
	'camelCase',
	'pascalCase',
];

const TRICKY = [
	'',
	' ',
	'A',
	'aB',
	'ID',
	'ABC',
	'ABCdef',
	'fooBar',
	'FooBar',
	'FOO_BAR',
	'foo_bar',
	'foo-bar',
	'XMLHttpRequest',
	'userID',
	'UserIDs',
	'iPhone7Plus',
	'HTML5 parser',
	'V8Engine',
	'testV2',
	'TEST_v2_A1',
	'version 1.2.10',
	'foo2bar',
	'Foo2Bar',
	'2fooBar',
	'a1B2c3',
	'123',
	'1 2 3',
	'emailAddress1',
	'__private__',
	'dot.case/path-case',
	'  leading and trailing  ',
	'tab\tnew\nline',
	'x\u0000y',
	"it's a (test)!",
	'first_name',
	'Last Modified By',
	'createdAt',
	'sys_created_on',
	'AWSRegion2Name',
	'aBcDeFgH',
	'A1A',
	'a1A1a',
	'AAa',
	'aAA',
	'AA1a',
	'$$price%',
];

function generated(): string[] {
	const alphabet = ['a', 'b', 'B', 'C', '1', '_'];
	let level = [''];
	const all: string[] = [];
	for (let length = 1; length <= 4; length++) {
		level = level.flatMap((prefix) => alphabet.map((c) => prefix + c));
		all.push(...level);
	}
	return all;
}

describe.runIf(existsSync(changeCasePath))('node compiler: change-case', () => {
	const imports = `import { ${CASE_FUNCTIONS.join(', ')} } from 'change-case';`;
	const expression = `[${CASE_FUNCTIONS.map((name) => `${name}(text)`).join(', ')}]`;

	it.each([
		{ label: 'a list of tricky texts', texts: TRICKY },
		{ label: 'all short texts of six characters', texts: generated() },
	])('gives the result of the package for $label', async ({ texts }) => {
		const real: Record<string, (input: string) => string> = await import(
			pathToFileURL(changeCasePath).href
		);
		const expected = texts.map((text) => CASE_FUNCTIONS.map((name) => real[name](text)));
		expect(await values(imports, expression, texts)).toEqual(expected);
	});

	it.each([
		{ label: 'a letter outside ASCII', text: 'café au lait' },
		{ label: 'a number', text: 12 },
		{ label: 'null', text: null },
	])('stops with an error for $label', async ({ text }) => {
		const out = await run(imports, expression, [text]);
		expect(out.status).toBe('error');
	});

	it('does not compile a call with options', () => {
		const result = probe(
			"import { snakeCase } from 'change-case';",
			"snakeCase(text, { delimiter: '.' })",
		);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
