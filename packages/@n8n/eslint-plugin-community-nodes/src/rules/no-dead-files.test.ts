import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDeadFileName, NoDeadFilesRule } from './no-dead-files.js';
import * as fileUtils from '../utils/file-utils.js';

vi.mock('../utils/file-utils.js', async () => {
	const actual = await vi.importActual('../utils/file-utils.js');
	return {
		...actual,
		findFilesInPackageDirs: vi.fn(),
	};
});

const mockFindFilesInPackageDirs = vi.mocked(fileUtils.findFilesInPackageDirs);

const packageJsonPath = '/tmp/package.json';

const ruleTester = new RuleTester();

function setup(deadFiles: string[]): void {
	mockFindFilesInPackageDirs.mockReturnValue(deadFiles);
}

afterEach(() => {
	vi.clearAllMocks();
});

// Default: no dead files on disk.
setup([]);

ruleTester.run('no-dead-files', NoDeadFilesRule, {
	valid: [
		{
			name: 'package with no dead files',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/Foo/Foo.node.js"] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup(['/tmp/nodes/Foo/Foo.node.ts.bak']);
			},
		},
	],
	invalid: [
		{
			name: 'single backup file is reported',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup(['/tmp/nodes/Foo/Foo.node.ts.bak']);
			},
			errors: [
				{
					messageId: 'deadFileFound',
					data: { file: 'nodes/Foo/Foo.node.ts.bak' },
				},
			],
		},
		{
			name: 'multiple dead files are each reported',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup([
					'/tmp/nodes/Foo/Foo.node.ts.backup',
					'/tmp/nodes/Foo/test.js',
					'/tmp/nodes/Bar/Bar.node.ts:Zone.Identifier',
				]);
			},
			errors: [
				{ messageId: 'deadFileFound', data: { file: 'nodes/Foo/Foo.node.ts.backup' } },
				{ messageId: 'deadFileFound', data: { file: 'nodes/Foo/test.js' } },
				{ messageId: 'deadFileFound', data: { file: 'nodes/Bar/Bar.node.ts:Zone.Identifier' } },
			],
		},
		{
			name: 'stray test.ts file is reported',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup(['/tmp/nodes/test.ts']);
			},
			errors: [{ messageId: 'deadFileFound', data: { file: 'nodes/test.ts' } }],
		},
		{
			name: 'dead file in credentials directory is reported',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup(['/tmp/credentials/MyApi.credentials.ts.bak']);
			},
			errors: [
				{ messageId: 'deadFileFound', data: { file: 'credentials/MyApi.credentials.ts.bak' } },
			],
		},
	],
});

describe('isDeadFileName', () => {
	it.each([
		'Foo.node.ts.backup',
		'notes.backup',
		'Foo.node.ts.bak',
		'archive.bak',
		'Zone.Identifier',
		'Foo.node.ts:Zone.Identifier',
		'test.js',
		'test.ts',
	])('flags %s as a dead file', (fileName) => {
		expect(isDeadFileName(fileName)).toBe(true);
	});

	it.each([
		'Foo.node.ts',
		'Foo.node.js',
		'index.ts',
		'test.json',
		'mytest.js',
		'backup.ts',
		'GenericFunctions.ts',
	])('does not flag %s', (fileName) => {
		expect(isDeadFileName(fileName)).toBe(false);
	});
});
