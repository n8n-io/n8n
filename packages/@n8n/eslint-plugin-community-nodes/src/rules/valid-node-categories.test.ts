import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { afterEach, vi } from 'vitest';

import { readJsonObject } from '../utils/file-utils.js';
import { ValidNodeCategoriesRule } from './valid-node-categories.js';

vi.mock('../utils/file-utils.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../utils/file-utils.js')>()),
	readJsonObject: vi.fn(),
}));

const ruleTester = new RuleTester();
const filename = 'nodes/Example/Example.node.json';
const typescriptNode = 'nodes/Example/Example.node.ts';
const javascriptNode = 'nodes/Example/Example.node.js';
const toolsOnly = { categories: ['AI'], subcategories: { AI: ['Tools'] } };

function mockSiblingCodex(data: Record<string, unknown>): void {
	vi.mocked(readJsonObject).mockImplementation((filePath) => (filePath === filename ? data : null));
}

afterEach(() => vi.mocked(readJsonObject).mockReset());

function codex(categories: unknown, subcategories?: Record<string, string[]>): string {
	return JSON.stringify({ node: 'n8n-nodes-example', categories, subcategories });
}

function nodeCode({
	inline,
	inputs = "['main']",
	outputs = "['main']",
	javascript = false,
	trailingProperties = '',
}: {
	inline?: string;
	inputs?: string;
	outputs?: string;
	javascript?: boolean;
	trailingProperties?: string;
} = {}): string {
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
		inputs: ${inputs},
		outputs: ${outputs},
		properties: [],
		${inline ? `codex: ${inline},` : ''}
		${trailingProperties}
	};
}`;
}

function inlineCodex(
	categories: string[],
	subcategories?: Record<string, string[]>,
	javascript = false,
): string {
	return nodeCode({ inline: JSON.stringify({ categories, subcategories }), javascript });
}

ruleTester.run('valid-node-categories', ValidNodeCategoriesRule, {
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
			name: 'inline JavaScript AI tool does not need Root Nodes',
			filename: javascriptNode,
			code: nodeCode({
				inline: JSON.stringify(toolsOnly),
				inputs: '[]',
				outputs: "['ai_tool']",
				javascript: true,
			}),
		},
		{
			name: 'JSON codex with nested tool and vector store subcategories',
			filename,
			code: codex(['AI'], {
				AI: ['Tools', 'Vector Stores'],
				Tools: ['Other Tools'],
				'Vector Stores': ['Other Vector Stores'],
			}),
		},
		{
			name: 'inline codex with nested tool and vector store subcategories',
			filename: 'nodes/Example/Example.node.ts',
			code: nodeCode({
				inline: JSON.stringify({
					categories: ['AI'],
					subcategories: {
						AI: ['Tools', 'Vector Stores'],
						Tools: ['Other Tools'],
						'Vector Stores': ['Other Vector Stores'],
					},
				}),
				inputs: '[NodeConnectionTypes.AiEmbedding]',
				outputs: '[NodeConnectionTypes.AiVectorStore]',
			}),
		},
		{
			name: 'AI main node with Root Nodes in its sibling codex',
			filename: typescriptNode,
			code: nodeCode(),
			before: () =>
				mockSiblingCodex({ categories: ['AI'], subcategories: { AI: ['Agents', 'Root Nodes'] } }),
		},
		{
			name: 'AI-only node with a sibling codex does not need Root Nodes',
			filename: typescriptNode,
			code: nodeCode({ inputs: '[]', outputs: '[NodeConnectionTypes.AiTool]' }),
			before: () => mockSiblingCodex(toolsOnly),
		},
		{
			name: 'AI sub-node can carry Root Nodes',
			filename: typescriptNode,
			code: nodeCode({
				inline: '{ categories: ["AI"], subcategories: { AI: ["Language Models", "Root Nodes"] } }',
				inputs: '[]',
				outputs: '[NodeConnectionTypes.AiLanguageModel]',
			}),
		},
		{
			name: 'inline codex with dynamic inputs does not require Root Nodes',
			filename: typescriptNode,
			code: nodeCode({ inline: JSON.stringify(toolsOnly), inputs: 'getInputs()' }),
		},
		{
			name: 'spread after literal connections can override the node type',
			filename: typescriptNode,
			code: nodeCode({ inline: JSON.stringify(toolsOnly) }).replace(
				'properties: [],',
				'...connections, properties: [],',
			),
		},
		{
			name: 'sibling codex with dynamic output entries does not require Root Nodes',
			filename: typescriptNode,
			code: nodeCode({ outputs: '[NodeConnectionTypes.Main, ...extraOutputs]' }),
			before: () => mockSiblingCodex(toolsOnly),
		},
		{
			name: 'spread after a connection type can override it',
			filename: typescriptNode,
			code: nodeCode({ outputs: "[{ type: 'main', ...connection }]" }),
			before: () => mockSiblingCodex(toolsOnly),
		},
		{
			name: 'inline codex takes precedence over sibling codex for the Root Nodes check',
			filename: typescriptNode,
			code: inlineCodex(['Development']),
			before: () => mockSiblingCodex(toolsOnly),
		},
		{
			name: 'spread can supply an inline codex that takes precedence over the sibling codex',
			filename: typescriptNode,
			code: nodeCode().replace('displayName:', '...baseDescription, displayName:'),
			before: () => mockSiblingCodex(toolsOnly),
		},
		{
			name: 'a later spread can override inline codex',
			filename: typescriptNode,
			code: nodeCode({
				inline: '{ categories: ["Bananas"] }',
				trailingProperties: '...{ codex: { categories: ["Development"] } },',
			}),
		},
		{
			name: 'a later computed key can override inline codex',
			filename: javascriptNode,
			code: nodeCode({
				inline: '{ categories: ["Bananas"] }',
				trailingProperties: '["co" + "dex"]: { categories: ["Development"] },',
				javascript: true,
			}),
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
			name: 'inline AI main node with Tools but no Root Nodes',
			filename: typescriptNode,
			code: nodeCode({
				inline: JSON.stringify(toolsOnly),
				inputs: '[]',
				outputs: '[{ type: NodeConnectionTypes.Main }]',
			}),
			errors: [{ messageId: 'missingAiRootNodes', data: { source: '"description.codex"' } }],
		},
		{
			name: 'JavaScript AI main node with Agents and Tools but no Root Nodes in its sibling codex',
			filename: javascriptNode,
			code: nodeCode({ javascript: true }),
			before: () =>
				mockSiblingCodex({ categories: ['AI'], subcategories: { AI: ['Agents', 'Tools'] } }),
			errors: [
				{ messageId: 'missingAiRootNodes', data: { source: 'the sibling ".node.json" file' } },
			],
		},
		{
			name: 'JSON codex with Other Tools as a direct AI subcategory',
			filename,
			code: codex(['AI'], { AI: ['Other Tools'] }),
			errors: [{ messageId: 'invalidAiSubcategory', data: { subcategory: 'Other Tools' } }],
		},
		{
			name: 'inline codex with Other Tools as a direct AI subcategory',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: ['Other Tools'] }),
			errors: [{ messageId: 'invalidAiSubcategory', data: { subcategory: 'Other Tools' } }],
		},
		{
			name: 'inline TypeScript codex with only an AI subcategory hole',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: [] }).replace('"AI":[]', '"AI":[,]'),
			errors: [{ messageId: 'invalidAiSubcategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
		{
			name: 'inline JavaScript codex with only an AI subcategory hole',
			filename: 'nodes/Example/Example.node.js',
			code: inlineCodex(['AI'], { AI: [] }, true).replace('"AI":[]', '"AI":[,]'),
			errors: [{ messageId: 'invalidAiSubcategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
		{
			name: 'inline TypeScript codex with a supported AI subcategory and a hole',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex(['AI'], { AI: ['Tools'] }).replace('["Tools"]', '["Tools",,]'),
			errors: [{ messageId: 'invalidAiSubcategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
		{
			name: 'inline JavaScript codex with a supported AI subcategory and a hole',
			filename: 'nodes/Example/Example.node.js',
			code: inlineCodex(['AI'], { AI: ['Tools'] }, true).replace('["Tools"]', '["Tools",,]'),
			errors: [{ messageId: 'invalidAiSubcategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
		{
			name: 'inline TypeScript codex with only a category hole',
			filename: 'nodes/Example/Example.node.ts',
			code: inlineCodex([]).replace('"categories":[]', '"categories":[,]'),
			errors: [{ messageId: 'invalidCategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
		{
			name: 'inline JavaScript codex with a supported category and a hole',
			filename: 'nodes/Example/Example.node.js',
			code: inlineCodex(['Development'], undefined, true).replace(
				'["Development"]',
				'["Development",,]',
			),
			errors: [{ messageId: 'invalidCategoryType', type: AST_NODE_TYPES.ArrayExpression }],
		},
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
			name: 'inline codex after a spread still rejects an unknown category',
			filename: typescriptNode,
			code: inlineCodex(['Bananas']).replace('displayName:', '...baseDescription, displayName:'),
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
