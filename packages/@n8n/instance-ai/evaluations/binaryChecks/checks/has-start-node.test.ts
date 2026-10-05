import { hasStartNode } from './has-start-node';
import type { WorkflowResponse } from '../../clients/n8n-client';

function workflowWithNodes(
	nodes: WorkflowResponse['nodes'],
	connections: WorkflowResponse['connections'] = {},
): WorkflowResponse {
	return { id: 'wf-1', name: 'Test', active: false, versionId: 'v1', nodes, connections };
}

describe('hasStartNode', () => {
	it('does not apply to a workflow whose only trigger is a webpage', async () => {
		const workflow = workflowWithNodes([
			{ name: 'Landing Page', type: 'n8n-nodes-base.webpage', parameters: {} },
		]);

		const result = await hasStartNode.run(workflow, { prompt: 'Build a landing page' });

		expect(result).toEqual({ pass: true, applicable: false });
	});

	it('still fails a trigger without downstream nodes next to a webpage', async () => {
		const workflow = workflowWithNodes([
			{ name: 'Landing Page', type: 'n8n-nodes-base.webpage', parameters: {} },
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} },
		]);

		const result = await hasStartNode.run(workflow, { prompt: 'Build a landing page' });

		expect(result.pass).toBe(false);
	});
});
