import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeFilenameAgainstConventionRule } from './node-filename-against-convention.js';

const ruleTester = new RuleTester();

function createNodeCode(name: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: '${name}',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: [],
		properties: [],
	};
}`;
}

function createNodeCodeWithoutName(): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: [],
		properties: [],
	};
}`;
}

function createRegularClass(): string {
	return `
export class SomeHelper {
	name = 'github';
}`;
}

ruleTester.run('node-filename-against-convention', NodeFilenameAgainstConventionRule, {
	valid: [
		{
			name: 'filename matches PascalCased description.name',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('github'),
		},
		{
			name: 'filename with version suffix is accepted',
			filename: '/tmp/GithubV2.node.ts',
			code: createNodeCode('github'),
		},
		{
			name: 'filename with multi-digit version suffix is accepted',
			filename: '/tmp/GithubV10.node.ts',
			code: createNodeCode('github'),
		},
		{
			name: 'multi-word camelCase name maps to PascalCase filename',
			filename: '/tmp/GoogleSheets.node.ts',
			code: createNodeCode('googleSheets'),
		},
		{
			name: 'class not implementing INodeType is ignored',
			filename: '/tmp/Github.node.ts',
			code: createRegularClass(),
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: '/tmp/Github.ts',
			code: createNodeCode('mismatch'),
		},
		{
			name: 'missing description.name is ignored',
			filename: '/tmp/Github.node.ts',
			code: createNodeCodeWithoutName(),
		},
	],
	invalid: [
		{
			name: 'filename does not match description.name',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('gitlab'),
			errors: [{ messageId: 'renameFile', data: { expected: 'Gitlab.node.ts' } }],
		},
		{
			name: 'filename is lowercased',
			filename: '/tmp/github.node.ts',
			code: createNodeCode('github'),
			errors: [{ messageId: 'renameFile', data: { expected: 'Github.node.ts' } }],
		},
		{
			name: 'filename has wrong internal casing',
			filename: '/tmp/GitHub.node.ts',
			code: createNodeCode('github'),
			errors: [{ messageId: 'renameFile', data: { expected: 'Github.node.ts' } }],
		},
		{
			name: 'version suffix does not excuse a mismatched base name',
			filename: '/tmp/GitlabV2.node.ts',
			code: createNodeCode('github'),
			errors: [{ messageId: 'renameFile', data: { expected: 'Github.node.ts' } }],
		},
	],
});
