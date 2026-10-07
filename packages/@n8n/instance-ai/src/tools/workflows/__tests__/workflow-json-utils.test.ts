import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import {
	ensureUniqueNodeIds,
	ensureWebhookIds,
	preserveExistingNodeIds,
	hasLostAllSavedNodeIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
	isWaitGateNode,
	nodeCanReachItself,
	preserveExistingNodeGroupIds,
	preserveExistingSetupValues,
} from '../workflow-json-utils';

describe('trigger detection', () => {
	it('classifies special trigger types via the canonical n8n-workflow detection', () => {
		// These include types that a local suffix-only heuristic would miss.
		expect(isTriggerNodeType('n8n-nodes-base.webhook')).toBe(true);
		expect(isTriggerNodeType('n8n-nodes-base.scheduleTrigger')).toBe(true);
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

describe('ensureUniqueNodeIds', () => {
	const node = (id: string, name: string): WorkflowJSON['nodes'][number] => ({
		id,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [0, 0],
		parameters: {},
	});

	it('leaves a workflow with unique ids untouched', () => {
		const workflow: WorkflowJSON = {
			name: 'Unique',
			nodes: [node('a', 'A'), node('b', 'B')],
			connections: {},
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodes.map((n) => n.id)).toEqual(['a', 'b']);
	});

	it('reassigns later nodes that repeat an id and keeps the first', () => {
		const workflow: WorkflowJSON = {
			name: 'Duplicated',
			nodes: [node('dup', 'A'), node('dup', 'B')],
			connections: {},
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodes[0].id).toBe('dup');
		expect(workflow.nodes[1].id).not.toBe('dup');
		expect(workflow.nodes[1].id).toBeTruthy();
	});

	it('assigns an id to a node that has none', () => {
		const workflow: WorkflowJSON = {
			name: 'Missing',
			nodes: [{ ...node('', 'A') }],
			connections: {},
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodes[0].id).toBeTruthy();
	});

	/**
	 * Group membership is remapped by position rather than through a shared old-id map,
	 * so two nodes that arrived with one id do not both end up pointing at the same
	 * replacement.
	 */
	it('remaps node-group membership for the reassigned node only', () => {
		const workflow: WorkflowJSON = {
			name: 'Duplicated in group',
			nodes: [node('dup', 'A'), node('dup', 'B')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['dup', 'dup'] }],
		};

		ensureUniqueNodeIds(workflow);

		const [first, second] = workflow.nodes;
		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual([first.id, second.id]);
		expect(new Set(workflow.nodeGroups?.[0]?.nodeIds)).toHaveProperty('size', 2);
	});

	it('remaps group membership in order when three nodes share an id', () => {
		const workflow: WorkflowJSON = {
			name: 'Triplicated in group',
			nodes: [node('dup', 'A'), node('dup', 'B'), node('dup', 'C')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['dup', 'dup', 'dup'] }],
		};

		ensureUniqueNodeIds(workflow);

		// Membership must line up with the nodes positionally, not in reverse.
		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual(workflow.nodes.map((n) => n.id));
		expect(new Set(workflow.nodeGroups?.[0]?.nodeIds)).toHaveProperty('size', 3);
	});

	/**
	 * A blank id is reassigned like a duplicate, but nothing retains the original — so the
	 * group's `''` entry has to be rewritten too, or the membership dangles.
	 */
	it('remaps group membership for a node whose id was blank', () => {
		const workflow: WorkflowJSON = {
			name: 'Blank in group',
			nodes: [node('', 'A'), node('b', 'B')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['', 'b'] }],
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual([workflow.nodes[0].id, 'b']);
		expect(workflow.nodeGroups?.[0]?.nodeIds).not.toContain('');
	});

	it('remaps group membership for several nodes whose ids were blank', () => {
		const workflow: WorkflowJSON = {
			name: 'Blanks in group',
			nodes: [node('', 'A'), node('', 'B')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['', ''] }],
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual(workflow.nodes.map((n) => n.id));
		expect(new Set(workflow.nodeGroups?.[0]?.nodeIds)).toHaveProperty('size', 2);
	});

	it('leaves group membership alone when nothing was reassigned', () => {
		const workflow: WorkflowJSON = {
			name: 'Unique in group',
			nodes: [node('a', 'A'), node('b', 'B')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['a', 'b'] }],
		};

		ensureUniqueNodeIds(workflow);

		expect(workflow.nodeGroups?.[0]?.nodeIds).toEqual(['a', 'b']);
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

	/**
	 * The case Oleg found: a node the agent added in an earlier build has no `id` in the
	 * source file (nothing writes it back), so every rebuild from that file mints a fresh
	 * one. Recovering it by name keeps the identity the save already assigned.
	 */
	it('recovers the saved id of a node whose source declares none', async () => {
		const saved: WorkflowJSON = {
			name: 'Saved',
			nodes: [node('saved-trigger', 'Trigger'), node('assigned-on-first-build', 'Added')],
			connections: {},
		};
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('saved-trigger', 'Trigger'), node('fresh-uuid', 'Added')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes.find((n) => n.name === 'Added')?.id).toBe('assigned-on-first-build');
		expect(rebuilt.nodes.find((n) => n.name === 'Trigger')?.id).toBe('saved-trigger');
	});

	it('leaves a node that already carries a saved id untouched', async () => {
		const saved: WorkflowJSON = {
			name: 'Saved',
			nodes: [node('a', 'A'), node('b', 'B')],
			connections: {},
		};
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('a', 'A'), node('b', 'B')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes.map((n) => n.id)).toEqual(['a', 'b']);
	});

	/** A declared id is authoritative: a rename must follow the id, not be undone by name. */
	it('keeps a declared id when the node was renamed', async () => {
		const saved: WorkflowJSON = { name: 'Saved', nodes: [node('a', 'Old')], connections: {} };
		const rebuilt: WorkflowJSON = { name: 'Rebuilt', nodes: [node('a', 'New')], connections: {} };

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes[0].id).toBe('a');
		expect(rebuilt.nodes[0].name).toBe('New');
	});

	/** A new node must not inherit the id of a node that merely gave up its name. */
	it('does not hand a saved id to a new node that reused a renamed node name', async () => {
		const saved: WorkflowJSON = { name: 'Saved', nodes: [node('a', 'Old')], connections: {} };
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('a', 'New'), node('fresh', 'Old')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes.find((n) => n.name === 'New')?.id).toBe('a');
		expect(rebuilt.nodes.find((n) => n.name === 'Old')?.id).toBe('fresh');
	});

	/**
	 * Durable state is type-specific — a poll cursor belongs to a poll trigger — so identity must
	 * never cross node types, even when the name matches.
	 */
	it('does not recover a saved id across a different node type', async () => {
		const saved: WorkflowJSON = {
			name: 'Saved',
			nodes: [
				{
					id: 'saved-poller',
					name: 'Watcher',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1.2,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('fresh', 'Watcher')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes[0].id).toBe('fresh');
	});

	/**
	 * The limit of name recovery, kept as an explicit expectation rather than left implied.
	 *
	 * If a rename drops the node's id, the renamed node and a new node reusing the old name both
	 * arrive with ids the saved workflow has never seen, and nothing distinguishes them — the same
	 * shape as "the agent added a node", which recovery exists to serve. So the saved id follows
	 * the name. Carrying the id in the source (the documented contract, and what `get-as-code`
	 * emits) is what makes this case correct instead.
	 */
	it('follows the name when a rename dropped the id, which can move identity', async () => {
		const saved: WorkflowJSON = { name: 'Saved', nodes: [node('a', 'Old')], connections: {} };
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('minted-1', 'New'), node('minted-2', 'Old')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes.find((n) => n.name === 'Old')?.id).toBe('a');
		expect(rebuilt.nodes.find((n) => n.name === 'New')?.id).toBe('minted-1');
	});

	it('leaves a genuinely new node with its fresh id', async () => {
		const saved: WorkflowJSON = { name: 'Saved', nodes: [node('a', 'A')], connections: {} };
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('a', 'A'), node('fresh', 'Brand New')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes.find((n) => n.name === 'Brand New')?.id).toBe('fresh');
	});

	it('self-heals an id the agent mangled', async () => {
		const saved: WorkflowJSON = { name: 'Saved', nodes: [node('saved-a', 'Get')], connections: {} };
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('saved-aX', 'Get')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodes[0].id).toBe('saved-a');
	});

	it('remaps node-group membership onto a recovered id', async () => {
		const saved: WorkflowJSON = {
			name: 'Saved',
			nodes: [node('saved-added', 'Added')],
			connections: {},
		};
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('fresh', 'Added')],
			connections: {},
			nodeGroups: [{ id: 'g1', name: 'Group 1', nodeIds: ['fresh'] }],
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		expect(rebuilt.nodeGroups?.[0]?.nodeIds).toEqual(['saved-added']);
	});

	it('keeps every id unique after recovery', async () => {
		const saved: WorkflowJSON = {
			name: 'Saved',
			nodes: [node('a', 'A'), node('b', 'B')],
			connections: {},
		};
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('fresh-1', 'A'), node('fresh-2', 'B')],
			connections: {},
		};

		await preserveExistingNodeIds(rebuilt, 'wf-1', contextWithExisting(saved));

		const ids = rebuilt.nodes.map((n) => n.id);
		expect(ids).toEqual(['a', 'b']);
		expect(new Set(ids).size).toBe(2);
	});

	it('does not fetch or change anything for a new workflow', async () => {
		const context = contextWithExisting({ name: 'Saved', nodes: [], connections: {} });
		const rebuilt: WorkflowJSON = { name: 'New', nodes: [node('x', 'A')], connections: {} };

		await preserveExistingNodeIds(rebuilt, undefined, context);

		expect(context.workflowService.getAsWorkflowJSON).not.toHaveBeenCalled();
		expect(rebuilt.nodes[0].id).toBe('x');
	});

	it('leaves ids alone when the saved workflow has none to recover', async () => {
		const context = contextWithExisting({ name: 'Saved', nodes: [], connections: {} });
		const rebuilt: WorkflowJSON = { name: 'R', nodes: [node('fresh', 'A')], connections: {} };

		await preserveExistingNodeIds(rebuilt, 'wf-1', context);

		expect(rebuilt.nodes[0].id).toBe('fresh');
	});
});

