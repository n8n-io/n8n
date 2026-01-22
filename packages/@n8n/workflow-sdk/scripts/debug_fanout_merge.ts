import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCode } from '../src/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

const workflow: WorkflowJSON = {
	id: 'multi-trigger-test',
	name: 'Multiple Triggers Test',
	nodes: [
		{
			id: '1',
			name: 'TriggerA',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, -100],
			parameters: {},
		},
		{
			id: '2',
			name: 'TriggerB',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 100],
			parameters: {},
		},
		{
			id: '3',
			name: 'SharedNode',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0],
			parameters: {},
		},
		{
			id: '4',
			name: 'EndNode',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [400, 0],
			parameters: {},
		},
	],
	connections: {
		TriggerA: { main: [[{ node: 'SharedNode', type: 'main', index: 0 }]] },
		TriggerB: { main: [[{ node: 'SharedNode', type: 'main', index: 0 }]] },
		SharedNode: { main: [[{ node: 'EndNode', type: 'main', index: 0 }]] },
	},
};

const code = generateWorkflowCode(workflow);
console.log('=== Generated Code ===');
console.log(code);

const parsed = parseWorkflowCode(code);
console.log('\n=== Parsed Connections ===');
console.log(JSON.stringify(parsed.connections, null, 2));
