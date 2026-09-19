import { RuleTester } from '@typescript-eslint/rule-tester';
import { vi } from 'vitest';

import { NoAiCodexCategoryRule } from './no-ai-codex-category.js';

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

ruleTester.run('no-ai-codex-category', NoAiCodexCategoryRule, {
	valid: [
		{
			name: 'no codex property at all',
			filename: 'TestNode.node.ts',
			code: createNodeCode(''),
		},
		{
			name: 'codex categories without AI',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['Development', 'Core Nodes'] },"),
		},
		{
			name: 'non-.node.ts / non-.node.json file is ignored',
			filename: 'helpers.ts',
			code: createNodeCode("codex: { categories: ['AI'] },"),
		},
		{
			name: '.node.json file without AI category',
			filename: 'TestNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"] }',
		},
		{
			name: 'AI category is allowed when the node imports @n8n/ai-node-sdk',
			filename: 'AiSdkNode.node.ts',
			code: createNodeCode(
				"codex: { categories: ['AI'] },",
				"import { AiNode } from '@n8n/ai-node-sdk';",
			),
		},
		{
			name: 'AI category is allowed in .node.json when the sibling .node.ts imports @n8n/ai-node-sdk',
			filename: 'AiSdkNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["AI"] }',
		},
		{
			name: ".node.json is ignored when the sibling .node.ts has an inline description.codex (n8n's loader never reads it)",
			filename: 'HasInlineCodex.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["AI"] }',
		},
	],
	invalid: [
		{
			name: 'inline codex categories containing only AI',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['AI'] },"),
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: createNodeCode('codex: { categories: [] },'),
		},
		{
			name: 'inline codex categories containing AI amongst others',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['Development', 'AI', 'Core Nodes'] },"),
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: createNodeCode("codex: { categories: ['Development', 'Core Nodes'] },"),
		},
		{
			name: 'AI as the last element',
			filename: 'TestNode.node.ts',
			code: createNodeCode("codex: { categories: ['Development', 'AI'] },"),
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: createNodeCode("codex: { categories: ['Development'] },"),
		},
		{
			name: 'nested codex under usableAsTool.replacements',
			filename: 'TestNode.node.ts',
			code: createNodeCode("usableAsTool: { replacements: { codex: { categories: ['AI'] } } },"),
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: createNodeCode('usableAsTool: { replacements: { codex: { categories: [] } } },'),
		},
		{
			name: '.node.json file declaring AI category',
			filename: 'TestNode.node.json',
			code: '{ "node": "n8n-nodes-example.testNode", "categories": ["AI", "Core Nodes"] }',
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: '{ "node": "n8n-nodes-example.testNode", "categories": ["Core Nodes"] }',
		},
		{
			name: 'importing an unrelated module does not exempt the node',
			filename: 'TestNode.node.ts',
			code: createNodeCode(
				"codex: { categories: ['AI'] },",
				"import { Foo } from 'some-other-package';",
			),
			errors: [{ messageId: 'aiCategoryNotAllowed' }],
			output: createNodeCode(
				'codex: { categories: [] },',
				"import { Foo } from 'some-other-package';",
			),
		},
	],
});
