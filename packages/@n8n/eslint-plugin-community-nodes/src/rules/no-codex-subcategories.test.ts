import { RuleTester } from '@typescript-eslint/rule-tester';
import { vi } from 'vitest';

import { NoCodexSubcategoriesRule } from './no-codex-subcategories.js';

// Only used for the .node.json case: the sibling .node.ts file lives on disk
// in real usage, so these checks need a filesystem read to mock. Keyed off
// the filename so it stays independent of test-case ordering.
vi.mock('../utils/file-utils.js', async () => {
	const actual = await vi.importActual('../utils/file-utils.js');
	return {
		...actual,
		fileImportsModule: vi.fn((filePath: string) => filePath.includes('AiSdkNode')),
		fileHasInlineDescriptionCodex: vi.fn((filePath: string) => filePath.includes('HasInlineCodex')),
	};
});

const ruleTester = new RuleTester();

function createNodeCode(codexBlock: string, extraImports = ''): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
${extraImports}
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
		properties: [],
		${codexBlock}
	};
}`;
}

ruleTester.run('no-codex-subcategories', NoCodexSubcategoriesRule, {
	valid: [
		{
			name: 'no codex property at all',
			filename: 'TestNode.node.ts',
			code: createNodeCode(''),
		},
		{
			name: 'codex with categories but no subcategories',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['Development'] },"),
		},
		{
			name: 'non-.node.ts / non-.node.json file is ignored',
			filename: 'helpers.ts',
			code: createNodeCode("codex: { subcategories: { AI: ['Tools'] } },"),
		},
		{
			name: '.node.json file without subcategories',
			filename: 'TestNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"] }',
		},
		{
			name: 'subcategories are allowed when the node imports @n8n/ai-node-sdk',
			filename: 'AiSdkNode.node.ts',
			code: createNodeCode(
				"codex: { categories: ['AI'], subcategories: { AI: ['Root Nodes'] } },",
				"import { AiNode } from '@n8n/ai-node-sdk';",
			),
		},
		{
			name: 'subcategories are allowed in .node.json when the sibling .node.ts imports @n8n/ai-node-sdk',
			filename: 'AiSdkNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["AI"], "subcategories": { "AI": ["Root Nodes"] } }',
		},
		{
			name: ".node.json is ignored when the sibling .node.ts has an inline description.codex (n8n's loader never reads it)",
			filename: 'HasInlineCodex.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"], "subcategories": { "Core Nodes": ["Helpers"] } }',
		},
	],
	invalid: [
		{
			name: 'inline codex with subcategories only',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { subcategories: { AI: ['Tools'] } },"),
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: createNodeCode('codex: {  },'),
		},
		{
			name: 'inline codex with categories and subcategories',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['AI'], subcategories: { AI: ['Root Nodes'] } },"),
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: createNodeCode("codex: { categories: ['AI'] },"),
		},
		{
			name: 'subcategories declared as a bare array instead of a category map',
			filename: 'TestNode.node.ts',
			code: createNodeCode(
				"codex: { categories: ['AI'], subcategories: ['Agents & Tools', 'Tools'] },",
			),
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: createNodeCode("codex: { categories: ['AI'] },"),
		},
		{
			name: 'nested codex under usableAsTool.replacements',
			filename: 'TestNode.node.ts',
			code: createNodeCode(
				"usableAsTool: { replacements: { codex: { subcategories: { AI: ['Tools'] } } } },",
			),
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: createNodeCode('usableAsTool: { replacements: { codex: {  } } },'),
		},
		{
			name: '.node.json file declaring subcategories',
			filename: 'TestNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"], "subcategories": { "Core Nodes": ["Helpers"] } }',
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"] }',
		},
		{
			name: 'importing an unrelated module does not exempt the node',
			filename: 'TestNode.node.ts',
			code: createNodeCode(
				"codex: { subcategories: { AI: ['Tools'] } },",
				"import { Foo } from 'some-other-package';",
			),
			errors: [{ messageId: 'subcategoriesNotAllowed' }],
			output: createNodeCode('codex: {  },', "import { Foo } from 'some-other-package';"),
		},
	],
});
