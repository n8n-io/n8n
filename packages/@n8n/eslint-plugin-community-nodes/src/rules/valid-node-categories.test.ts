import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidNodeCategoriesRule } from './valid-node-categories.js';

const ruleTester = new RuleTester();
const filename = 'nodes/Example/Example.node.json';

function codex(categories: unknown): string {
	return JSON.stringify({ node: 'n8n-nodes-example', categories });
}

ruleTester.run('valid-node-categories', ValidNodeCategoriesRule, {
	valid: [
		{
			name: 'all supported community categories',
			filename,
			code: codex([
				'Data & Storage',
				'Finance & Accounting',
				'Marketing & Content',
				'Productivity',
				'Miscellaneous',
				'Sales',
				'Development',
				'Analytics',
				'Communication',
				'Utility',
			]),
		},
		{ name: 'codex without categories', filename, code: '{ "node": "n8n-nodes-example" }' },
		{
			name: 'unrelated JSON file',
			filename: 'package.json',
			code: codex(['Bananas']),
		},
		{
			name: 'non-node class',
			filename: 'nodes/Example/Example.node.ts',
			code: 'class Example { categories = ["Bananas"]; }',
		},
		{
			name: 'nested categories do not count as codex categories',
			filename,
			code: '{ "resources": { "categories": ["Bananas"] } }',
		},
	],
	invalid: [
		{
			name: 'unknown category',
			filename,
			code: codex(['Development', 'Bananas']),
			errors: [{ messageId: 'invalidCategory', data: { category: 'Bananas' } }],
		},
		{
			name: 'old marketing category',
			filename,
			code: codex(['Marketing']),
			errors: [{ messageId: 'marketingCategory' }],
		},
		{
			name: 'invalid category type',
			filename,
			code: codex(['Sales', 12]),
			errors: [{ messageId: 'invalidCategoryType' }],
		},
		{
			name: 'categories must be an array',
			filename,
			code: codex('Sales'),
			errors: [{ messageId: 'invalidCategories' }],
		},
		{
			name: 'empty categories array',
			filename,
			code: codex([]),
			errors: [{ messageId: 'invalidCategories' }],
		},
	],
});
