import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoLogicOrFlowNodesRule } from './no-logic-or-flow-nodes.js';

const ruleTester = new RuleTester();

function createNodeMetadata(category: string): string {
	return `{
		"node": "n8n-nodes-example.example",
		"nodeVersion": "1.0",
		"codexVersion": "1.0",
		"categories": ["${category}"]
	}`;
}

ruleTester.run('no-logic-or-flow-nodes', NoLogicOrFlowNodesRule, {
	valid: [
		{
			name: 'integration node',
			filename: 'Example.node.json',
			code: createNodeMetadata('Productivity'),
		},
		{
			name: 'integration node with other subcategories',
			filename: 'Example.node.json',
			code: '{ "categories": ["Core Nodes"], "subcategories": { "Core Nodes": ["Other"] } }',
		},
		{
			name: 'other JSON file',
			filename: 'Example.json',
			code: createNodeMetadata('Flow'),
		},
	],
	invalid: [
		{
			name: 'Logic node',
			filename: 'Example.node.json',
			code: createNodeMetadata('Logic'),
			errors: [{ messageId: 'logicOrFlowNode' }],
		},
		{
			name: 'Flow node',
			filename: 'Example.node.json',
			code: createNodeMetadata('Flow'),
			errors: [{ messageId: 'logicOrFlowNode' }],
		},
		{
			name: 'Flow subcategory in core nodes',
			filename: 'Example.node.json',
			code: '{ "categories": ["Core Nodes"], "subcategories": { "Core Nodes": ["Flow"] } }',
			errors: [{ messageId: 'logicOrFlowNode' }],
		},
		{
			name: 'Logic subcategory without categories',
			filename: 'Example.node.json',
			code: '{ "subcategories": { "Core Nodes": ["Logic"] } }',
			errors: [{ messageId: 'logicOrFlowNode' }],
		},
	],
});
