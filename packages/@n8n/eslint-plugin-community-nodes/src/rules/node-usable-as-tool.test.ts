import { RuleTester } from '@typescript-eslint/rule-tester';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';

const ruleTester = new RuleTester();

function createNodeCode(
	usableAsTool?: boolean | 'missing',
	hasDescription: boolean = true,
): string {
	let usableAsToolProperty = '';
	if (usableAsTool === true) {
		usableAsToolProperty = ',\n\t\tusableAsTool: true';
	} else if (usableAsTool === false) {
		usableAsToolProperty = ',\n\t\tusableAsTool: false';
	}

	if (!hasDescription) {
		return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	displayName = 'Test Node';
}`;
	}

	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: []${usableAsToolProperty},
	};
}`;
}

function createNonNodeClass(): string {
	return `
export class RegularClass {
	someProperty = 'value';
}`;
}

ruleTester.run('node-usable-as-tool', NodeUsableAsToolRule, {
	valid: [
		{
			name: 'node with usableAsTool set to true',
			code: createNodeCode(true),
		},
		{
			name: 'class that does not implement INodeType',
			code: createNonNodeClass(),
		},
		{
			name: 'node with usableAsTool set to false',
			code: createNodeCode(false),
		},
		{
			name: 'node without description property',
			code: createNodeCode(undefined, false),
		},
	],
	invalid: [
		{
			name: 'node missing usableAsTool property',
			code: createNodeCode('missing'),
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: createNodeCode(true),
		},
	],
});
