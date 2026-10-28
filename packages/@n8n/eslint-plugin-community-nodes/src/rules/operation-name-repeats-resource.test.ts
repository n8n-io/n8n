import { RuleTester } from '@typescript-eslint/rule-tester';

import { OperationNameRepeatsResourceRule } from './operation-name-repeats-resource.js';

const ruleTester = new RuleTester();

function createOperations(resources: string, options: string): string {
	return `
		import type { INodeProperties } from 'n8n-workflow';

		export const operations: INodeProperties[] = [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: [${resources}] } },
				options: [${options}],
				default: 'get',
			},
		];
	`;
}

ruleTester.run('operation-name-repeats-resource', OperationNameRepeatsResourceRule, {
	valid: [
		{
			name: 'operation names without the resource',
			code: createOperations(
				"'contact'",
				"{ name: 'Get', value: 'get' }, { name: 'Get Many', value: 'getAll' }",
			),
		},
		{
			name: 'operation that names an object other than the resource',
			code: createOperations("'payment'", "{ name: 'Create Payment Link', value: 'createLink' }"),
		},
		{
			name: 'operations shared by several resources',
			code: createOperations("'contact', 'company'", "{ name: 'Get Contact', value: 'get' }"),
		},
		{
			name: 'operations shared with a resource the rule cannot read',
			code: createOperations("'contact', COMPANY", "{ name: 'Get Contact', value: 'get' }"),
		},
		{
			name: 'operations not tied to a resource',
			code: `
				const operation = {
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [{ name: 'Get Contact', value: 'get' }],
				};
			`,
		},
	],
	invalid: [
		{
			name: 'operation name with a verb and the resource',
			code: createOperations("'contact'", "{ name: 'Get Contact', value: 'get' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'Get Contact', resource: 'contact', verb: 'Get' },
				},
			],
		},
		{
			name: 'camelCase resource value and an article in the name',
			code: createOperations(
				"'directoryContext'",
				"{ name: 'Update a Directory Context', value: 'update' }",
			),
			errors: [
				{
					messageId: 'repeatsResource',
					data: {
						name: 'Update a Directory Context',
						resource: 'directoryContext',
						verb: 'Update',
					},
				},
			],
		},
		{
			name: 'standard name of several words with the resource',
			code: createOperations("'contact'", "{ name: 'Create or Update Contact', value: 'upsert' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'Create or Update Contact', resource: 'contact', verb: 'Create or Update' },
				},
			],
		},
		{
			name: 'list operation suggests "Get Many" whatever its name says',
			code: createOperations("'contact'", "{ name: 'List Contacts', value: 'getAll' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'List Contacts', resource: 'contact', verb: 'Get Many' },
				},
			],
		},
		{
			name: 'upsert operation suggests "Create or Update" whatever its name says',
			code: createOperations("'contact'", "{ name: 'Upsert Contact', value: 'upsert' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'Upsert Contact', resource: 'contact', verb: 'Create or Update' },
				},
			],
		},
		{
			name: 'upsert operation keeps another standard name',
			code: createOperations("'row'", "{ name: 'Insert or Update Row', value: 'upsert' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'Insert or Update Row', resource: 'row', verb: 'Insert or Update' },
				},
			],
		},
		{
			name: 'operation name that is the resource',
			code: createOperations("'search'", "{ name: 'Search', value: 'search' }"),
			errors: [
				{
					messageId: 'repeatsResource',
					data: { name: 'Search', resource: 'search', verb: 'Search' },
				},
			],
		},
	],
});
