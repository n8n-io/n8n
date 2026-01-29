import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { WorkflowActivateMode } from 'n8n-workflow';

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
			mock(),
			mock(),
		);
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
					const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
					const addTriggersAndPollersSpy = jest.spyOn(
						activeWorkflowManager,
						'addTriggersAndPollers',
					);
					workflowRepository.findById.mockResolvedValue(
						mock<WorkflowEntity>({ active: false, activeVersionId: null, activeVersion: null }),
					);

					const added = await activeWorkflowManager.add('some-id', mode);

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
});
