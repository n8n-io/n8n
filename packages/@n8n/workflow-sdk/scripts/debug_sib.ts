import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

// Test 1: basic SplitInBatches with cycle
const workflow1: WorkflowJSON = {
	id: 'sib-test',
	name: 'SplitInBatches Test',
	nodes: [
		{
			id: '1',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'Loop',
			type: 'n8n-nodes-base.splitInBatches',
			typeVersion: 3,
			position: [200, 0],
			parameters: {},
		},
		{
			id: '3',
			name: 'Process',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [400, 100],
			parameters: {},
		},
		{
			id: '4',
			name: 'Done',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [400, -100],
			parameters: {},
		},
	],
	connections: {
		Trigger: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
		Loop: {
			main: [
				[{ node: 'Done', type: 'main', index: 0 }],
				[{ node: 'Process', type: 'main', index: 0 }],
			],
		},
		Process: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
	},
};

console.log('=== Test 1: SplitInBatches with cycle ===');
const code1 = generateWorkflowCode(workflow1);
console.log('Generated code:');
console.log(code1);
console.log('\nParsed connections:');
const parsed1 = parseWorkflowCode(code1);
console.log(JSON.stringify(parsed1.connections, null, 2));
