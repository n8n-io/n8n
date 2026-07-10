import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeClassDescriptionNameCamelCaseRule } from './node-class-description-name-camelcase.js';

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
	name = 'My Helper';
}`;
}

ruleTester.run('node-class-description-name-camelcase', NodeClassDescriptionNameCamelCaseRule, {
	valid: [
		{
			name: 'single lowercase word',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('github'),
		},
		{
			name: 'camelCase multi-word name',
			filename: '/tmp/GoogleSheets.node.ts',
			code: createNodeCode('googleSheets'),
		},
		{
			name: 'camelCase name with digits',
			filename: '/tmp/Oauth2.node.ts',
			code: createNodeCode('myNode2'),
		},
		{
			name: 'class not implementing INodeType is ignored',
			filename: '/tmp/Github.node.ts',
			code: createRegularClass(),
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: '/tmp/Github.ts',
			code: createNodeCode('My Node'),
		},
		{
			name: 'missing description.name is ignored',
			filename: '/tmp/Github.node.ts',
			code: createNodeCodeWithoutName(),
		},
	],
	invalid: [
		{
			name: 'PascalCase first letter is lowercased',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('MyNode'),
			errors: [{ messageId: 'notCamelCase', data: { value: 'MyNode' } }],
			output: createNodeCode('myNode'),
		},
		{
			name: 'spaces are removed and camelCased',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('My Node'),
			errors: [{ messageId: 'notCamelCase', data: { value: 'My Node' } }],
			output: createNodeCode('myNode'),
		},
		{
			name: 'hyphen separators are removed and camelCased',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('my-node'),
			errors: [{ messageId: 'notCamelCase', data: { value: 'my-node' } }],
			output: createNodeCode('myNode'),
		},
		{
			name: 'underscore separators are removed and camelCased',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('my_cool_node'),
			errors: [{ messageId: 'notCamelCase', data: { value: 'my_cool_node' } }],
			output: createNodeCode('myCoolNode'),
		},
		{
			name: 'names starting with a digit are reported without an autofix',
			filename: '/tmp/Github.node.ts',
			code: createNodeCode('123node'),
			errors: [{ messageId: 'notCamelCase', data: { value: '123node' } }],
			output: null,
		},
	],
});
