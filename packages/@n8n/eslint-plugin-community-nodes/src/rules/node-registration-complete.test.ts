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
		findVersionedNodeImplementations: vi.fn(),
	};
});

const mockFindNodeSourceFilesOnDisk = vi.mocked(fileUtils.findNodeSourceFilesOnDisk);
const mockReadPackageJsonNodes = vi.mocked(fileUtils.readPackageJsonNodes);
const mockFindVersionedNodeImplementations = vi.mocked(fileUtils.findVersionedNodeImplementations);

const packageJsonPath = '/tmp/package.json';
const fooNode = '/tmp/nodes/Foo/Foo.node.ts';
const barNode = '/tmp/nodes/Bar/Bar.node.ts';
const soterGuardEntry = '/tmp/nodes/SoterGuard/SoterGuard.node.ts';
const soterGuardV1 = '/tmp/nodes/SoterGuard/v1/SoterGuardV1.node.ts';
const soterGuardV2 = '/tmp/nodes/SoterGuard/v2/SoterGuardV2.node.ts';

const ruleTester = new RuleTester();

function setup(onDisk: string[], registered: string[], versioned: string[] = []): void {
	mockFindNodeSourceFilesOnDisk.mockReturnValue(onDisk);
	mockReadPackageJsonNodes.mockReturnValue(registered);
	mockFindVersionedNodeImplementations.mockReturnValue(versioned);
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
			name: 'per-version implementation files of a registered VersionedNodeType entry are not required in n8n.nodes',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"] } }',
			before() {
				setup(
					[soterGuardEntry, soterGuardV1, soterGuardV2],
					[soterGuardEntry],
					[soterGuardV1, soterGuardV2],
				);
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
			name: 'node files exist on disk but there is no n8n object',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example" }',
			before() {
				setup([fooNode], []);
			},
			errors: [{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Foo/Foo.node.ts' } }],
		},
		{
			name: 'version implementation files whose entry is not a registered VersionedNodeType still warn',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"] } }',
			before() {
				// Entry is registered but not a VersionedNodeType, so no implementations are whitelisted.
				setup([soterGuardEntry, soterGuardV1], [soterGuardEntry], []);
			},
			errors: [
				{
					messageId: 'nodeNotRegistered',
					data: { nodeFile: 'nodes/SoterGuard/v1/SoterGuardV1.node.ts' },
				},
			],
		},
	],
});
