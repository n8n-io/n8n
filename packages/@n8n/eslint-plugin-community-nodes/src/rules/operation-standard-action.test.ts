import { RuleTester } from '@typescript-eslint/rule-tester';

import { OperationStandardActionRule } from './operation-standard-action.js';

const ruleTester = new RuleTester();

/** Operations as most nodes define them: in a description file, outside the node class. */
function createOperations(options: string): string {
	return `
		import type { INodeProperties } from 'n8n-workflow';

		export const contactOperations: INodeProperties[] = [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [${options}],
				default: 'getAll',
			},
		];
	`;
}

ruleTester.run('operation-standard-action', OperationStandardActionRule, {
	valid: [
		{
			name: 'getAll action that starts with "Get many"',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'Get many contacts' }"),
		},
		{
			name: 'getAll operation without an action',
			code: createOperations("{ name: 'Get Many', value: 'getAll' }"),
		},
		{
			name: 'action that starts with "Get all", which another rule fixes',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'Get all contacts' }"),
		},
		{
			name: 'miscased action, which another rule reports',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'Get Many contacts' }"),
		},
		{
			name: 'upsert action that starts with "Create or update"',
			code: createOperations(
				"{ name: 'Create or Update', value: 'upsert', action: 'Create or update a contact' }",
			),
		},
		{
			name: 'upsert action of a database node',
			code: createOperations(
				"{ name: 'Insert or Update', value: 'upsert', action: 'Insert or update rows in a table' }",
			),
		},
		{
			name: 'other operations',
			code: createOperations("{ name: 'Search', value: 'search', action: 'Search contacts' }"),
		},
		{
			name: 'options that are not the operation parameter',
			code: `
				const format = {
					displayName: 'Format',
					name: 'format',
					type: 'options',
					options: [{ name: 'List', value: 'getAll', action: 'List contacts' }],
				};
			`,
		},
	],
	invalid: [
		{
			name: 'getAll action with another verb',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'List contacts' }"),
			errors: [
				{
					messageId: 'wrongAction',
					data: {
						value: 'getAll',
						action: 'List contacts',
						expected: '"Get many"',
						example: 'Get many',
					},
				},
			],
		},
		{
			name: 'getAll action without "many"',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'Get contacts' }"),
			errors: [
				{
					messageId: 'wrongAction',
					data: {
						value: 'getAll',
						action: 'Get contacts',
						expected: '"Get many"',
						example: 'Get many',
					},
				},
			],
		},
		{
			name: 'lowercase "get all", which the "Get all" rule does not report',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'get all contacts' }"),
			errors: [
				{
					messageId: 'wrongAction',
					data: {
						value: 'getAll',
						action: 'get all contacts',
						expected: '"Get many"',
						example: 'Get many',
					},
				},
			],
		},
		{
			name: 'upsert action with another verb',
			code: createOperations("{ name: 'Upsert', value: 'upsert', action: 'Upsert a contact' }"),
			errors: [
				{
					messageId: 'wrongAction',
					data: {
						value: 'upsert',
						action: 'Upsert a contact',
						expected: '"Create or update", "Insert or update", or "Append or update"',
						example: 'Create or update',
					},
				},
			],
		},
	],
});
