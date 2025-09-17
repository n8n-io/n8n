import { RuleTester } from '@typescript-eslint/rule-tester';
import { NodeUsableAsToolRule } from './node-usable-as-tool.js';

const ruleTester = new RuleTester();

ruleTester.run('node-usable-as-tool', NodeUsableAsToolRule, {
	valid: [
		{
			// Node with usableAsTool set to true in description
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		usableAsTool: true,
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`,
		},
		{
			// Class that doesn't implement INodeType
			code: `
export class RegularClass {
	someProperty = 'value';
}`,
		},
	],
	invalid: [
		{
			// Node missing usableAsTool property in description
			code: `
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
		properties: [],
	};
}`,
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: `
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
		properties: [],
		usableAsTool: true,
	};
}`,
		},
		{
			// Node with usableAsTool set to false in description
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		usableAsTool: false,
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`,
			errors: [{ messageId: 'missingUsableAsTool' }],
			output: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		usableAsTool: true,
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`,
		},
		{
			// Node without description property
			code: `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	displayName = 'Test Node';
}`,
			errors: [{ messageId: 'missingUsableAsTool' }],
		},
	],
});
