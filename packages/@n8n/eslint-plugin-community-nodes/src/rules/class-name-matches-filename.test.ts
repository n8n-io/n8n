import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { ClassNameMatchesFilenameRule, findExportedNames } from './class-name-matches-filename.js';

const fixturesDir = mkdtempSync(join(tmpdir(), 'n8n-class-name-matches-filename-'));

afterAll(() => {
	rmSync(fixturesDir, { recursive: true, force: true });
});

let packageCount = 0;

/**
 * Writes a package with the given files to disk and returns the path and
 * content of its package.json, since the rule reads the registered files from disk.
 */
function createPackage(
	n8n: { nodes?: string[]; credentials?: string[] },
	files: Record<string, string>,
): { filename: string; code: string } {
	const packageDir = join(fixturesDir, `package-${++packageCount}`);
	mkdirSync(packageDir, { recursive: true });
	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = join(packageDir, relativePath);
		mkdirSync(dirname(filePath), { recursive: true });
		writeFileSync(filePath, content);
	}

	const code = JSON.stringify({ name: 'n8n-nodes-example', n8n });
	const filename = join(packageDir, 'package.json');
	writeFileSync(filename, code);
	return { filename, code };
}

/** What `tsc` emits for `export class <name> {}` with CommonJS output. */
const compiledClass = (name: string) =>
	`"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.${name} = void 0;\nclass ${name} {}\nexports.${name} = ${name};\n`;

const ruleTester = new RuleTester();

ruleTester.run('class-name-matches-filename', ClassNameMatchesFilenameRule, {
	valid: [
		{
			name: 'compiled node and credential export classes named after their files',
			...createPackage(
				{
					nodes: ['dist/nodes/Foo/Foo.node.js'],
					credentials: ['dist/credentials/FooApi.credentials.js'],
				},
				{
					'dist/nodes/Foo/Foo.node.js': compiledClass('Foo'),
					'dist/credentials/FooApi.credentials.js': compiledClass('FooApi'),
				},
			),
		},
		{
			name: 'TypeScript source is checked when the package has not been built',
			...createPackage(
				{ nodes: ['dist/nodes/Foo/Foo.node.js'] },
				{ 'nodes/Foo/Foo.node.ts': 'export class Foo {}' },
			),
		},
		{
			name: 'export through a module.exports object',
			...createPackage(
				{ nodes: ['dist/nodes/Foo/Foo.node.js'] },
				{ 'dist/nodes/Foo/Foo.node.js': 'module.exports = { Foo: class {} };' },
			),
		},
		{
			name: 'export through Object.defineProperty',
			...createPackage(
				{ nodes: ['dist/nodes/Foo/Foo.node.js'] },
				{
					'dist/nodes/Foo/Foo.node.js':
						'Object.defineProperty(exports, "Foo", { enumerable: true, get: function () { return impl.Foo; } });',
				},
			),
		},
		{
			name: 'registered file that does not exist is left to other rules',
			...createPackage({ nodes: ['dist/nodes/Missing/Missing.node.js'] }, {}),
		},
		{
			name: 'file without recognisable exports is not reported',
			...createPackage(
				{ nodes: ['dist/nodes/Foo/Foo.node.js'] },
				{ 'dist/nodes/Foo/Foo.node.js': 'module.exports = createNode();' },
			),
		},
		{
			name: 'non-package.json file is ignored',
			filename: join(fixturesDir, 'some-config.json'),
			code: '{ "name": "n8n-nodes-example" }',
		},
	],
	invalid: [
		{
			// The loader looks for `Crm`
			name: 'compiled node exports a differently cased class',
			...createPackage(
				{ nodes: ['dist/nodes/CRM/Crm.node.js'] },
				{ 'dist/nodes/CRM/Crm.node.js': compiledClass('CRM') },
			),
			errors: [
				{
					messageId: 'classNameMismatch',
					data: {
						registeredPath: 'dist/nodes/CRM/Crm.node.js',
						expected: 'Crm',
						exported: '"CRM"',
					},
				},
			],
		},
		{
			// The loader looks for `acmeboard`
			name: 'compiled credential exports a class with a different name',
			...createPackage(
				{ credentials: ['dist/credentials/acmeboard.credentials.js'] },
				{ 'dist/credentials/acmeboard.credentials.js': compiledClass('AcmeBoard') },
			),
			errors: [
				{
					messageId: 'classNameMismatch',
					data: {
						registeredPath: 'dist/credentials/acmeboard.credentials.js',
						expected: 'acmeboard',
						exported: '"AcmeBoard"',
					},
				},
			],
		},
		{
			// The loader looks for `WidgetsyncTrigger`
			name: 'only the mismatching file of a package is reported',
			...createPackage(
				{
					nodes: [
						'dist/nodes/WidgetSync/Widgetsync.node.js',
						'dist/nodes/WidgetSync/WidgetsyncTrigger.node.js',
					],
				},
				{
					'dist/nodes/WidgetSync/Widgetsync.node.js': compiledClass('Widgetsync'),
					'dist/nodes/WidgetSync/WidgetsyncTrigger.node.js': compiledClass('WidgetSyncTrigger'),
				},
			),
			errors: [
				{
					messageId: 'classNameMismatch',
					data: {
						registeredPath: 'dist/nodes/WidgetSync/WidgetsyncTrigger.node.js',
						expected: 'WidgetsyncTrigger',
						exported: '"WidgetSyncTrigger"',
					},
				},
			],
		},
		{
			name: 'TypeScript source exports a differently named class',
			...createPackage(
				{ nodes: ['dist/nodes/Bar/Bar.node.js'] },
				{ 'nodes/Bar/Bar.node.ts': 'export class BarNode {}' },
			),
			errors: [
				{
					messageId: 'classNameMismatch',
					data: {
						registeredPath: 'dist/nodes/Bar/Bar.node.js',
						expected: 'Bar',
						exported: '"BarNode"',
					},
				},
			],
		},
	],
});

describe('findExportedNames', () => {
	function namesOf(content: string): string[] {
		const filePath = join(fixturesDir, `exports-${++packageCount}.js`);
		writeFileSync(filePath, content);
		return [...findExportedNames(filePath)];
	}

	it('reads ES module exports', () => {
		expect(
			namesOf('export class A {}\nexport const B = 1;\nconst c = 2;\nexport { c as C };'),
		).toEqual(['A', 'B', 'C']);
	});

	it('reads chained CommonJS declarations emitted by tsc', () => {
		expect(namesOf('exports.A = exports.B = void 0;')).toEqual(['A', 'B']);
	});

	it('reads module.exports assignments', () => {
		expect(namesOf('module.exports.A = 1;\nmodule.exports = { B: 1, "C": 2 };')).toEqual([
			'A',
			'B',
			'C',
		]);
	});

	it('ignores the __esModule marker tsc adds to every module', () => {
		expect(namesOf(compiledClass('A'))).toEqual(['A']);
	});

	it('returns no names for a file that cannot be parsed', () => {
		expect(namesOf('class {')).toEqual([]);
	});
});
