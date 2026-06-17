import { RuleTester } from '@typescript-eslint/rule-tester';
import { vi } from 'vitest';

import { NoCredentialReuseRule } from './no-credential-reuse.js';
import * as fileUtils from '../utils/file-utils.js';

vi.mock('../utils/file-utils.js', async () => {
	const actual = await vi.importActual('../utils/file-utils.js');
	return {
		...actual,
		readPackageJsonCredentials: vi.fn(),
		findPackageJson: vi.fn(),
	};
});

const mockReadPackageJsonCredentials = vi.mocked(fileUtils.readPackageJsonCredentials);
const mockFindPackageJson = vi.mocked(fileUtils.findPackageJson);

const ruleTester = new RuleTester();

const nodeFilePath = '/tmp/TestNode.node.ts';

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
	mockFindPackageJson.mockReturnValue('/tmp/package.json');
	mockReadPackageJsonCredentials.mockReturnValue(
		new Set(['myApiCredential', 'anotherApiCredential']),
	);
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
