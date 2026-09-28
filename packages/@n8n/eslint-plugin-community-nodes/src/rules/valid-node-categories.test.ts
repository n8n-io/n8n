import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidNodeCategoriesRule } from './valid-node-categories.js';

const ruleTester = new RuleTester();
const filename = 'nodes/Example/Example.node.json';

function codex(categories: unknown, subcategories?: Record<string, string[]>): string {
	return JSON.stringify({ node: 'n8n-nodes-example', categories, subcategories });
}

function inlineCodex(
	categories: string[],
	subcategories?: Record<string, string[]>,
	javascript = false,
): string {
	return `
${javascript ? '' : "import type { INodeType, INodeTypeDescription } from 'n8n-workflow';"}
export class Example${javascript ? '' : ' implements INodeType'} {
	description${javascript ? '' : ': INodeTypeDescription'} = {
		displayName: 'Example',
		name: 'example',
		group: ['input'],
		version: 1,
		description: 'An example node',
		defaults: { name: 'Example' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		codex: ${JSON.stringify({ categories, subcategories })},
	};
}`;
}

ruleTester.run<string, []>('valid-node-categories', ValidNodeCategoriesRule, {
	valid: [
		// CE-2027: Both codex sources must use the same AI taxonomy.
		{
			name: 'JSON codex with supported AI subcategories',
			filename,
			code: codex(['AI'], { AI: ['Agents', 'Tools', 'Root Nodes'] }),
		},
		{
			name: 'inline TypeScript codex with supported AI subcategories',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: ['Agents', 'Tools', 'Root Nodes'] }),
		},
		{
			name: 'inline JavaScript codex with a supported AI subcategory',
			filename: 'nodes/Example/Example.node.js',
			code: inlineCodex(['AI'], { AI: ['Agents'] }, true),
		},
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
			name: 'JSON codex with an unknown AI subcategory',
			filename,
			code: codex(['AI'], { AI: ['Agents & Tools', 'Tools'] }),
			errors: [{ messageId: 'invalidAiSubcategory', data: { subcategory: 'Agents & Tools' } }],
		},
		{
			name: 'inline TypeScript codex with an unknown AI subcategory',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: ['Agents & Tools', 'Tools'] }),
			errors: [{ messageId: 'invalidAiSubcategory', data: { subcategory: 'Agents & Tools' } }],
		},
		{
			name: 'JSON codex with AI but no AI subcategory',
			filename,
			code: codex(['AI']),
			errors: [{ messageId: 'missingAiSubcategory' }],
		},
		{
			name: 'inline TypeScript codex with AI but no AI subcategory',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI']),
			errors: [{ messageId: 'missingAiSubcategory' }],
		},
		{
			name: 'JSON codex with an empty AI subcategory list',
			filename,
			code: codex(['AI'], { AI: [] }),
			errors: [{ messageId: 'missingAiSubcategory' }],
		},
		{
			name: 'inline codex with an empty AI subcategory list',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: [] }),
			errors: [{ messageId: 'missingAiSubcategory' }],
		},
		{
			name: 'JSON codex with a non-string AI subcategory',
			filename,
			code: '{ "categories": ["AI"], "subcategories": { "AI": [12] } }',
			errors: [{ messageId: 'invalidAiSubcategoryType' }],
		},
		{
			name: 'JSON codex with an AI subcategory but no AI category',
			filename,
			code: codex(['Development'], { AI: ['Agents'] }),
			errors: [{ messageId: 'unexpectedAiSubcategory' }],
		},
		{
			name: 'inline JavaScript codex with an AI subcategory but no AI category',
			filename: 'nodes/Example/Example.node.js',
			code: inlineCodex(['Development'], { AI: ['Agents'] }, true),
			errors: [{ messageId: 'unexpectedAiSubcategory' }],
		},
		{
			name: 'unknown category',
			filename,
			code: codex(['Development', 'Bananas']),
			errors: [{ messageId: 'invalidCategory', data: { category: 'Bananas' } }],
		},
		{
			name: 'inline codex with an unknown top-level category',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['Development', 'Bananas']),
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
