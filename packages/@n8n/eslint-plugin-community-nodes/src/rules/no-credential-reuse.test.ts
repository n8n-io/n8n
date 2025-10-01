import { RuleTester } from '@typescript-eslint/rule-tester';
import * as fs from 'node:fs';
import { vi } from 'vitest';

import { NoCredentialReuseRule } from './no-credential-reuse.js';

const ruleTester = new RuleTester();

// Mock fs functions
vi.mock('node:fs', () => ({
	readFileSync: vi.fn(),
	existsSync: vi.fn(),
}));

const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockExistsSync = vi.mocked(fs.existsSync);

const nodeFilePath = '/tmp/TestNode.node.ts';

function createCredentialClass(name: string, displayName: string): string {
	return `
		import type { ICredentialType, INodeProperties } from 'n8n-workflow';

		export class ${name.charAt(0).toUpperCase() + name.slice(1)} implements ICredentialType {
			name = '${name}';
			displayName = '${displayName}';
			properties: INodeProperties[] = [];
		}
	`;
}

function createNodeCode(
	credentials: Array<string | { name: string; required?: boolean }> = [],
): string {
	const credentialsArray =
		credentials.length > 0
			? credentials
					.map((cred) => {
						if (typeof cred === 'string') {
							return `'${cred}'`;
						} else {
							const required =
								cred.required !== undefined ? `,\n\t\t\t\trequired: ${cred.required}` : '';
							return `{\n\t\t\t\tname: '${cred.name}'${required},\n\t\t\t}`;
						}
					})
					.join(',\n\t\t\t')
			: '';

	const credentialsProperty =
		credentials.length > 0 ? `credentials: [\n\t\t\t${credentialsArray}\n\t\t],` : '';

	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['output'],
		version: 1,
		inputs: ['main'],
		outputs: ['main'],
		${credentialsProperty}
		properties: [],
	};
}`;
}

// Helper function to create expected outputs with double quotes (matching rule fix behavior)
function createExpectedNodeCode(
	credentials: Array<string | { name: string; required?: boolean }> = [],
): string {
	const credentialsArray =
		credentials.length > 0
			? credentials
					.map((cred) => {
						if (typeof cred === 'string') {
							return `"${cred}"`;
						} else {
							const required =
								cred.required !== undefined ? `,\n\t\t\t\trequired: ${cred.required}` : '';
							return `{\n\t\t\t\tname: "${cred.name}"${required},\n\t\t\t}`;
						}
					})
					.join(',\n\t\t\t')
			: '';

	const credentialsProperty =
		credentials.length > 0 ? `credentials: [\n\t\t\t${credentialsArray}\n\t\t],` : '';

	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['output'],
		version: 1,
		inputs: ['main'],
		outputs: ['main'],
		${credentialsProperty}
		properties: [],
	};
}`;
}

// Helper function to create non-node class
function createNonNodeClass(): string {
	return `
export class RegularClass {
	credentials = [
		{ name: 'ExternalApi', required: true }
	];
}`;
}

// Helper function to create non-INodeType class
function createNonINodeTypeClass(): string {
	return `
export class NotANode {
	description = {
		displayName: 'Not A Node',
		credentials: [
			{ name: 'ExternalApi', required: true }
		]
	};
}`;
}

function setupMockFileSystem() {
	const packageJson = {
		name: 'test-package',
		n8n: {
			credentials: [
				'dist/credentials/MyApi.credentials.js',
				'dist/credentials/AnotherApi.credentials.js',
			],
		},
	};

	const myApiCredential = createCredentialClass('myApiCredential', 'My API');
	const anotherApiCredential = createCredentialClass('anotherApiCredential', 'Another API');

	mockExistsSync.mockImplementation((path: fs.PathLike) => {
		const pathStr = path.toString();
		return (
			pathStr.includes('package.json') ||
			pathStr.includes('MyApi.credentials.ts') ||
			pathStr.includes('AnotherApi.credentials.ts')
		);
	});

	mockReadFileSync.mockImplementation((path: string | Buffer | URL | number): string => {
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
			code: createNodeCode([{ name: 'myApiCredential', required: true }]),
		},
		{
			name: 'node using allowed credential (string form) from same package',
			filename: nodeFilePath,
			code: createNodeCode(['myApiCredential']),
		},
		{
			name: 'node using multiple allowed credentials (mixed forms)',
			filename: nodeFilePath,
			code: createNodeCode(['myApiCredential', { name: 'anotherApiCredential', required: false }]),
		},
		{
			name: 'node without credentials array',
			filename: nodeFilePath,
			code: createNodeCode(),
		},
		{
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: createNonNodeClass(),
		},
		{
			name: 'non-INodeType class ignored',
			filename: nodeFilePath,
			code: createNonINodeTypeClass(),
		},
	],
	invalid: [
		{
			name: 'SECURITY: node using credential not in package (object form)',
			filename: nodeFilePath,
			code: createNodeCode([{ name: 'ExternalApi', required: true }]),
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: createExpectedNodeCode([{ name: 'myApiCredential', required: true }]),
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: createExpectedNodeCode([{ name: 'anotherApiCredential', required: true }]),
						},
					],
				},
			],
		},
		{
			name: 'SECURITY: node using credential not in package (string form)',
			filename: nodeFilePath,
			code: createNodeCode(['ExternalApi']),
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: createExpectedNodeCode(['myApiCredential']),
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: createExpectedNodeCode(['anotherApiCredential']),
						},
					],
				},
			],
		},
		{
			name: 'SECURITY: node using mix of allowed and disallowed credentials (mixed forms)',
			filename: nodeFilePath,
			code: createNodeCode([
				'myApiCredential',
				{ name: 'ExternalApi', required: true },
				'AnotherExternalApi',
			]),
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: `
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
				name: "myApiCredential",
				required: true,
			},
			'AnotherExternalApi'
		],
		properties: [],
	};
}`,
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: `
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
				name: "anotherApiCredential",
				required: true,
			},
			'AnotherExternalApi'
		],
		properties: [],
	};
}`,
						},
					],
				},
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'AnotherExternalApi' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: `
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
			"myApiCredential"
		],
		properties: [],
	};
}`,
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: `
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
			"anotherApiCredential"
		],
		properties: [],
	};
}`,
						},
					],
				},
			],
		},
		{
			name: 'node using multiple disallowed credentials',
			filename: nodeFilePath,
			code: createNodeCode([
				{ name: 'ExternalApi1', required: true },
				{ name: 'ExternalApi2', required: false },
			]),
			errors: [
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi1' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: `
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
				name: "myApiCredential",
				required: true,
			},
			{
				name: 'ExternalApi2',
				required: false,
			}
		],
		properties: [],
	};
}`,
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: `
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
				name: "anotherApiCredential",
				required: true,
			},
			{
				name: 'ExternalApi2',
				required: false,
			}
		],
		properties: [],
	};
}`,
						},
					],
				},
				{
					messageId: 'credentialNotInPackage',
					data: { credentialName: 'ExternalApi2' },
					suggestions: [
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'myApiCredential' },
							output: `
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
				name: "myApiCredential",
				required: false,
			}
		],
		properties: [],
	};
}`,
						},
						{
							messageId: 'useAvailable',
							data: { suggestedName: 'anotherApiCredential' },
							output: `
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
				name: "anotherApiCredential",
				required: false,
			}
		],
		properties: [],
	};
}`,
						},
					],
				},
			],
		},
	],
});
