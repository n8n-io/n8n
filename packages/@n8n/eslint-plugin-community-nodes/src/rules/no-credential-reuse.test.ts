import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoCredentialReuseRule } from './no-credential-reuse.js';
import { vi } from 'vitest';
import * as fs from 'node:fs';

const ruleTester = new RuleTester();

// Mock fs functions
vi.mock('node:fs', () => ({
	readFileSync: vi.fn(),
	existsSync: vi.fn(),
}));

const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockExistsSync = vi.mocked(fs.existsSync);

const nodeFilePath = '/tmp/TestNode.node.ts';

// Setup mock filesystem
function setupMockFileSystem() {
	// Mock package.json content
	const packageJson = {
		name: 'test-package',
		n8n: {
			credentials: [
				'dist/credentials/MyApi.credentials.js',
				'dist/credentials/AnotherApi.credentials.js',
			],
		},
	};

	// Mock credential file contents
	const myApiCredential = `
		import type { ICredentialType, INodeProperties } from 'n8n-workflow';

		export class MyApiCredential implements ICredentialType {
			name = 'myApiCredential';
			displayName = 'My API';
			properties: INodeProperties[] = [];
		}
	`;

	const anotherApiCredential = `
		import type { ICredentialType, INodeProperties } from 'n8n-workflow';

		export class AnotherApiCredential implements ICredentialType {
			name = 'anotherApiCredential';
			displayName = 'Another API';
			properties: INodeProperties[] = [];
		}
	`;

	mockExistsSync.mockImplementation((path: any) => {
		const pathStr = path.toString();
		return (
			pathStr.includes('package.json') ||
			pathStr.includes('MyApi.credentials.ts') ||
			pathStr.includes('AnotherApi.credentials.ts')
		);
	});

	mockReadFileSync.mockImplementation((path: any) => {
		const pathStr = path.toString();
		if (pathStr.includes('package.json')) {
			return JSON.stringify(packageJson, null, 2);
		}
		if (pathStr.includes('MyApi.credentials.ts')) {
			return myApiCredential;
		}
		if (pathStr.includes('AnotherApi.credentials.ts')) {
			return anotherApiCredential;
		}
		throw new Error(`File not found: ${pathStr}`);
	});
}

setupMockFileSystem();

ruleTester.run('no-credential-reuse', NoCredentialReuseRule, {
	valid: [
		{
			name: 'node using allowed credential (object form) from same package',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: [
							{
								name: 'myApiCredential',
								required: true,
							},
						],
						properties: [],
					};
				}
			`,
		},
		{
			name: 'node using allowed credential (string form) from same package',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: ['myApiCredential'],
						properties: [],
					};
				}
			`,
		},
		{
			name: 'node using multiple allowed credentials (mixed forms)',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: [
							'myApiCredential',
							{
								name: 'anotherApiCredential',
								required: false,
							},
						],
						properties: [],
					};
				}
			`,
		},
		{
			name: 'node without credentials array',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [],
					};
				}
			`,
		},
		{
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: `
				export class RegularClass {
					credentials = [
						{ name: 'ExternalApi', required: true }
					];
				}
			`,
		},
		{
			name: 'non-INodeType class ignored',
			filename: nodeFilePath,
			code: `
				export class NotANode {
					description = {
						credentials: [
							{ name: 'ExternalApi', required: true }
						]
					};
				}
			`,
		},
	],
	invalid: [
		{
			name: 'SECURITY: node using credential not in package (object form)',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: [
							{
								name: 'ExternalApi',
								required: true,
							},
						],
						properties: [],
					};
				}
			`,
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
				},
			],
		},
		{
			name: 'SECURITY: node using credential not in package (string form)',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: ['ExternalApi'],
						properties: [],
					};
				}
			`,
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
				},
			],
		},
		{
			name: 'SECURITY: node using mix of allowed and disallowed credentials (mixed forms)',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: [
							'myApiCredential',
							{
								name: 'ExternalApi',
								required: true,
							},
							'AnotherExternalApi',
						],
						properties: [],
					};
				}
			`,
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
				},
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'AnotherExternalApi' },
				},
			],
		},
		{
			name: 'node using multiple disallowed credentials',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						credentials: [
							{
								name: 'ExternalApi1',
								required: true,
							},
							{
								name: 'ExternalApi2',
								required: false,
							},
						],
						properties: [],
					};
				}
			`,
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi1' },
				},
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi2' },
				},
			],
		},
	],
});

// Note: Tests use mocked filesystem instead of real files for better isolation.
