import { allNodesConnected } from './all-nodes-connected';
import type { WorkflowResponse } from '../../clients/n8n-client';

function workflowWithNodes(nodes: WorkflowResponse['nodes']): WorkflowResponse {
	return { id: 'wf-1', name: 'Test', active: false, versionId: 'v1', nodes, connections: {} };
}

describe('allNodesConnected', () => {
	it('accepts a webpage node, which has no inputs or outputs', async () => {
		const workflow = workflowWithNodes([
			{ name: 'Landing Page', type: 'n8n-nodes-base.webpage', parameters: {} },
		]);

		const result = await allNodesConnected.run(workflow, { prompt: 'Build a landing page' });

		expect(result.pass).toBe(true);
	});

	it('still reports other disconnected nodes', async () => {
		const workflow = workflowWithNodes([
			{ name: 'Landing Page', type: 'n8n-nodes-base.webpage', parameters: {} },
			{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} },
		]);

		const result = await allNodesConnected.run(workflow, { prompt: 'Build a landing page' });

		expect(result).toEqual({ pass: false, comment: 'Disconnected nodes: Set' });
	});
});
