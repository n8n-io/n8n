import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { proposeDefaultMetricIds } from '../metric-catalog';

type WorkflowNode = WorkflowJSON['nodes'][number];

const wf = (nodes: WorkflowNode[]): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections: {},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

describe('metric-catalog', () => {
	describe('proposeDefaultMetricIds', () => {
		it('returns ["correctness"] when the agent has no tools', () => {
			const workflow = wf([
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
					id: 'a',
				},
			]);
			expect(proposeDefaultMetricIds(workflow, 'Agent')).toEqual(['correctness']);
		});

		it('returns ["correctness", "tool_use"] when an ai_tool connection feeds the agent', () => {
			const workflow: WorkflowJSON = {
				name: 't',
				nodes: [
					{
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						parameters: {},
						position: [0, 0],
						id: 'a',
					},
					{
						name: 'CalcTool',
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						typeVersion: 1,
						parameters: {},
						position: [200, 0],
						id: 't',
					},
				],
				connections: {
					CalcTool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
				},
				pinData: {},
				settings: {},
			} as unknown as WorkflowJSON;

			expect(proposeDefaultMetricIds(workflow, 'Agent')).toEqual(['correctness', 'tool_use']);
		});
	});
});
