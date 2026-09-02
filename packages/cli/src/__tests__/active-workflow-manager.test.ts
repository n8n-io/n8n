import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
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
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowPushNotifier } from '@/workflows/workflow-push-notifier.service';

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
					workflowRepository.findById.mockResolvedValue(
						mock<WorkflowEntity>({ active: false, activeVersionId: null, activeVersion: null }),
					);

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

	describe('activateWorkflow', () => {
		beforeEach(() => {
			// Set up as leader to allow workflow activation
			Object.assign(instanceSettings, { isLeader: true });
		});

		test('should use active version when calling executeErrorWorkflow on activation failure', async () => {
			// Create different nodes for draft vs active version
			const draftNodes = [
				{
					id: 'draft-node-1',
					name: 'Draft Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			];

			const activeNodes = [
				{
					id: 'active-node-1',
					name: 'Active Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			];

			const activeVersion = mock<WorkflowHistory>({
				versionId: 'v1',
				workflowId: 'workflow-1',
				nodes: activeNodes,
				connections: {},
				authors: 'test-user',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const workflowEntity = mock<WorkflowEntity>({
				id: 'workflow-1',
				name: 'Test Workflow',
				active: true,
				activeVersionId: activeVersion.versionId,
				nodes: draftNodes,
				connections: {},
				activeVersion,
			});

			workflowRepository.findById.mockResolvedValue(workflowEntity);

			// Mock the add method to throw an error (simulating activation failure)
			jest.spyOn(activeWorkflowManager, 'add').mockRejectedValue(new Error('Authorization failed'));

			const executeErrorWorkflowSpy = jest
				.spyOn(activeWorkflowManager, 'executeErrorWorkflow')
				.mockImplementation(() => {});

			await activeWorkflowManager['activateWorkflow']('workflow-1', 'init');

			expect(executeErrorWorkflowSpy).toHaveBeenCalled();

			// Get the workflow data that was passed to executeErrorWorkflow
			const callArgs = executeErrorWorkflowSpy.mock.calls[0];
			const workflowData = callArgs[1];

			expect(workflowData.nodes).toEqual(activeNodes);
			expect(workflowData.nodes[0].name).toBe('Active Webhook');
		});
	});

	describe('handleAddWebhooksTriggersAndPollers', () => {
		const push = mock<Push>();
		const publisher = mock<Publisher>();
		const workflowSharingService = mock<WorkflowSharingService>();
		const workflowPushNotifier = new WorkflowPushNotifier(push, workflowSharingService);
		const sharedUserIds = ['user-1', 'user-2'];

		beforeEach(() => {
			jest.clearAllMocks();
			workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue(sharedUserIds);
			publisher.publishCommand.mockResolvedValue(undefined);
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
				publisher,
				mock(),
				workflowPushNotifier,
			);
		});

		test('pushes `workflowActivated` only to users with workflow access on successful activation', async () => {
			jest.spyOn(activeWorkflowManager, 'add').mockResolvedValue({
				webhooks: true,
				triggersAndPollers: true,
			});

			await activeWorkflowManager.handleAddWebhooksTriggersAndPollers({ workflowId: 'wf-1' });

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowActivated', data: { workflowId: 'wf-1' } },
				sharedUserIds,
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'display-workflow-activation',
				payload: { workflowId: 'wf-1' },
			});
		});

		test('pushes `workflowFailedToActivate` only to users with workflow access when activation fails', async () => {
			jest.spyOn(activeWorkflowManager, 'add').mockRejectedValue(new Error('Some error'));

			await activeWorkflowManager.handleAddWebhooksTriggersAndPollers({ workflowId: 'wf-1' });

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'workflowFailedToActivate',
					data: { workflowId: 'wf-1', errorMessage: 'Some error' },
				},
				sharedUserIds,
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'display-workflow-activation-error',
				payload: { workflowId: 'wf-1', errorMessage: 'Some error' },
			});
		});

		test('does not roll back a successfully activated workflow when nobody can be resolved to notify', async () => {
			jest.spyOn(activeWorkflowManager, 'add').mockResolvedValue({
				webhooks: true,
				triggersAndPollers: true,
			});
			workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValueOnce([]);

			await activeWorkflowManager.handleAddWebhooksTriggersAndPollers({ workflowId: 'wf-1' });

			expect(push.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowActivated', data: { workflowId: 'wf-1' } },
				[],
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'display-workflow-activation',
				payload: { workflowId: 'wf-1' },
			});
			expect(workflowRepository.update).not.toHaveBeenCalled();
		});

		test('does not roll back a successfully activated workflow even if the recipient lookup itself throws', async () => {
			jest.spyOn(activeWorkflowManager, 'add').mockResolvedValue({
				webhooks: true,
				triggersAndPollers: true,
			});
			workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockRejectedValueOnce(
				new Error('db unavailable'),
			);

			await expect(
				activeWorkflowManager.handleAddWebhooksTriggersAndPollers({ workflowId: 'wf-1' }),
			).rejects.toThrow('db unavailable');

			expect(workflowRepository.update).not.toHaveBeenCalled();
			expect(push.sendToUsers).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'workflowFailedToActivate' }),
				expect.anything(),
			);
		});
	});

	describe('display and removal pubsub handlers', () => {
		const push = mock<Push>();
		const publisher = mock<Publisher>();
		const workflowSharingService = mock<WorkflowSharingService>();
		const workflowPushNotifier = new WorkflowPushNotifier(push, workflowSharingService);
		const sharedUserIds = ['user-1', 'user-2'];

		beforeEach(() => {
			jest.clearAllMocks();
			workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue(sharedUserIds);
			publisher.publishCommand.mockResolvedValue(undefined);
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
				publisher,
				mock(),
				workflowPushNotifier,
			);
		});

		test('pushes `workflowActivated` only to users with workflow access', async () => {
			await activeWorkflowManager.handleDisplayWorkflowActivation({ workflowId: 'wf-1' });

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowActivated', data: { workflowId: 'wf-1' } },
				sharedUserIds,
			);
		});

		test('pushes `workflowDeactivated` only to users with workflow access', async () => {
			await activeWorkflowManager.handleDisplayWorkflowDeactivation({ workflowId: 'wf-1' });

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowDeactivated', data: { workflowId: 'wf-1' } },
				sharedUserIds,
			);
		});

		test('pushes `workflowFailedToActivate` only to users with workflow access', async () => {
			await activeWorkflowManager.handleDisplayWorkflowActivationError({
				workflowId: 'wf-1',
				errorMessage: 'Some error',
			});

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'workflowFailedToActivate',
					data: { workflowId: 'wf-1', errorMessage: 'Some error' },
				},
				sharedUserIds,
			);
		});

		test('pushes `workflowDeactivated` only to users with workflow access and relays it to followers on removal', async () => {
			await activeWorkflowManager.handleRemoveTriggersAndPollers({ workflowId: 'wf-1' });

			expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
				'wf-1',
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{ type: 'workflowDeactivated', data: { workflowId: 'wf-1' } },
				sharedUserIds,
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'display-workflow-deactivation',
				payload: { workflowId: 'wf-1' },
			});
		});
	});
});
