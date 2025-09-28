import { RuleTester } from '@typescript-eslint/rule-tester';
import { ResourceOperationPatternRule } from './resource-operation-pattern.js';

const ruleTester = new RuleTester();

ruleTester.run('resource-operation-pattern', ResourceOperationPatternRule, {
	valid: [
		{
			name: 'node with resources and operations (good pattern)',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'Resource',
								name: 'resource',
								type: 'options',
								options: [
									{ name: 'User', value: 'user' },
									{ name: 'Project', value: 'project' }
								],
								default: 'user'
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Get', value: 'get' },
									{ name: 'Create', value: 'create' },
									{ name: 'Update', value: 'update' },
									{ name: 'Delete', value: 'delete' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
		},
		{
			name: 'node without operations property',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'API Key',
								name: 'apiKey',
								type: 'string',
								default: ''
							}
						]
					};
				}
			`,
		},
		{
			name: 'non-node class ignored',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = {
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Get', value: 'get' },
									{ name: 'Create', value: 'create' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
		},
		{
			name: 'node with exactly 5 operations without resources (allowed)',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Get', value: 'get' },
									{ name: 'Create', value: 'create' },
									{ name: 'Update', value: 'update' },
									{ name: 'Delete', value: 'delete' },
									{ name: 'List', value: 'list' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
		},
	],
	invalid: [
		{
			name: 'node with exactly 6 operations without resources (error)',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Get', value: 'get' },
									{ name: 'Create', value: 'create' },
									{ name: 'Update', value: 'update' },
									{ name: 'Delete', value: 'delete' },
									{ name: 'List', value: 'list' },
									{ name: 'Search', value: 'search' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
			errors: [
				{
					messageId: 'tooManyOperationsWithoutResources',
					data: { operationCount: '6' },
				},
			],
		},
		{
			name: 'node with many operations without resources (error)',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						group: ['output'],
						version: 1,
						inputs: ['main'],
						outputs: ['main'],
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{ name: 'Get User', value: 'getUser' },
									{ name: 'Create User', value: 'createUser' },
									{ name: 'Update User', value: 'updateUser' },
									{ name: 'Delete User', value: 'deleteUser' },
									{ name: 'List Users', value: 'listUsers' },
									{ name: 'Get Project', value: 'getProject' },
									{ name: 'Create Project', value: 'createProject' },
									{ name: 'Update Project', value: 'updateProject' }
								],
								default: 'getUser'
							}
						]
					};
				}
			`,
			errors: [
				{
					messageId: 'tooManyOperationsWithoutResources',
					data: { operationCount: '8' },
				},
			],
		},
	],
});
