import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import {
	ensureWebhookIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
	isWaitGateNode,
	nodeCanReachItself,
	preserveExistingNodeGroupIds,
	preserveExistingNodeIds,
	preserveExistingSetupValues,
} from '../workflow-json-utils';

describe('trigger detection', () => {
	it('classifies suffix-less trigger types via the canonical n8n-workflow detection', () => {
		// These have no "Trigger" suffix — the old local heuristic missed them.
		expect(isTriggerNodeType('n8n-nodes-base.webhook')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.cron')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.emailReadImap')).toBe(true);
	});

	it('classifies suffixed triggers and rejects non-triggers', () => {
		expect(isTriggerNodeType('n8n-nodes-base.gmailTrigger')).toBe(true);
		expect(isTriggerNodeType('@n8n/n8n-nodes-langchain.chatTrigger')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.slack')).toBe(false);
		expect(isTriggerNodeType(undefined)).toBe(false);
	});

	it('marks only the deterministic-input trigger types as mockable', () => {
		expect(isMockableTriggerNodeType('n8n-nodes-base.manualTrigger')).toBe(true);
		expect(isMockableTriggerNodeType('n8n-nodes-base.webhook')).toBe(true);
		expect(isMockableTriggerNodeType('n8n-nodes-base.formTrigger')).toBe(true);
		expect(isMockableTriggerNodeType('n8n-nodes-base.scheduleTrigger')).toBe(true);
		expect(isMockableTriggerNodeType('@n8n/n8n-nodes-langchain.chatTrigger')).toBe(true);
		expect(isMockableTriggerNodeType('n8n-nodes-base.gmailTrigger')).toBe(false);
		expect(isMockableTriggerNodeType(undefined)).toBe(false);
	});
});

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

