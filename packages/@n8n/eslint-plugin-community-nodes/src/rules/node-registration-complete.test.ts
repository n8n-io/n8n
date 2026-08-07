import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterEach, vi } from 'vitest';

import { NodeRegistrationCompleteRule } from './node-registration-complete.js';
import * as fileUtils from '../utils/file-utils.js';

vi.mock('../utils/file-utils.js', async () => {
	const actual = await vi.importActual('../utils/file-utils.js');
	return {
		...actual,
		findNodeSourceFilesOnDisk: vi.fn(),
		readPackageJsonNodes: vi.fn(),
	};
});

const mockFindNodeSourceFilesOnDisk = vi.mocked(fileUtils.findNodeSourceFilesOnDisk);
const mockReadPackageJsonNodes = vi.mocked(fileUtils.readPackageJsonNodes);

const packageJsonPath = '/tmp/package.json';
const fooNode = '/tmp/nodes/Foo/Foo.node.ts';
const barNode = '/tmp/nodes/Bar/Bar.node.ts';

const ruleTester = new RuleTester();

function setup(onDisk: string[], registered: string[]): void {
	mockFindNodeSourceFilesOnDisk.mockReturnValue(onDisk);
	mockReadPackageJsonNodes.mockReturnValue(registered);
}

afterEach(() => {
	vi.clearAllMocks();
});

// Default: both node files exist on disk and both are registered.
setup([fooNode, barNode], [fooNode, barNode]);

ruleTester.run('node-registration-complete', NodeRegistrationCompleteRule, {
	valid: [
		{
			name: 'all node files are registered',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/Foo/Foo.node.js", "dist/nodes/Bar/Bar.node.js"] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "name": "n8n-nodes-example" }',
		},
	],
	invalid: [
		{
			name: 'one node file is not registered',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/Foo/Foo.node.js"] } }',
			before() {
				setup([fooNode, barNode], [fooNode]);
			},
			errors: [
				{
					messageId: 'nodeNotRegistered',
					data: { nodeFile: 'nodes/Bar/Bar.node.ts' },
				},
			],
		},
		{
			name: 'multiple node files are not registered',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": [] } }',
			before() {
				setup([fooNode, barNode], []);
			},
			errors: [
				{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Foo/Foo.node.ts' } },
				{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Bar/Bar.node.ts' } },
			],
		},
		{
			name: 'node files exist on disk but there is no n8n object',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup([fooNode], []);
			},
			errors: [{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Foo/Foo.node.ts' } }],
		},
	],
});
