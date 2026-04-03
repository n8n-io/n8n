import { RuleTester } from '@typescript-eslint/rule-tester';

import { OptionsSortedAlphabeticallyRule } from './options-sorted-alphabetically.js';

const ruleTester = new RuleTester();

ruleTester.run('options-sorted-alphabetically', OptionsSortedAlphabeticallyRule, {
	valid: [
		{
			name: 'resource options already sorted alphabetically',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'Contact', value: 'contact' },
									{ name: 'Project', value: 'project' },
									{ name: 'User', value: 'user' },
								],
								default: 'contact',
							},
						],
					};
				}
			`,
		},
		{
			name: 'operation options already sorted alphabetically',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Create', value: 'create' },
									{ name: 'Delete', value: 'delete' },
									{ name: 'Get', value: 'get' },
									{ name: 'Update', value: 'update' },
								],
								default: 'get',
							},
						],
					};
				}
			`,
		},
		{
			name: 'non-ASCII names sorted correctly via localeCompare',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'Árbol', value: 'arbol' },
									{ name: 'Empresa', value: 'empresa' },
									{ name: 'Usuario', value: 'usuario' },
								],
								default: 'arbol',
							},
						],
					};
				}
			`,
		},
		{
			name: 'single option is trivially sorted',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
		},
		{
			name: 'non-options type parameter is ignored',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
						],
					};
				}
			`,
		},
		{
			name: 'non-node class is ignored',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = {
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Contact', value: 'contact' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: '/tmp/TestHelper.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Contact', value: 'contact' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
		},
		{
			name: 'description assigned from a variable is skipped',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				const desc: INodeTypeDescription = {} as INodeTypeDescription;

				export class TestNode implements INodeType {
					description = desc;
				}
			`,
		},
		{
			name: 'node with no properties array is skipped',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
					};
				}
			`,
		},
		{
			name: 'spread element in properties array is skipped gracefully',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				const extraProps = [{ displayName: 'Extra', name: 'extra', type: 'string', default: '' }];

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							...extraProps,
						],
					};
				}
			`,
		},
		{
			name: 'options with a spread element are skipped (dynamic options)',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				const extraOption = { name: 'Extra', value: 'extra' };

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									...([extraOption]),
								],
								default: 'user',
							},
						],
					};
				}
			`,
		},
		{
			name: 'options with a dynamic name value are skipped',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				const dynamicName = 'Dynamic';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: dynamicName, value: 'dynamic' },
									{ name: 'User', value: 'user' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
		},
	],
	invalid: [
		{
			name: 'resource options not sorted alphabetically',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Contact', value: 'contact' },
									{ name: 'Project', value: 'project' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
			errors: [
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'Resource', expectedOrder: 'Contact, Project, User' },
				},
			],
		},
		{
			name: 'operation options not sorted alphabetically',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Update', value: 'update' },
									{ name: 'Create', value: 'create' },
									{ name: 'Delete', value: 'delete' },
									{ name: 'Get', value: 'get' },
								],
								default: 'get',
							},
						],
					};
				}
			`,
			errors: [
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'Operation', expectedOrder: 'Create, Delete, Get, Update' },
				},
			],
		},
		{
			name: 'other options-type parameter not sorted alphabetically',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Model',
								name: 'model',
								type: 'options',
								options: [
									{ name: 'GPT-4', value: 'gpt-4' },
									{ name: 'Claude', value: 'claude' },
									{ name: 'Gemini', value: 'gemini' },
								],
								default: 'gpt-4',
							},
						],
					};
				}
			`,
			errors: [
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'Model', expectedOrder: 'Claude, Gemini, GPT-4' },
				},
			],
		},
		{
			name: 'options-type parameter without displayName falls back to "unknown"',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Contact', value: 'contact' },
								],
								default: 'user',
							},
						],
					};
				}
			`,
			errors: [
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'unknown', expectedOrder: 'Contact, User' },
				},
			],
		},
		{
			name: 'multiple unsorted parameters each report an error',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Contact', value: 'contact' },
								],
								default: 'user',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Update', value: 'update' },
									{ name: 'Create', value: 'create' },
								],
								default: 'create',
							},
						],
					};
				}
			`,
			errors: [
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'Resource', expectedOrder: 'Contact, User' },
				},
				{
					messageId: 'optionsNotSorted',
					data: { displayName: 'Operation', expectedOrder: 'Create, Update' },
				},
			],
		},
	],
});
