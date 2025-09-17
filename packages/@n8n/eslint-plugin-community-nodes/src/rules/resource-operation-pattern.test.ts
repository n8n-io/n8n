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
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						properties: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: Array.from({ length: 15 }, (_, i) => ({
									name: \`Operation \${i + 1}\`,
									value: \`op\${i + 1}\`
								})),
								default: 'op1'
							}
						]
					};
				}
			`,
		},
	],
	invalid: [
		{
			name: 'node with few operations and no resources (always warn)',
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
									{ name: 'Create', value: 'create' }
								],
								default: 'get'
							}
						]
					};
				}
			`,
			errors: [
				{
					messageId: 'operationsWithoutResources',
					data: { operationCount: '2' },
				},
			],
		},
		{
			name: 'node with moderate operations without resources (warning)',
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
									{ name: 'List Users', value: 'listUsers' }
								],
								default: 'getUser'
							}
						]
					};
				}
			`,
			errors: [
				{
					messageId: 'operationsWithoutResources',
					data: { operationCount: '5' },
				},
			],
		},
		{
			name: 'node with too many operations without resources (error)',
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
									{ name: 'Update Project', value: 'updateProject' },
									{ name: 'Delete Project', value: 'deleteProject' },
									{ name: 'List Projects', value: 'listProjects' },
									{ name: 'Get Organization', value: 'getOrganization' },
									{ name: 'Create Organization', value: 'createOrganization' }
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
					data: { operationCount: '12' },
				},
			],
		},
		{
			name: 'node with exactly 11 operations without resources (error)',
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
									{ name: 'Op 1', value: 'op1' },
									{ name: 'Op 2', value: 'op2' },
									{ name: 'Op 3', value: 'op3' },
									{ name: 'Op 4', value: 'op4' },
									{ name: 'Op 5', value: 'op5' },
									{ name: 'Op 6', value: 'op6' },
									{ name: 'Op 7', value: 'op7' },
									{ name: 'Op 8', value: 'op8' },
									{ name: 'Op 9', value: 'op9' },
									{ name: 'Op 10', value: 'op10' },
									{ name: 'Op 11', value: 'op11' }
								],
								default: 'op1'
							}
						]
					};
				}
			`,
			errors: [
				{
					messageId: 'tooManyOperationsWithoutResources',
					data: { operationCount: '11' },
				},
			],
		},
	],
});
