import { RuleTester } from '@typescript-eslint/rule-tester';
import type { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { NonRequiredFieldsInCollectionRule } from './non-required-fields-in-collection.js';
import { configs, rules } from '../plugin.js';

const RULE_NAME = 'non-required-fields-in-collection';
const RULE_KEY = `@n8n/community-nodes/${RULE_NAME}`;
const MESSAGE_ID = 'nonRequiredFieldAtTopLevel';

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

const REQUIRED_FIELD = `
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
	},
`;

/** The severity a config gives the rule, so a later change to `'off'` fails. */
function severityIn(config: Linter.Config): Linter.RuleEntry | undefined {
	return config.rules?.[RULE_KEY];
}

describe('rule registration', () => {
	it('registers the rule in the plugin rules index', () => {
		expect(Object.keys(rules)).toContain(RULE_NAME);
	});

	it('enables the rule at warn in both recommended configs', () => {
		expect(severityIn(configs.recommended)).toBe('warn');
		expect(severityIn(configs.recommendedWithoutN8nCloudSupport)).toBe('warn');
	});
});

const ruleTester = new RuleTester();

ruleTester.run(RULE_NAME, NonRequiredFieldsInCollectionRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = {
						properties: [{ displayName: 'Limit', name: 'limit', type: 'number', default: 50 }],
					};
				}
			`,
		},
		{
			name: 'non .node.ts file is ignored',
			filename: '/tmp/helper.ts',
			code: `
				export const properties = [
					{ displayName: 'Limit', name: 'limit', type: 'number', default: 50 },
				];
			`,
		},
		{
			name: 'required top-level field',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(REQUIRED_FIELD),
		},
		{
			name: 'non-required field inside an Additional Fields collection',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					placeholder: 'Add Field',
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
		{
			name: 'non-required field inside an Additional Options collection',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Additional Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add option',
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
		{
			name: 'resource and operation selectors stay at the top level',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [{ name: 'User', value: 'user' }],
					default: 'user',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					options: [{ name: 'Get', value: 'get' }],
					default: 'get',
				},
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					options: [{ name: 'Access Token', value: 'accessToken' }],
					default: 'accessToken',
				},
			`),
		},
		{
			name: 'container name is not checked',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Filters',
					name: 'filters',
					type: 'fixedCollection',
					default: {},
					options: [
						{
							displayName: 'Filter',
							name: 'filter',
							values: [
								{
									displayName: 'Limit',
									name: 'limit',
									type: 'number',
									default: 50,
								},
							],
						},
					],
				},
			`),
		},
		{
			name: 'element without a name is skipped',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Limit',
					type: 'number',
					default: 50,
				},
			`),
		},
		{
			name: 'fields that hold no user input',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'This node needs an API key',
					name: 'notice',
					type: 'notice',
					default: '',
				},
				{
					displayName: 'Internal',
					name: 'internal',
					type: 'hidden',
					default: 'v2',
				},
			`),
		},
		{
			name: 'required value that is not a boolean literal',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					required: isLimitRequired,
					default: 50,
				},
			`),
		},
		{
			name: 'spread properties are not analysed',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode('...userFields,'),
		},
	],
	invalid: [
		{
			name: 'top-level field that omits required',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					default: 50,
				},
			`),
			errors: [{ messageId: MESSAGE_ID, data: { field: 'limit' } }],
		},
		{
			name: 'top-level field that sets required to false',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					required: false,
					default: 50,
				},
			`),
			errors: [{ messageId: MESSAGE_ID, data: { field: 'limit' } }],
		},
		{
			name: 'top-level field that omits type',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Limit',
					name: 'limit',
					default: 50,
				},
			`),
			errors: [{ messageId: MESSAGE_ID, data: { field: 'limit' } }],
		},
		{
			name: 'each non-required top-level field is reported',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				${REQUIRED_FIELD}
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					default: 50,
				},
				{
					displayName: 'Simplify',
					name: 'simplify',
					type: 'boolean',
					default: true,
				},
			`),
			errors: [
				{ messageId: MESSAGE_ID, data: { field: 'limit' } },
				{ messageId: MESSAGE_ID, data: { field: 'simplify' } },
			],
		},
	],
});
