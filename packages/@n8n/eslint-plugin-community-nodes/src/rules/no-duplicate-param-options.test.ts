import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDuplicateParamOptionsRule } from './no-duplicate-param-options.js';

const ruleTester = new RuleTester();

function nodeCode(options: string, type = 'options'): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: '${type}',
						options: [${options}],
						default: '',
					},
				],
			};
		}
	`;
}

ruleTester.run('no-duplicate-param-options', NoDuplicateParamOptionsRule, {
	valid: [
		{
			name: 'non-INodeType class is skipped',
			filename: '/tmp/TestNode.node.ts',
			code: 'export class Foo {}',
		},
		{
			name: 'unique names and values',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'Create', value: 'create' },
				{ name: 'Delete', value: 'delete' },
			`),
		},
		{
			name: 'unique numeric values',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'One', value: 1 },
				{ name: 'Two', value: 2 },
			`),
		},
		{
			name: 'multiOptions with unique options',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(
				`
				{ name: 'A', value: 'a' },
				{ name: 'B', value: 'b' },
			`,
				'multiOptions',
			),
		},
		{
			name: 'non-node.ts file is skipped',
			filename: '/tmp/TestNode.ts',
			code: nodeCode(`
				{ name: 'Dup', value: 'a' },
				{ name: 'Dup', value: 'b' },
			`),
		},
	],
	invalid: [
		{
			name: 'duplicate name',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'Create', value: 'create' },
				{ name: 'Create', value: 'create2' },
			`),
			errors: [{ messageId: 'duplicateName', data: { value: 'Create', displayName: 'Resource' } }],
		},
		{
			name: 'duplicate value',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'Create', value: 'create' },
				{ name: 'Make', value: 'create' },
			`),
			errors: [{ messageId: 'duplicateValue', data: { value: 'create', displayName: 'Resource' } }],
		},
		{
			name: 'duplicate numeric value',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'One', value: 1 },
				{ name: 'Uno', value: 1 },
			`),
			errors: [{ messageId: 'duplicateValue', data: { value: '1', displayName: 'Resource' } }],
		},
		{
			name: 'duplicate name and value reported separately',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(`
				{ name: 'Create', value: 'create' },
				{ name: 'Create', value: 'create' },
			`),
			errors: [
				{ messageId: 'duplicateName', data: { value: 'Create', displayName: 'Resource' } },
				{ messageId: 'duplicateValue', data: { value: 'create', displayName: 'Resource' } },
			],
		},
		{
			name: 'duplicate in multiOptions',
			filename: '/tmp/TestNode.node.ts',
			code: nodeCode(
				`
				{ name: 'A', value: 'a' },
				{ name: 'A', value: 'b' },
			`,
				'multiOptions',
			),
			errors: [{ messageId: 'duplicateName', data: { value: 'A', displayName: 'Resource' } }],
		},
	],
});
