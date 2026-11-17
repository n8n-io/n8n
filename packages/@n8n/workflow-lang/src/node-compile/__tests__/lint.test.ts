import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LintReport } from '../lint.ts';
import { LINT_NOTE, runLintNode } from '../lint.ts';

const DESCRIPTION = `{
		displayName: 'Sample',
		name: 'sample',
		group: ['transform'],
		version: 1,
		description: 'A sample node',
		defaults: { name: 'Sample' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Get', value: 'get' },
					{ name: 'Push', value: 'push' },
				],
				default: 'get',
			},
		],
	}`;

const SOURCE = `import type { IExecuteFunctions } from 'n8n-workflow';

export class Sample {
	description = ${DESCRIPTION};

	async execute(this: IExecuteFunctions) {
		const operation = this.getNodeParameter('operation', 0);
		if (operation === 'get') {
			const response = await this.helpers.httpRequest({
				method: 'GET',
				url: 'https://api.example.test/things',
				json: true,
			});
			return [this.helpers.returnJsonArray(response)];
		}
		const self = this;
		return [self.helpers.returnJsonArray([])];
	}
}
`;

const BUILT = `'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
class Sample {
	constructor() {
		this.description = ${DESCRIPTION};
	}
	async execute() {
		return [[]];
	}
}
exports.Sample = Sample;
`;

describe('wfc lint-node', () => {
	let root: string;
	const run = (...args: string[]) => {
		let out = '';
		let err = '';
		const code = runLintNode(
			args,
			(text) => {
				out += text;
			},
			(text) => {
				err += text;
			},
		);
		return { code, out, err };
	};

	beforeAll(() => {
		root = mkdtempSync(join(tmpdir(), 'wfc-lint-node-'));
		mkdirSync(join(root, 'nodes/Sample'), { recursive: true });
		mkdirSync(join(root, 'dist/nodes/Sample'), { recursive: true });
		writeFileSync(
			join(root, 'package.json'),
			JSON.stringify({
				name: 'n8n-nodes-sample',
				version: '0.1.0',
				n8n: { nodes: ['dist/nodes/Sample/Sample.node.js'], credentials: [] },
			}),
		);
		writeFileSync(join(root, 'nodes/Sample/Sample.node.ts'), SOURCE);
		writeFileSync(join(root, 'dist/nodes/Sample/Sample.node.js'), BUILT);
	});

	afterAll(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it('gives a verdict for each operation of a source file, as data', () => {
		const source = join(root, 'nodes/Sample/Sample.node.ts');
		const { code, out } = run(source, '--json');
		const report: LintReport = JSON.parse(out);
		expect(code).toBe(1);
		expect(report).toMatchObject({ compiled: 1, total: 2, note: LINT_NOTE });
		expect(report.nodes).toHaveLength(1);
		expect(report.nodes[0]).toMatchObject({ type: 'n8n-nodes-sample.sample', version: 1 });
		const [get, push] = report.nodes[0].operations;
		expect(get).toMatchObject({ name: 'get', compiles: true, verified: false, diagnostics: [] });
		expect(push).toMatchObject({ name: 'push', compiles: false });
		expect(push.diagnostics).toHaveLength(1);
		expect(push.diagnostics[0]).toMatchObject({
			code: 'NC010',
			file: source,
			line: SOURCE.split('\n').findIndex((line) => line.includes('const self = this;')) + 1,
			column: 16,
			function: 'execute',
			precision: 'construct',
			decided: true,
		});
	});

	it('prints the verdicts, the location, the remediation and the summary for a built package', () => {
		const { code, out } = run(root);
		expect(code).toBe(1);
		expect(out).toMatch(/^ {2}compiles {10}get$/m);
		expect(out).toMatch(/^ {2}does not compile {2}push {2}NC010$/m);
		expect(out).toMatch(/Sample\.node\.ts:\d+:16 NC010 `this` as a value has no compiled form$/m);
		expect(out).toContain('fix: Do not store or return `this`');
		expect(out).toContain('operations (1): push');
		expect(out).toContain('1 of 2 operations compile.');
		expect(out).toContain('It does not mean "proven equal to v1"');
	});

	it('checks one operation and exits with 0 when it compiles', () => {
		const { code, out } = run(root, '--operation', 'get');
		expect(code).toBe(0);
		expect(out).toContain('1 of 1 operations compile.');
		expect(out).not.toMatch(/^ {2}does not compile/m);
	});

	it('exits with 2 for an operation or a path that is not there', () => {
		expect(run(root, '--operation', 'missing')).toMatchObject({ code: 2, out: '' });
		expect(run(join(root, 'nothing.node.ts')).code).toBe(2);
		expect(run().code).toBe(2);
	});
});
