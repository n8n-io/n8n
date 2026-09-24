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
									{ name: 'Get', value: 'get', action: 'Get a user' },
									{ name: 'Create', value: 'create', action: 'Create a user' },
									{ name: 'Update', value: 'update', action: 'Update a user' },
									{ name: 'Delete', value: 'delete', action: 'Delete a user' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
		},
		{
			name: 'single-resource node with one operation and an action',
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
						properties: [{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [{ name: 'Send', value: 'send', action: 'Send a message' }],
							default: 'send'
						}]
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
									{ name: 'Get', value: 'get', action: 'Get a message' },
									{ name: 'Create', value: 'create', action: 'Create a message' },
									{ name: 'Update', value: 'update', action: 'Update a message' },
									{ name: 'Delete', value: 'delete', action: 'Delete a message' },
									{ name: 'List', value: 'list', action: 'List messages' }
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
			// An action needs an Operation even when the node has only one resource.
			name: 'single-action node without an operation',
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
						properties: [{
							displayName: 'Message',
							name: 'message',
							type: 'string',
							default: ''
						}]
					};
				}
			`,
			errors: [{ messageId: 'missingActions' }],
		},
		{
			name: 'operation option without an action',
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
						properties: [{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [{ name: 'Send', value: 'send' }],
							default: 'send'
						}]
					};
				}
			`,
			errors: [{ messageId: 'missingActions' }],
		},
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
									{ name: 'Get', value: 'get', action: 'Get a message' },
									{ name: 'Create', value: 'create', action: 'Create a message' },
									{ name: 'Update', value: 'update', action: 'Update a message' },
									{ name: 'Delete', value: 'delete', action: 'Delete a message' },
									{ name: 'List', value: 'list', action: 'List messages' },
									{ name: 'Search', value: 'search', action: 'Search messages' }
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
									{ name: 'Get User', value: 'getUser', action: 'Get a user' },
									{ name: 'Create User', value: 'createUser', action: 'Create a user' },
									{ name: 'Update User', value: 'updateUser', action: 'Update a user' },
									{ name: 'Delete User', value: 'deleteUser', action: 'Delete a user' },
									{ name: 'List Users', value: 'listUsers', action: 'List users' },
									{ name: 'Get Project', value: 'getProject', action: 'Get a project' },
									{ name: 'Create Project', value: 'createProject', action: 'Create a project' },
									{ name: 'Update Project', value: 'updateProject', action: 'Update a project' }
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
