import { RuleTester } from '@typescript-eslint/rule-tester';
import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';
import { describe, expect, it } from 'vitest';

import { configs, rules } from '../plugin.js';
import { createRule } from '../utils/index.js';

const RULE_NAME = 'non-required-fields-in-collection';
const RULE_KEY = `@n8n/community-nodes/${RULE_NAME}`;
const MESSAGE_ID = 'nonRequiredFieldAtTopLevel';

const registeredRules: Record<string, AnyRuleModule | undefined> = rules;

/**
 * The rule does not exist yet (CE-2631). While it is missing, the cases below
 * run against this placeholder, which reports nothing. The failures then show
 * the real gap — a non-required top-level field is not flagged — instead of a
 * module resolution error.
 *
 * The implementation replaces the placeholder: register the rule as
 * `non-required-fields-in-collection` and report `nonRequiredFieldAtTopLevel`
 * with the field name in `field`. Update this file if the agreed rule name,
 * message id, or message data is different.
 */
const PlaceholderRule = createRule({
	name: RULE_NAME,
	meta: {
		type: 'problem',
		docs: { description: 'Placeholder for the rule that CE-2631 adds' },
		messages: {
			[MESSAGE_ID]:
				'"{{ field }}" is not required. Move it into an "Additional Options" or "Additional Fields" collection.',
		},
		schema: [],
	},
	defaultOptions: [],
	create: () => ({}),
});

const rule = registeredRules[RULE_NAME] ?? PlaceholderRule;

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

describe('rule registration', () => {
	it('registers the rule in the plugin rules index', () => {
		expect(Object.keys(rules)).toContain(RULE_NAME);
	});

	it('enables the rule in both recommended configs', () => {
		expect(configs.recommended.rules).toHaveProperty(RULE_KEY);
		expect(configs.recommendedWithoutN8nCloudSupport.rules).toHaveProperty(RULE_KEY);
	});
});

const ruleTester = new RuleTester();

ruleTester.run(RULE_NAME, rule, {
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
