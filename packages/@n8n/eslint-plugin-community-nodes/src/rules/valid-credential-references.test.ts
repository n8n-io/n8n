import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterEach, beforeEach, describe, vi } from 'vitest';

import { ValidCredentialReferencesRule } from './valid-credential-references.js';
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

/** Same as createNodeCode but uses double quotes for the credential name — matches fixer output */
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

function createNonNodeClass(): string {
	return `
export class RegularClass {
	credentials = [
		{ name: 'ExternalApi', required: true }
	];
}`;
}

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

mockFindPackageJson.mockReturnValue('/tmp/package.json');
mockReadPackageJsonCredentials.mockReturnValue(new Set(['myApiCredential', 'oauthApi']));

ruleTester.run('valid-credential-references', ValidCredentialReferencesRule, {
	valid: [
		{
			name: 'node referencing a credential that exists (object form)',
			filename: nodeFilePath,
			code: createNodeCode([{ name: 'myApiCredential', required: true }]),
		},
		{
			name: 'node referencing a credential that exists (string form)',
			filename: nodeFilePath,
			code: createNodeCode(['myApiCredential']),
		},
		{
			name: 'node referencing multiple credentials that all exist',
			filename: nodeFilePath,
			code: createNodeCode(['myApiCredential', { name: 'oauthApi', required: false }]),
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
			name: 'credential name does not exist in package (object form)',
			filename: nodeFilePath,
			code: createNodeCode([{ name: 'brokenReference', required: true }]),
			errors: [
				{
					messageId: 'credentialNotFound',
					data: { credentialName: 'brokenReference' },
				},
			],
		},
		{
			name: 'credential name does not exist in package (string form)',
			filename: nodeFilePath,
			code: createNodeCode(['unknownCredential']),
			errors: [
				{
					messageId: 'credentialNotFound',
					data: { credentialName: 'unknownCredential' },
				},
			],
		},
		{
			name: 'credential name is a typo close to an existing credential — suggestion provided',
			filename: nodeFilePath,
			code: createNodeCode([{ name: 'myApiCredentail', required: true }]),
			errors: [
				{
					messageId: 'credentialNotFound',
					data: { credentialName: 'myApiCredentail' },
					suggestions: [
						{
							messageId: 'didYouMean',
							data: { suggestedName: 'myApiCredential' },
							output: createExpectedNodeCode([{ name: 'myApiCredential', required: true }]),
						},
					],
				},
			],
		},
		{
			name: 'mix of valid and invalid credentials — only invalid reported',
			filename: nodeFilePath,
			code: createNodeCode(['myApiCredential', { name: 'brokenRef', required: true }]),
			errors: [
				{
					messageId: 'credentialNotFound',
					data: { credentialName: 'brokenRef' },
				},
			],
		},
	],
});

describe('valid-credential-references — no package.json found', () => {
	beforeEach(() => {
		mockFindPackageJson.mockReturnValue(null);
	});
	afterEach(() => {
		mockFindPackageJson.mockReturnValue('/tmp/package.json');
	});

	ruleTester.run('valid-credential-references (no package.json)', ValidCredentialReferencesRule, {
		valid: [
			{
				name: 'check is skipped when package.json cannot be found',
				filename: nodeFilePath,
				code: createNodeCode([{ name: 'anyCredential', required: true }]),
			},
		],
		invalid: [],
	});
});
