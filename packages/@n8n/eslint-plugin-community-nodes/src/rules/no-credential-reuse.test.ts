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
	credentials: (string | { name: string; required?: boolean })[] = [],
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

	mockReadFileSync.mockImplementation((path: any): string => {
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
			code: createNodeCode([
				{ name: 'ExternalApi1', required: true },
				{ name: 'ExternalApi2', required: false },
			]),
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
