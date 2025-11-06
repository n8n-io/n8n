import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
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
	const instanceSettings = mock<InstanceSettings>({ isMultiMain: false });
	const nodeTypes = mock<NodeTypes>();
	const workflowRepository = mock<WorkflowRepository>();

	beforeEach(() => {
		jest.clearAllMocks();
		activeWorkflowManager = new ActiveWorkflowManager(
			mockLogger(),
			mock(),
			mock(),
			mock(),
			mock(),
			nodeTypes,
			mock(),
			workflowRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			instanceSettings,
			mock(),
			mock(),
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

			test('should return `true` for `leadershipChange`', () => {
				const result = activeWorkflowManager.shouldAddWebhooks('leadershipChange');
				expect(result).toBe(true);
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

		describe('add', () => {
			test.each<[WorkflowActivateMode]>([['init'], ['leadershipChange']])(
				'should skip inactive workflow in `%s` activation mode',
				async (mode) => {
					const checkSpy = jest.spyOn(activeWorkflowManager, 'checkIfWorkflowCanBeActivated');
					const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
					const addTriggersAndPollersSpy = jest.spyOn(
						activeWorkflowManager,
						'addTriggersAndPollers',
					);
					workflowRepository.findById.mockResolvedValue(mock<WorkflowEntity>({ active: false }));

					const added = await activeWorkflowManager.add('some-id', mode);

					expect(checkSpy).not.toHaveBeenCalled();
					expect(addWebhooksSpy).not.toHaveBeenCalled();
					expect(addTriggersAndPollersSpy).not.toHaveBeenCalled();
					expect(added).toEqual({ triggersAndPollers: false, webhooks: false });
				},
			);
		});
	});

	describe('addActiveWorkflows', () => {
		test('should prevent concurrent activations', async () => {
			const getAllActiveIds = jest.spyOn(workflowRepository, 'getAllActiveIds');

			workflowRepository.getAllActiveIds.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve(['workflow-1']), 50)),
			);

			await Promise.all([
				activeWorkflowManager.addActiveWorkflows('init'),
				activeWorkflowManager.addActiveWorkflows('leadershipChange'),
			]);

			expect(getAllActiveIds).toHaveBeenCalledTimes(1);
		});
	});
});
