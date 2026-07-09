import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoAsteriskInOptionNamesRule } from './no-asterisk-in-option-names.js';

const ruleTester = new RuleTester();

function createNodeCode(body: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				${body}
			};
		}
	`;
}

ruleTester.run('no-asterisk-in-option-names', NoAsteriskInOptionNamesRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = {
						properties: [
							{ options: [{ name: '* All', value: 'all' }] },
						],
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
						properties: [
							{ options: [{ name: '* All', value: 'all' }] },
						],
					};
				}
			`,
		},
		{
			name: 'option names without asterisk',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Create', value: 'create' },
							{ name: '[All]', value: 'all' },
						],
						default: 'create',
					},
				],
			`),
		},
		{
			name: 'asterisk in displayName outside options is ignored',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test * Node',
				name: 'testNode',
				properties: [
					{ displayName: 'Field *', name: 'field', type: 'string', default: '' },
				],
			`),
		},
	],
	invalid: [
		{
			name: 'asterisk in option name within options array',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [
							{ name: '* All', value: 'all' },
							{ name: 'User', value: 'user' },
						],
						default: 'all',
					},
				],
			`),
			errors: [
				{
					messageId: 'asteriskInOptionName',
					data: { name: '* All' },
					suggestions: [
						{
							messageId: 'replaceAsterisk',
							output: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [
							{ name: '[All] All', value: 'all' },
							{ name: 'User', value: 'user' },
						],
						default: 'all',
					},
				],
			`),
						},
					],
				},
			],
		},
		{
			name: 'asterisk in nested collection options',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [{ name: '*', value: 'any' }],
								default: 'any',
							},
						],
					},
				],
			`),
			errors: [
				{
					messageId: 'asteriskInOptionName',
					data: { name: '*' },
					suggestions: [
						{
							messageId: 'replaceAsterisk',
							output: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [{ name: '[All]', value: 'any' }],
								default: 'any',
							},
						],
					},
				],
			`),
						},
					],
				},
			],
		},
	],
});
