import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterEach, vi } from 'vitest';

import { NodeRegistrationCompleteRule } from './node-registration-complete.js';
import * as fileUtils from '../utils/file-utils.js';

vi.mock('../utils/file-utils.js', async () => {
	const actual = await vi.importActual('../utils/file-utils.js');
	return {
		...actual,
		findNodeSourceFilesOnDisk: vi.fn(),
		findVersionedNodeImplementationFiles: vi.fn(),
		readPackageJsonNodes: vi.fn(),
	};
});

const mockFindNodeSourceFilesOnDisk = vi.mocked(fileUtils.findNodeSourceFilesOnDisk);
const mockFindVersionedNodeImplementationFiles = vi.mocked(
	fileUtils.findVersionedNodeImplementationFiles,
);
const mockReadPackageJsonNodes = vi.mocked(fileUtils.readPackageJsonNodes);

const packageJsonPath = '/tmp/package.json';
const fooNode = '/tmp/nodes/Foo/Foo.node.ts';
const barNode = '/tmp/nodes/Bar/Bar.node.ts';
const versionedEntry = '/tmp/nodes/SoterGuard/SoterGuard.node.ts';
const versionedV1 = '/tmp/nodes/SoterGuard/v1/SoterGuardV1.node.ts';
const versionedV2 = '/tmp/nodes/SoterGuard/v2/SoterGuardV2.node.ts';

const ruleTester = new RuleTester();

function setup(onDisk: string[], registered: string[], versionedImpls: string[] = []): void {
	mockFindNodeSourceFilesOnDisk.mockReturnValue(onDisk);
	mockReadPackageJsonNodes.mockReturnValue(registered);
	mockFindVersionedNodeImplementationFiles.mockReturnValue(versionedImpls);
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
			name: 'versioned node implementation files are exempted via the registered entry class',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"] } }',
			before() {
				// v1/v2 exist on disk but are only imported by the registered entry class.
				setup(
					[versionedEntry, versionedV1, versionedV2],
					[versionedEntry],
					[versionedV1, versionedV2],
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
			name: 'unrelated unregistered files are still flagged alongside exempted versioned implementations',
			filename: packageJsonPath,
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"] } }',
			before() {
				// The versioned entry exempts its v1/v2 imports, but Foo is genuinely unregistered.
				setup(
					[versionedEntry, versionedV1, versionedV2, fooNode],
					[versionedEntry],
					[versionedV1, versionedV2],
				);
			},
			errors: [{ messageId: 'nodeNotRegistered', data: { nodeFile: 'nodes/Foo/Foo.node.ts' } }],
		},
	],
});
