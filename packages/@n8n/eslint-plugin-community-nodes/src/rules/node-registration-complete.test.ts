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

// Versioned node: the v1/v2 implementations sit behind a `VersionedNodeType`
// entry file, and only that entry file is listed in `n8n.nodes`.
const versionedEntryNode = '/tmp/nodes/SoterGuard/SoterGuard.node.ts';
const versionedV1Node = '/tmp/nodes/SoterGuard/v1/SoterGuardV1.node.ts';
const versionedV2Node = '/tmp/nodes/SoterGuard/v2/SoterGuardV2.node.ts';

// A sibling node file in the same directory as a registered node (not nested in a
// version subdirectory) is not a versioned implementation and must still be flagged.
const fooSiblingNode = '/tmp/nodes/Foo/FooExtra.node.ts';

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
		{
			// A versioned node registers only its `VersionedNodeType` entry file in
			// `n8n.nodes`; the per-version implementation files (v1/v2) are pulled in
			// by that entry file and must not be flagged as unregistered.
			name: 'versioned node registered via its entry file does not flag its version implementations',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"] } }',
			before() {
				setup([versionedEntryNode, versionedV1Node, versionedV2Node], [versionedEntryNode]);
			},
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
			// The unregistered file sits directly beside a registered node, not in a
			// version subdirectory, so it is not covered by the versioned-node entry
			// and must still be reported.
			name: 'unregistered sibling in a registered node directory is still flagged',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/Foo/Foo.node.js"] } }',
			before() {
				setup([fooNode, fooSiblingNode], [fooNode]);
			},
			errors: [
				{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Foo/FooExtra.node.ts' } },
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