/**
 * The structural fix only holds while the agent carries `id` lines through its edits.
 * A full rewrite that drops them all re-identifies the graph, so surface it rather than
 * guessing identities back by name.
 */
describe('hasLostAllSavedNodeIds', () => {
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

	const saved: WorkflowJSON = {
		name: 'Saved',
		nodes: [node('saved-a', 'A'), node('saved-b', 'B')],
		connections: {},
	};

	it('reports loss when no rebuilt node carries a saved id', async () => {
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('fresh-1', 'A'), node('fresh-2', 'B')],
			connections: {},
		};

		await expect(hasLostAllSavedNodeIds(rebuilt, 'wf-1', contextWithExisting(saved))).resolves.toBe(
			true,
		);
	});

	it('reports no loss when at least one saved id survives', async () => {
		const rebuilt: WorkflowJSON = {
			name: 'Rebuilt',
			nodes: [node('saved-a', 'A'), node('fresh-2', 'B')],
			connections: {},
		};

		await expect(hasLostAllSavedNodeIds(rebuilt, 'wf-1', contextWithExisting(saved))).resolves.toBe(
			false,
		);
	});

	it('reports no loss for a new workflow', async () => {
		const context = contextWithExisting(saved);

		await expect(
			hasLostAllSavedNodeIds(
				{ name: 'New', nodes: [node('x', 'A')], connections: {} },
				undefined,
				context,
			),
		).resolves.toBe(false);
		expect(context.workflowService.getAsWorkflowJSON).not.toHaveBeenCalled();
	});

	it('reports no loss when the saved workflow had no node ids to keep', async () => {
		const context = contextWithExisting({ name: 'Saved', nodes: [], connections: {} });

		await expect(
			hasLostAllSavedNodeIds(
				{ name: 'R', nodes: [node('x', 'A')], connections: {} },
				'wf-1',
				context,
			),
		).resolves.toBe(false);
	});

	it('stays silent when the saved workflow cannot be loaded', async () => {
		const context = {
			workflowService: {
				getAsWorkflowJSON: vi.fn().mockRejectedValue(new Error('Workflow not found')),
			},
		} as unknown as InstanceAiContext;

		await expect(
			hasLostAllSavedNodeIds(
				{ name: 'R', nodes: [node('x', 'A')], connections: {} },
				'wf-1',
				context,
			),
		).resolves.toBe(false);
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
