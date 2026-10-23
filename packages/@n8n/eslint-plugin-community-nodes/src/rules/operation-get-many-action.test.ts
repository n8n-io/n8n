import { RuleTester } from '@typescript-eslint/rule-tester';

import { OperationGetManyActionRule } from './operation-get-many-action.js';

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

ruleTester.run('operation-get-many-action', OperationGetManyActionRule, {
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
			errors: [{ messageId: 'wrongAction', data: { action: 'List contacts' } }],
		},
		{
			name: 'getAll action without "many"',
			code: createOperations("{ name: 'Get Many', value: 'getAll', action: 'Get contacts' }"),
			errors: [{ messageId: 'wrongAction', data: { action: 'Get contacts' } }],
		},
	],
});
