import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectAiNodes } from '../detect-ai-nodes';

function wf(nodes: Array<{ name: string; type: string }>): WorkflowJSON {
	return {
		name: 'Test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		})),
		connections: {},
	} as unknown as WorkflowJSON;
}

describe('detectAiNodes', () => {
	it('returns isAiWorkflow=true when workflow contains a langchain node', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			]),
		);
		expect(result.isAiWorkflow).toBe(true);
		expect(result.aiNodeNames).toEqual(['Agent']);
		expect(result.alreadyConfigured).toBe(false);
	});

	it('returns isAiWorkflow=false when no langchain nodes are present', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			]),
		);
		expect(result.isAiWorkflow).toBe(false);
		expect(result.aiNodeNames).toEqual([]);
		expect(result.alreadyConfigured).toBe(false);
	});

	it('returns alreadyConfigured=true when EvaluationTrigger is already in the workflow', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' },
			]),
		);
		expect(result.alreadyConfigured).toBe(true);
	});

	it('returns alreadyConfigured=true when Evaluation node is already in the workflow', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'Eval', type: 'n8n-nodes-base.evaluation' },
			]),
		);
		expect(result.alreadyConfigured).toBe(true);
	});

	it('collects all langchain node names', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			]),
		);
		expect(result.aiNodeNames).toEqual(['Agent', 'Memory']);
	});
});