describe('preserveExistingNodeIds', () => {
	const node = (id: string, name: string): WorkflowJSON['nodes'][number] => ({
		id,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [0, 0],
		parameters: {},
	});

	const contextWithExisting = (existing: WorkflowJSON) =>
		({
			workflowService: { getAsWorkflowJSON: vi.fn().mockResolvedValue(existing) },
		}) as unknown as InstanceAiContext;

	it('reuses the saved node id when the node name matches', async () => {
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('rebuilt-a', 'Get Cursor'), node('rebuilt-b', 'Compute Window')],
			connections: {},
		};

		await preserveExistingNodeIds(
			workflow,
			'wf-1',
			contextWithExisting({
				name: 'Workflow',
				nodes: [node('saved-a', 'Get Cursor'), node('saved-b', 'Compute Window')],
				connections: {},
			}),
		);

		expect(workflow.nodes.map((n) => n.id)).toEqual(['saved-a', 'saved-b']);
	});

	it('keeps the generated id for a node that is not in the saved workflow', async () => {
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('rebuilt-a', 'Get Cursor'), node('rebuilt-new', 'Log Pull')],
			connections: {},
		};

		await preserveExistingNodeIds(
			workflow,
			'wf-1',
			contextWithExisting({
				name: 'Workflow',
				nodes: [node('saved-a', 'Get Cursor')],
				connections: {},
			}),
		);

		expect(workflow.nodes.map((n) => n.id)).toEqual(['saved-a', 'rebuilt-new']);
	});

	it('remaps node-group membership to the preserved ids', async () => {
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('rebuilt-a', 'Get Cursor'), node('rebuilt-new', 'Log Pull')],
			connections: {},
			nodeGroups: [{ id: 'group-1', name: 'Ingestion', nodeIds: ['rebuilt-a', 'rebuilt-new'] }],
		};

		await preserveExistingNodeIds(
			workflow,
			'wf-1',
			contextWithExisting({
				name: 'Workflow',
				nodes: [node('saved-a', 'Get Cursor')],
				connections: {},
			}),
		);

		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual(['saved-a', 'rebuilt-new']);
	});

	it('does not reuse a saved id that another rebuilt node already carries', async () => {
		// The build kept "Get Cursor" but renamed "Log Pull" to a name the saved
		// workflow used for a different node — reusing that id blindly would emit
		// two nodes with the same id.
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('saved-a', 'Log Pull'), node('rebuilt-b', 'Get Cursor')],
			connections: {},
		};

		await preserveExistingNodeIds(
			workflow,
			'wf-1',
			contextWithExisting({
				name: 'Workflow',
				nodes: [node('saved-a', 'Get Cursor')],
				connections: {},
			}),
		);

		expect(new Set(workflow.nodes.map((n) => n.id)).size).toBe(2);
		expect(workflow.nodes.map((n) => n.name)).toEqual(['Log Pull', 'Get Cursor']);
	});

	it('does not fetch or modify ids for new workflows (no workflowId)', async () => {
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('rebuilt-a', 'Get Cursor')],
			connections: {},
		};
		const getAsWorkflowJSON = vi.fn();
		const context = { workflowService: { getAsWorkflowJSON } } as unknown as InstanceAiContext;

		await preserveExistingNodeIds(workflow, undefined, context);

		expect(getAsWorkflowJSON).not.toHaveBeenCalled();
		expect(workflow.nodes[0]?.id).toBe('rebuilt-a');
	});

	it('fails updates when the existing workflow cannot be loaded', async () => {
		const workflow: WorkflowJSON = {
			name: 'Workflow',
			nodes: [node('rebuilt-a', 'Get Cursor')],
			connections: {},
		};
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(preserveExistingNodeIds(workflow, 'wf-1', context)).rejects.toThrow(
			'Failed to load existing workflow wf-1 to preserve node IDs: Workflow not found',
		);
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

	it('preserves setup-applied values for nested empty resource locators', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-node',
				name: 'Send Message',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [0, 0],
				parameters: {
					targets: [
						{
							channelId: {
								__rl: true,
								mode: 'id',
								value: '',
								cachedResultName: 'Select channel',
							},
						},
					],
					options: {
						fallbackChannel: {
							__rl: true,
							mode: 'id',
							value: '',
							cachedResultName: 'Select fallback channel',
						},
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
						id: 'old-node',
						name: 'Send Message',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.3,
						position: [0, 0],
						parameters: {
							targets: [
								{
									channelId: {
										__rl: true,
										mode: 'name',
										value: '#alerts',
										cachedResultName: '#alerts',
									},
								},
							],
							options: {
								fallbackChannel: {
									__rl: true,
									mode: 'name',
									value: '#fallback',
									cachedResultName: '#fallback',
								},
							},
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters).toEqual({
			targets: [
				{
					channelId: {
						__rl: true,
						mode: 'name',
						value: '#alerts',
						cachedResultName: '#alerts',
					},
				},
			],
			options: {
				fallbackChannel: {
					__rl: true,
					mode: 'name',
					value: '#fallback',
					cachedResultName: '#fallback',
				},
			},
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

	it('does not preserve resource locators from incompatible existing values', async () => {
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
						cachedResultName: 'Select channel',
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
							channelId: '#old-channel',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters?.channelId).toEqual({
			__rl: true,
			mode: 'id',
			value: '',
			cachedResultName: 'Select channel',
		});
	});

	it('does not replace rebuilt objects with incompatible existing scalar values', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-http',
				name: 'Custom API Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.4,
				position: [0, 0],
				parameters: {
					options: {
						url: '<__PLACEHOLDER_VALUE__API URL__>',
						method: 'POST',
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
							options: 'https://old.example.com',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters?.options).toEqual({
			url: '<__PLACEHOLDER_VALUE__API URL__>',
			method: 'POST',
		});
	});

	it('does not replace rebuilt arrays with incompatible existing scalar values', async () => {
		const workflow = workflowWithNodes([
			{
				id: 'new-http',
				name: 'Custom API Call',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.4,
				position: [0, 0],
				parameters: {
					headers: [
						{
							name: 'Authorization',
							value: '<__PLACEHOLDER_VALUE__API token__>',
						},
					],
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
							headers: 'Bearer old-token',
						},
					},
				]),
			),
		);

		expect(workflow.nodes[0]?.parameters?.headers).toEqual([
			{
				name: 'Authorization',
				value: '<__PLACEHOLDER_VALUE__API token__>',
			},
		]);
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

describe('isWaitGateNode', () => {
	const node = (
		type: string,
		parameters: Record<string, unknown> = {},
	): WorkflowJSON['nodes'][number] =>
		({
			id: 'node-1',
			name: 'Node',
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters,
		}) as WorkflowJSON['nodes'][number];

	it('detects send-and-wait operations and pausing node types', () => {
		expect(isWaitGateNode(node('n8n-nodes-base.gmail', { operation: 'sendAndWait' }))).toBe(true);
		expect(isWaitGateNode(node('n8n-nodes-base.slack', { operation: 'sendAndWait' }))).toBe(true);
		expect(isWaitGateNode(node('n8n-nodes-base.wait'))).toBe(true);
		expect(isWaitGateNode(node('n8n-nodes-base.form'))).toBe(true);
	});

	it('rejects ordinary operations and node types', () => {
		expect(isWaitGateNode(node('n8n-nodes-base.gmail', { operation: 'send' }))).toBe(false);
		expect(isWaitGateNode(node('n8n-nodes-base.set'))).toBe(false);
	});
});

describe('nodeCanReachItself', () => {
	const withConnections = (connections: Record<string, unknown>): WorkflowJSON =>
		({ name: 'test', nodes: [], connections }) as unknown as WorkflowJSON;
	const main = (...targets: string[]) => ({
		main: [targets.map((target) => ({ node: target, type: 'main', index: 0 }))],
	});

	it('finds nodes on a revision loop and spares the terminal branch', () => {
		const json = withConnections({
			Format: main('Email'),
			Email: main('Approved?'),
			'Approved?': {
				main: [
					[{ node: 'Publish', type: 'main', index: 0 }],
					[{ node: 'Revise', type: 'main', index: 0 }],
				],
			},
			Revise: main('Format'),
		});

		expect(nodeCanReachItself(json, 'Email')).toBe(true);
		expect(nodeCanReachItself(json, 'Revise')).toBe(true);
		expect(nodeCanReachItself(json, 'Publish')).toBe(false);
	});

	it('returns false on acyclic graphs and unknown nodes', () => {
		const json = withConnections({ A: main('B'), B: main('C') });

		expect(nodeCanReachItself(json, 'B')).toBe(false);
		expect(nodeCanReachItself(json, 'Missing')).toBe(false);
	});
});
