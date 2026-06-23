import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { ensureWebhookIds, preserveExistingNodeGroupIds } from '../workflow-json-utils';

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

describe('preserveExistingNodeGroupIds', () => {
	const buildWorkflow = (groupId: string): WorkflowJSON => ({
		name: 'Grouped workflow',
		nodes: [],
		connections: {},
		nodeGroups: [{ id: groupId, name: 'Group 1', nodeIds: ['node-a'] }],
	});

	const contextWithExisting = (nodeGroups: Array<{ id: string; name: string }>) =>
		({
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockResolvedValue({
					name: 'Grouped workflow',
					nodes: [],
					connections: {},
					nodeGroups: nodeGroups.map((g) => ({ ...g, nodeIds: [] })),
				}),
			},
		}) as unknown as InstanceAiContext;

	it('reuses the existing group id when the group name matches', async () => {
		const workflow = buildWorkflow('deterministic-id');

		await preserveExistingNodeGroupIds(
			workflow,
			'wf-1',
			contextWithExisting([{ id: 'editor-id', name: 'Group 1' }]),
		);

		expect(workflow.nodeGroups?.[0]?.id).toBe('editor-id');
	});

	it('keeps the generated id for a group not present in the existing workflow', async () => {
		const workflow = buildWorkflow('deterministic-id');

		await preserveExistingNodeGroupIds(
			workflow,
			'wf-1',
			contextWithExisting([{ id: 'other-id', name: 'Some Other Group' }]),
		);

		expect(workflow.nodeGroups?.[0]?.id).toBe('deterministic-id');
	});

	it('does not fetch or modify groups for new workflows (no workflowId)', async () => {
		const workflow = buildWorkflow('deterministic-id');
		const getAsWorkflowJSON = vi.fn();
		const context = { workflowService: { getAsWorkflowJSON } } as unknown as InstanceAiContext;

		await preserveExistingNodeGroupIds(workflow, undefined, context);

		expect(getAsWorkflowJSON).not.toHaveBeenCalled();
		expect(workflow.nodeGroups?.[0]?.id).toBe('deterministic-id');
	});

	it('fails updates when the existing workflow cannot be loaded', async () => {
		const workflow = buildWorkflow('deterministic-id');
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(preserveExistingNodeGroupIds(workflow, 'wf-1', context)).rejects.toThrow(
			'Failed to load existing workflow wf-1 to preserve node-group IDs: Workflow not found',
		);
	});
});
