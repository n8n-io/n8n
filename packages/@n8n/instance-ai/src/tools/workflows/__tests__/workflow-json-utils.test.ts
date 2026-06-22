import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { ensureWebhookIds } from '../workflow-json-utils';

describe('ensureWebhookIds', () => {
	it('fails updates when existing webhook IDs cannot be loaded', async () => {
		const workflow: WorkflowJSON = {
			name: 'Webhook workflow',
			nodes: [
				{
					id: 'webhook-1',
					name: 'Incoming Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(ensureWebhookIds(workflow, 'wf-1', context)).rejects.toThrow(
			'Failed to load existing workflow wf-1 to preserve webhook IDs: Workflow not found',
		);
		expect(workflow.nodes[0]?.webhookId).toBeUndefined();
	});
});
