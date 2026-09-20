import { RuleTester } from '@typescript-eslint/rule-tester';
import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { createRule } from '../utils/index.js';
import { rules } from './index.js';

const ruleTester = new RuleTester();

const missingRule = createRule({
	name: 'no-logic-or-flow-nodes',
	meta: {
		type: 'problem',
		docs: { description: 'Reject Logic and Flow community nodes' },
		messages: { logicOrFlowNode: 'Logic and Flow nodes are not allowed' },
		schema: [],
	},
	defaultOptions: [],
	create: () => ({}),
});

const noLogicOrFlowNodesRule: AnyRuleModule =
	Object.entries(rules).find(([name]) => name === 'no-logic-or-flow-nodes')?.[1] ?? missingRule;

function createNodeMetadata(category: string): string {
	return `{
		"node": "n8n-nodes-example.example",
		"nodeVersion": "1.0",
		"codexVersion": "1.0",
		"categories": ["${category}"]
	}`;
}

ruleTester.run('no-logic-or-flow-nodes', noLogicOrFlowNodesRule, {
	valid: [
		{
			name: 'integration node',
			filename: 'Example.node.json',
			code: createNodeMetadata('Productivity'),
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
	],
});
