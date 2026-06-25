import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import {
	ensureWebhookIds,
	preserveExistingNodeGroupIds,
	preserveExistingSetupValues,
} from '../workflow-json-utils';

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

describe('preserveExistingSetupValues', () => {
	const contextWithExisting = (existingWorkflow: WorkflowJSON) =>
		({
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockResolvedValue(existingWorkflow),
			},
		}) as unknown as InstanceAiContext;

	const workflowWithNodes = (nodes: WorkflowJSON['nodes']): WorkflowJSON => ({
		name: 'Setup workflow',
		nodes,
		connections: {},
	});

	it('preserves a setup-applied parameter when the rebuilt source still has the placeholder', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-email',
				name: 'Email Rain Alert',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: {
					resource: 'message',
					operation: 'send',
					sendTo: '<__PLACEHOLDER_VALUE__Your email address__>',
					subject: 'Rain alert',
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-email',
						name: 'Email Rain Alert',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						position: [0, 0],
						parameters: {
							resource: 'message',
							operation: 'send',
							sendTo: 'person@example.com',
							subject: 'Old subject',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toMatchObject({
			sendTo: 'person@example.com',
			subject: 'Rain alert',
		});
	});

	it('preserves resource-locator setup values as a unit', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-slack',
				name: 'Slack Sunny Day',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [0, 0],
				parameters: {
					resource: 'message',
					operation: 'post',
					select: 'user',
					user: {
						__rl: true,
						mode: 'id',
						value: '<__PLACEHOLDER_VALUE__Select Slack user__>',
						cachedResultName: 'Select Slack user',
					},
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-slack',
						name: 'Slack Sunny Day',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [0, 0],
						parameters: {
							resource: 'message',
							operation: 'post',
							select: 'user',
							user: {
								__rl: true,
								mode: 'username',
								value: 'oleg',
								cachedResultName: 'oleg',
							},
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters?.user).toEqual({
			__rl: true,
			mode: 'username',
			value: 'oleg',
			cachedResultName: 'oleg',
		});
	});

	it('preserves setup-applied values for empty resource locators', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-slack',
				name: 'Send Rain Alert',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [0, 0],
				parameters: {
					resource: 'message',
					operation: 'post',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'id',
						value: '',
						cachedResultName: 'Select channel for rain alerts',
					},
					text: 'Rain expected',
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-slack',
						name: 'Send Rain Alert',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [0, 0],
						parameters: {
							resource: 'message',
							operation: 'post',
							select: 'channel',
							channelId: {
								__rl: true,
								mode: 'name',
								value: '#berlin-weather-rain',
								cachedResultName: '#berlin-weather-rain',
							},
							text: 'Old rain message',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toMatchObject({
			channelId: {
				__rl: true,
				mode: 'name',
				value: '#berlin-weather-rain',
				cachedResultName: '#berlin-weather-rain',
			},
			text: 'Rain expected',
		});
	});

	it('does not preserve when the existing resource locator is also empty', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-slack',
				name: 'Send Rain Alert',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [0, 0],
				parameters: {
					channelId: {
						__rl: true,
						mode: 'id',
						value: '',
						cachedResultName: 'Select new channel',
					},
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-slack',
						name: 'Send Rain Alert',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [0, 0],
						parameters: {
							channelId: {
								__rl: true,
								mode: 'id',
								value: '',
								cachedResultName: 'Select old channel',
							},
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters?.channelId).toEqual({
			__rl: true,
			mode: 'id',
			value: '',
			cachedResultName: 'Select new channel',
		});
	});

	it('does not override concrete values from the rebuilt source', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-email',
				name: 'Email Rain Alert',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: {
					sendTo: 'new-person@example.com',
					subject: 'Updated subject',
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-email',
						name: 'Email Rain Alert',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						position: [0, 0],
						parameters: {
							sendTo: 'old-person@example.com',
							subject: 'Old subject',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toMatchObject({
			sendTo: 'new-person@example.com',
			subject: 'Updated subject',
		});
	});

	it('does not replace an entire authored string when it only embeds a placeholder', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-http',
				name: 'Custom API Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.4,
				position: [0, 0],
				parameters: {
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer <__PLACEHOLDER_VALUE__API token__>',
							},
						],
					},
				},
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-http',
						name: 'Custom API Call',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.4,
						position: [0, 0],
						parameters: {
							sendHeaders: true,
							headerParameters: {
								parameters: [{ name: 'Authorization', value: 'Bearer old-token' }],
							},
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toMatchObject({
			headerParameters: {
				parameters: [
					{
						name: 'Authorization',
						value: 'Bearer <__PLACEHOLDER_VALUE__API token__>',
					},
				],
			},
		});
	});

	it('does not preserve setup values across renamed nodes', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-email',
				name: 'New Email Node',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.1,
				position: [0, 0],
				parameters: { sendTo: '<__PLACEHOLDER_VALUE__Your email address__>' },
			},
		]);

		await preserveExistingSetupValues(
			workflow,
			'wf-1',
			contextWithExisting(
				workflowWithNodes([
					{
						id: 'old-email',
						name: 'Email Rain Alert',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						position: [0, 0],
						parameters: { sendTo: 'person@example.com' },
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toMatchObject({
			sendTo: '<__PLACEHOLDER_VALUE__Your email address__>',
		});
	});

	it('does not fetch existing workflow for new workflow builds', async () => {
		const workflow = workflowWithNodes([]);
		const getAsWorkflowJSON = vi.fn();
		const context = { workflowService: { getAsWorkflowJSON } } as unknown as InstanceAiContext;

		await preserveExistingSetupValues(workflow, undefined, context);

		expect(getAsWorkflowJSON).not.toHaveBeenCalled();
	});

	it('fails updates when existing setup values cannot be loaded', async () => {
		const workflow = workflowWithNodes([]);
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(preserveExistingSetupValues(workflow, 'wf-1', context)).rejects.toThrow(
			'Failed to load existing workflow wf-1 to preserve setup values: Workflow not found',
		);
	});
});
