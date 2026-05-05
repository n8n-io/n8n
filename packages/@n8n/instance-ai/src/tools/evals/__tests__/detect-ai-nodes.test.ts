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

	it('flags root agents that read another node JSON', () => {
		const result = detectAiNodes(
			wf([
				{ name: 'Telegram Trigger', type: 'n8n-nodes-base.telegramTrigger' },
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					parameters: {
						text: "={{ $('Telegram Trigger').item.json.message.text }}",
					},
				},
			]),
		);
		expect(result.rootAgentReadsOtherNode).toBe(true);
	});

	it('does not flag root agents that only read $json', () => {
		const result = detectAiNodes(
			wf([
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					parameters: { text: '={{ $json.input }}' },
				},
			]),
		);
		expect(result.rootAgentReadsOtherNode).toBe(false);
	});

	it('ignores node JSON references from non-root langchain nodes (e.g. tools)', () => {
		const result = detectAiNodes(
			wf([
				{
					name: 'HttpTool',
					type: '@n8n/n8n-nodes-langchain.httpRequestTool',
					parameters: { url: "={{ $('Workflow Configuration').item.json.targetUrl }}" },
				},
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					parameters: { text: '={{ $json.input }}' },
				},
			]),
		);
		expect(result.rootAgentReadsOtherNode).toBe(false);
	});
});
