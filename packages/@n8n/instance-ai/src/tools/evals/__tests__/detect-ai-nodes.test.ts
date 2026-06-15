import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectAiNodes } from '../detect-ai-nodes';

function wf(
	nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>,
): WorkflowJSON {
	return {
		name: 'Test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: n.parameters ?? {},
		})),
		connections: {},
	} as unknown as WorkflowJSON;
}

describe('detectAiNodes', () => {
	it('returns langchain node names when workflow contains AI nodes', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			]),
		);
		expect(result.aiNodeNames).toEqual(['Agent']);
	});

	it('returns an empty list when no langchain nodes are present', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			]),
		);
		expect(result.aiNodeNames).toEqual([]);
	});

	it('collects only root agent names — sub-components (memory, models, tools) are excluded', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' },
				{ name: 'Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				{ name: 'Search Tool', type: '@n8n/n8n-nodes-langchain.toolSerpApi' },
				{ name: 'Embeddings', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			]),
		);
		expect(result.aiNodeNames).toEqual(['Agent']);
	});

	it('collects multiple root agents in a multi-agent workflow', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Categorizer Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				{ name: 'Responder Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			]),
		);
		expect(result.aiNodeNames).toEqual(['Categorizer Agent', 'Responder Agent']);
	});

	it('flags alreadyConfigured when an EvaluationTrigger is present', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' },
			]),
		);
		expect(result.alreadyConfigured).toBe(true);
	});

	it('flags alreadyConfigured when an Evaluation node is present', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'Eval', type: 'n8n-nodes-base.evaluation' },
			]),
		);
		expect(result.alreadyConfigured).toBe(true);
	});

	it('does not flag alreadyConfigured for a clean AI workflow', () => {
		const result = detectAiNodes(wf([{ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }]));
		expect(result.alreadyConfigured).toBe(false);
	});

	describe('fallback for unrecognized langchain nodes', () => {
		it('detects @n8n/n8n-nodes-langchain.agentTool as a fallback AI node', () => {
			// agentTool is an agent variant — its local name starts with "agent",
			// which is not a sub-component prefix, so the fallback path includes it.
			const result = detectAiNodes(
				wf([{ name: 'AgentTool', type: '@n8n/n8n-nodes-langchain.agentTool' }]),
			);
			expect(result.isAiWorkflow).toBe(true);
			expect(result.aiNodeNames).toEqual(['AgentTool']);
		});

		it('falls back to any non-sub-component langchain node when no root matches', () => {
			// Hypothetical future node type not in the allow-list, not matching a sub-component prefix.
			const result = detectAiNodes(
				wf([{ name: 'Future', type: '@n8n/n8n-nodes-langchain.futureRootType' }]),
			);
			expect(result.isAiWorkflow).toBe(true);
			expect(result.aiNodeNames).toEqual(['Future']);
		});

		it('does not fall back when only sub-components are present', () => {
			const result = detectAiNodes(
				wf([
					{ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' },
					{ name: 'Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				]),
			);
			expect(result.isAiWorkflow).toBe(false);
			expect(result.aiNodeNames).toEqual([]);
		});

		it('prefers root types over fallback candidates when both present', () => {
			const result = detectAiNodes(
				wf([
					{ name: 'Future', type: '@n8n/n8n-nodes-langchain.futureRootType' },
					{ name: 'Real Agent', type: '@n8n/n8n-nodes-langchain.agent' },
				]),
			);
			expect(result.aiNodeNames).toEqual(['Real Agent']);
		});
	});
});
