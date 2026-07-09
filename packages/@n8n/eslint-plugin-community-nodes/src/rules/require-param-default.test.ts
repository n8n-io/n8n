import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireParamDefaultRule } from './require-param-default.js';

const ruleTester = new RuleTester();

function createNodeCode(properties: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['input'],
				version: 1,
				description: 'A test node',
				defaults: { name: 'Test Node' },
				inputs: [],
				outputs: [],
				properties: [
					${properties}
				],
			};
		}
	`;
}

ruleTester.run('require-param-default', RequireParamDefaultRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = {
						properties: [{ displayName: 'Field', name: 'field', type: 'string' }],
					};
				}
			`,
		},
		{
			name: 'param-shaped object outside description (e.g. in a method) is ignored',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [],
					};

					methods = {
						loadOptions: {
							async getThings() {
								const config = { displayName: 'X', name: 'x', type: 'string' };
								return [config];
							},
						},
					};
				}
			`,
		},
		{
			name: 'non .node.ts file is ignored',
			filename: '/tmp/helper.ts',
			code: `
				export class TestNode {
					description = {
						properties: [{ displayName: 'Field', name: 'field', type: 'string' }],
					};
				}
			`,
		},
		{
			name: 'string parameter with default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
					default: '',
				},
			`),
		},
		{
			name: 'options parameter with default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Create', value: 'create' }],
					default: 'create',
				},
			`),
		},
		{
			name: 'notice parameter with empty default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Some notice',
					name: 'notice',
					type: 'notice',
					default: '',
				},
			`),
		},
		{
			name: 'options-array entries (name/value, no displayName) are not parameters',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Create', value: 'create', type: 'whatever' }],
					default: 'create',
				},
			`),
		},
		{
			name: 'object with name and type but no displayName is not a parameter',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Routing',
					name: 'routing',
					type: 'string',
					default: '',
					routing: { request: { method: 'GET', name: 'x', type: 'y' } },
				},
			`),
		},
		{
			name: 'nested collection options all have defaults',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					default: {},
					options: [
						{
							displayName: 'Limit',
							name: 'limit',
							type: 'number',
							default: 50,
						},
					],
				},
			`),
		},
	],
	invalid: [
		{
			name: 'string parameter missing default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
				},
			`),
			errors: [{ messageId: 'missingDefault', data: { name: 'field' } }],
		},
		{
			name: 'notice parameter missing default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Some notice',
					name: 'notice',
					type: 'notice',
				},
			`),
			errors: [{ messageId: 'missingDefault', data: { name: 'notice' } }],
		},
		{
			name: 'nested collection option missing default',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					default: {},
					options: [
						{
							displayName: 'Limit',
							name: 'limit',
							type: 'number',
						},
					],
				},
			`),
			errors: [{ messageId: 'missingDefault', data: { name: 'limit' } }],
		},
		{
			name: 'multiple parameters missing defaults',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'First',
					name: 'first',
					type: 'string',
				},
				{
					displayName: 'Second',
					name: 'second',
					type: 'boolean',
				},
			`),
			errors: [
				{ messageId: 'missingDefault', data: { name: 'first' } },
				{ messageId: 'missingDefault', data: { name: 'second' } },
			],
		},
	],
});
