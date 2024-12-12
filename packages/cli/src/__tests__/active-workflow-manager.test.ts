import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type {
	WorkflowParameters,
	INode,
	INodeType,
	INodeTypeDescription,
	WorkflowActivateMode,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { NodeTypes } from '@/node-types';

describe('ActiveWorkflowManager', () => {
	let activeWorkflowManager: ActiveWorkflowManager;
	const instanceSettings = mock<InstanceSettings>();
	const nodeTypes = mock<NodeTypes>();

	beforeEach(() => {
		jest.clearAllMocks();
		activeWorkflowManager = new ActiveWorkflowManager(
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			nodeTypes,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			instanceSettings,
			mock(),
		);
	});

	describe('checkIfWorkflowCanBeActivated', () => {
		const disabledNode = mock<INode>({ type: 'triggerNode', disabled: true });
		const unknownNode = mock<INode>({ type: 'unknownNode' });
		const noTriggersNode = mock<INode>({ type: 'noTriggersNode' });
		const pollNode = mock<INode>({ type: 'pollNode' });
		const triggerNode = mock<INode>({ type: 'triggerNode' });
		const webhookNode = mock<INode>({ type: 'webhookNode' });

		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			// TODO: getByNameAndVersion signature needs to be updated to allow returning undefined
			if (type === 'unknownNode') return undefined as unknown as INodeType;
			const partial: Partial<INodeType> = {
				poll: undefined,
				trigger: undefined,
				webhook: undefined,
				description: mock<INodeTypeDescription>({
					properties: [],
				}),
			};
			if (type === 'pollNode') partial.poll = jest.fn();
			if (type === 'triggerNode') partial.trigger = jest.fn();
			if (type === 'webhookNode') partial.webhook = jest.fn();
			return mock(partial);
		});

		test.each([
			['should skip disabled nodes', disabledNode, [], false],
			['should skip nodes marked as ignored', triggerNode, ['triggerNode'], false],
			['should skip unknown nodes', unknownNode, [], false],
			['should skip nodes with no trigger method', noTriggersNode, [], false],
			['should activate if poll method exists', pollNode, [], true],
			['should activate if trigger method exists', triggerNode, [], true],
			['should activate if webhook method exists', webhookNode, [], true],
		])('%s', async (_, node, ignoredNodes, expected) => {
			const workflow = new Workflow(mock<WorkflowParameters>({ nodeTypes, nodes: [node] }));
			const canBeActivated = activeWorkflowManager.checkIfWorkflowCanBeActivated(
				workflow,
				ignoredNodes,
			);
			expect(canBeActivated).toBe(expected);
		});
	});

	describe('shouldAddWebhooks', () => {
		describe('if leader', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: true, isFollower: false });
			});

			test('should return `true` for `init`', () => {
				// ensure webhooks are populated on init: https://github.com/n8n-io/n8n/pull/8830
				const result = activeWorkflowManager.shouldAddWebhooks('init');
				expect(result).toBe(true);
			});

			test('should return `false` for `leadershipChange`', () => {
				const result = activeWorkflowManager.shouldAddWebhooks('leadershipChange');
				expect(result).toBe(false);
			});

			test('should return `true` for `update` or `activate`', () => {
				const modes = ['update', 'activate'] as WorkflowActivateMode[];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(true);
				}
			});
		});

		describe('if follower', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: false, isFollower: true });
			});

			test('should return `false` for `update` or `activate`', () => {
				const modes = ['update', 'activate'] as WorkflowActivateMode[];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(false);
				}
			});
		});
	});
});
