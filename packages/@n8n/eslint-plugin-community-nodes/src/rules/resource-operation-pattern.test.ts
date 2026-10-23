import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';
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

const resourceOperationRuleId = '@n8n/community-nodes/resource-operation-pattern';

function nodeWithSixOperations(hasResource: boolean): string {
	return `
		class TestNode extends Node {
			description = {
				properties: [
					${hasResource ? "{ name: 'resource', type: 'options', options: [{ name: 'User', value: 'user' }] }," : ''}
					{
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Get', value: 'get' },
							{ name: 'Create', value: 'create' },
							{ name: 'Update', value: 'update' },
							{ name: 'Delete', value: 'delete' },
							{ name: 'List', value: 'list' },
							{ name: 'Search', value: 'search' },
						],
					},
				],
			};
		}
	`;
}

describe.each([
	['recommended', configs.recommended],
	['recommendedWithoutN8nCloudSupport', configs.recommendedWithoutN8nCloudSupport],
] as const)('%s config', (_name, config) => {
	const linter = new Linter();
	const lint = (code: string, filename = 'TestNode.node.ts') =>
		linter.verify(
			code,
			{
				files: ['**/*.ts'],
				plugins: config.plugins,
				rules: { [resourceOperationRuleId]: config.rules[resourceOperationRuleId] },
			},
			{ filename },
		);

	// CE-3284: The resource finding must fail lint even when it is the only finding.
	it('reports missing resources as the only error', () => {
		expect(lint(nodeWithSixOperations(false))).toEqual([
			expect.objectContaining({
				ruleId: resourceOperationRuleId,
				messageId: 'tooManyOperationsWithoutResources',
				severity: 2,
			}),
		]);
	});

	it('accepts operations organized by resource', () => {
		expect(lint(nodeWithSixOperations(true))).toEqual([]);
	});

	// CE-3602: Check getAll action text in node classes and separate description files.
	describe.each(['TestNode.node.ts', 'ContactDescription.ts'])('%s getAll actions', (filename) => {
		const lintAction = (action: string, parameterName = 'operation', value = 'getAll') => {
			const parameter = `{
				displayName: 'Operation',
				name: '${parameterName}',
				type: 'options',
				options: [{ name: 'Get Many', value: '${value}', action: '${action}' }],
				default: '${value}',
			}`;
			const code = filename.endsWith('.node.ts')
				? `class TestNode extends Node {
					description = { properties: [${parameter}] };
				}`
				: `export const contactOperations = [${parameter}];`;

			return lint(code, filename);
		};

		it.each(['List contacts', 'Get contacts'])('reports the getAll action "%s"', (action) => {
			expect(lintAction(action)).toEqual([
				expect.objectContaining({
					ruleId: resourceOperationRuleId,
					severity: 2,
					message: `Start the action of the "getAll" operation with "Get many", not "${action}". For example, use "Get many contacts".`,
				}),
			]);
		});

		it('accepts a getAll action that starts with "Get many"', () => {
			expect(lintAction('Get many contacts')).toEqual([]);
		});

		it('leaves "Get all" actions to the base rule', () => {
			expect(lintAction('Get all contacts')).toEqual([]);
		});

		it('ignores getAll options outside an operation parameter', () => {
			expect(lintAction('List contacts', 'resource')).toEqual([]);
		});

		it('ignores other operation values', () => {
			expect(lintAction('Get contacts', 'operation', 'get')).toEqual([]);
		});
	});
});
