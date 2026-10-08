import type { IConnections, INode, INodeTypeDescription } from 'n8n-workflow';

import { assertWorkflowRunsOnEngineV2 } from '../instance-ai-engine-v2-support';

const descriptions = [
	{ name: 'n8n-nodes-base.manualTrigger', inputs: [], outputs: ['main'] },
	{ name: 'n8n-nodes-base.set', inputs: ['main'], outputs: ['main'] },
	{ name: 'n8n-nodes-base.code', inputs: ['main'], outputs: ['main'] },
	{
		name: '@n8n/n8n-nodes-langchain.agent',
		inputs: ['main', { type: 'ai_languageModel', required: true }],
		outputs: ['main'],
	},
] as unknown as INodeTypeDescription[];

function node(name: string, type: string, extra: Partial<INode> = {}): INode {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters: {}, ...extra };
}

function chain(...names: string[]): IConnections {
	const connections: IConnections = {};
	for (let i = 0; i < names.length - 1; i++) {
		connections[names[i]] = { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] };
	}
	return connections;
}

describe('assertWorkflowRunsOnEngineV2', () => {
	it('accepts a chain of supported nodes', async () => {
		await expect(
			assertWorkflowRunsOnEngineV2(
				{
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
					],
					connections: chain('Trigger', 'Set'),
				},
				descriptions,
			),
		).resolves.toBeUndefined();
	});

	it('names every unsupported node type', async () => {
		await expect(
			assertWorkflowRunsOnEngineV2(
				{
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Code', 'n8n-nodes-base.code'),
						node('Agent', '@n8n/n8n-nodes-langchain.agent'),
					],
					connections: chain('Trigger', 'Code', 'Agent'),
				},
				descriptions,
			),
		).rejects.toThrow(
			/"Code" \(n8n-nodes-base.code\).*"Agent" \(@n8n\/n8n-nodes-langchain.agent\)/s,
		);
	});

	it('ignores a disabled unsupported node', async () => {
		await expect(
			assertWorkflowRunsOnEngineV2(
				{
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Code', 'n8n-nodes-base.code', { disabled: true }),
					],
					connections: chain('Trigger', 'Code'),
				},
				descriptions,
			),
		).resolves.toBeUndefined();
	});

	it('reports a graph shape the converter refuses', async () => {
		await expect(
			assertWorkflowRunsOnEngineV2(
				{
					nodes: [
						node('Trigger', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set', { onError: 'continueErrorOutput' }),
					],
					connections: chain('Trigger', 'Set'),
				},
				descriptions,
			),
		).rejects.toThrow(/engine v2/i);
	});

	it('checks the graph from each trigger of a multi-trigger workflow', async () => {
		await expect(
			assertWorkflowRunsOnEngineV2(
				{
					nodes: [
						node('Trigger A', 'n8n-nodes-base.manualTrigger'),
						node('Trigger B', 'n8n-nodes-base.manualTrigger'),
						node('Set', 'n8n-nodes-base.set'),
					],
					connections: { ...chain('Trigger A', 'Set'), ...chain('Trigger B', 'Set') },
				},
				descriptions,
			),
		).resolves.toBeUndefined();
	});
});
