import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidNodeCategoriesRule } from './valid-node-categories.js';

const ruleTester = new RuleTester();
const filename = 'nodes/Example/Example.node.json';

function codex(categories: unknown): string {
	return JSON.stringify({ node: 'n8n-nodes-example', categories });
}

function inlineCodex(value: string): string {
	return `class Example implements INodeType {
		description: INodeTypeDescription = { codex: ${value} };
	}`;
}

const aiCodex = JSON.stringify({ categories: ['AI'], subcategories: { AI: ['Language Models'] } });

const invalidCodexCases = [
	{
		name: 'unknown top-level category',
		code: '{ "categories": ["Bananas"] }',
		errors: [{ messageId: 'invalidCategory', data: { category: 'Bananas' } }],
	},
	{
		name: 'unsupported AI subcategory',
		code: '{ "categories": ["AI"], "subcategories": { "AI": ["Agents & Tools"] } }',
		errors: [{ messageId: 'invalidAiSubcategory', data: { subcategory: 'Agents & Tools' } }],
	},
	{
		name: 'AI category without AI subcategories',
		code: '{ "categories": ["AI"] }',
		errors: [{ messageId: 'missingAiSubcategories' }],
	},
	{
		name: 'AI subcategories without AI category',
		code: '{ "categories": ["Development"], "subcategories": { "AI": ["Tools"] } }',
		errors: [{ messageId: 'missingAiCategory' }],
	},
	{
		name: 'empty AI subcategories',
		code: '{ "categories": ["AI"], "subcategories": { "AI": [] } }',
		errors: [{ messageId: 'missingAiSubcategories' }],
	},
	{
		name: 'non-string AI subcategory',
		code: '{ "categories": ["AI"], "subcategories": { "AI": [123] } }',
		errors: [{ messageId: 'invalidAiSubcategoryType' }],
	},
	{
		name: 'subcategories without an AI category',
		code: '{ "categories": ["Sales"], "subcategories": { "Core Nodes": ["Helpers"] } }',
		errors: [{ messageId: 'invalidSubcategories' }],
	},
] as const;

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
		{ name: 'AI category with a supported subcategory in JSON', filename, code: aiCodex },
		{
			name: 'AI category with a supported subcategory inline',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(aiCodex),
		},
		{
			name: 'AI node with a secondary subcategory',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(
				'{ categories: ["AI"], subcategories: { AI: ["Language Models", "Root Nodes"], "Language Models": ["Chat Models (Recommended)"] } }',
			),
		},
		{
			name: 'regular category in an inline codex',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex('{ categories: ["Marketing & Content"] }'),
		},
		{
			name: 'a class without INodeType is ignored',
			filename: 'nodes/Example/Example.node.ts',
			code: 'class Example { description = { codex: { categories: ["Bananas"] } }; }',
		},
		{
			name: 'a nested codex outside the node description is ignored',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex('{ categories: ["Development"], resources: { categories: ["Bananas"] } }'),
		},
		{
			name: 'codex in a constructor-assigned description',
			filename: 'nodes/Example/Example.node.ts',
			code: 'class Example implements INodeType { constructor() { this.description = { codex: { categories: ["Sales"] } }; } }',
		},
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
		{
			name: 'unknown category in a constructor-assigned description',
			filename: 'nodes/Example/Example.node.ts',
			code: 'class Example implements INodeType { constructor() { this.description = { codex: { categories: ["Bananas"] } }; } }',
			errors: [{ messageId: 'invalidCategory', data: { category: 'Bananas' } }],
		},
		...invalidCodexCases.flatMap(({ name, code, errors }) => [
			{ name: `${name} in JSON`, filename, code, errors },
			{
				name: `${name} inline`,
				filename: 'nodes/Example/Example.node.ts',
				code: inlineCodex(code),
				errors,
			},
		]),
	],
});
