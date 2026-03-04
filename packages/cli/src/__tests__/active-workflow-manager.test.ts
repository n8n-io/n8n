/* eslint-disable @typescript-eslint/unbound-method */
import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowHistory, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflows, InstanceSettings } from 'n8n-core';
import type {
	ExecutionError,
	INodeExecutionData,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import type { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { EventService } from '@/events/event.service';
import type { ExecutionService } from '@/executions/execution.service';
import type { NodeTypes } from '@/node-types';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

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

	describe('getExecuteTriggerFunctions', () => {
		const workflowStaticDataService = mock<WorkflowStaticDataService>();
		const workflowExecutionService = mock<WorkflowExecutionService>();
		const eventService = mock<EventService>();
		const activeWorkflows = mock<ActiveWorkflows>();
		const activationErrorsService = mock<ActivationErrorsService>();
		const executionService = mock<ExecutionService>();

		beforeEach(() => {
			jest.clearAllMocks();
			workflowStaticDataService.saveStaticData.mockResolvedValue(undefined);
			workflowExecutionService.runWorkflow.mockResolvedValue('exec-123');
			activeWorkflows.remove.mockResolvedValue(true);
			activationErrorsService.register.mockResolvedValue(undefined);
			executionService.createErrorExecution.mockResolvedValue(undefined);

			activeWorkflowManager = new ActiveWorkflowManager(
				mockLogger(),
				mock(),
				activeWorkflows,
				mock(),
				mock(),
				nodeTypes,
				mock(),
				workflowRepository,
				activationErrorsService,
				executionService,
				workflowStaticDataService,
				mock(),
				workflowExecutionService,
				instanceSettings,
				mock(),
				mock(),
				mock(),
				eventService,
				mock(),
			);
		});

		describe('emit', () => {
			test('calls workflowStaticDataService.saveStaticData, workflowExecutionService.runWorkflow, and eventService.emit', async () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerData: INodeExecutionData[][] = [[]];

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emit(triggerData);

				expect(workflowStaticDataService.saveStaticData).toHaveBeenCalledWith(workflow);
				expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
					workflowData,
					node,
					triggerData,
					additionalData,
					mode,
					undefined,
				);

				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(eventService.emit).toHaveBeenCalledWith('workflow-executed', {
					workflowId: workflowData.id,
					workflowName: workflowData.name,
					executionId: 'exec-123',
					source: 'trigger',
				});
			});
		});

		describe('emitError', () => {
			test('removes workflow from activeWorkflows, registers error, calls executeErrorWorkflow and addQueuedWorkflowActivation', () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const triggerError = new Error('Trigger connection failed');

				const executeErrorWorkflowSpy = jest
					.spyOn(activeWorkflowManager, 'executeErrorWorkflow')
					.mockImplementation(() => {});
				const addQueuedWorkflowActivationSpy = jest.spyOn(
					activeWorkflowManager as unknown as Record<
						'addQueuedWorkflowActivation',
						(a: WorkflowActivateMode, w: WorkflowEntity) => void
					>,
					'addQueuedWorkflowActivation',
				);

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.emitError(triggerError);

				expect(activeWorkflows.remove).toHaveBeenCalledWith(workflowData.id);
				expect(activationErrorsService.register).toHaveBeenCalledWith(
					workflowData.id,
					triggerError.message,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalled();
				expect(addQueuedWorkflowActivationSpy).toHaveBeenCalledWith(activation, workflowData);
			});
		});

		describe('saveFailedExecution', () => {
			test('calls executionService.createErrorExecution and executeErrorWorkflow', async () => {
				const workflowData = mock<WorkflowEntity>({
					id: 'wf-1',
					name: 'Test Workflow',
				});
				const additionalData = mock<IWorkflowExecuteAdditionalData>();
				const mode: WorkflowExecuteMode = 'trigger';
				const activation: WorkflowActivateMode = 'activate';
				const workflow = mock<Workflow>({ name: 'Test Workflow' });
				const node = mock<INode>({ name: 'Trigger Node' });
				const executionError = mock<ExecutionError>();

				const executeErrorWorkflowSpy = jest
					.spyOn(activeWorkflowManager, 'executeErrorWorkflow')
					.mockImplementation(() => {});

				const getTriggerFunctions = activeWorkflowManager.getExecuteTriggerFunctions(
					workflowData,
					additionalData,
					mode,
					activation,
				);
				const context = getTriggerFunctions(workflow, node, additionalData, mode, activation);

				context.saveFailedExecution(executionError);

				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(executionService.createErrorExecution).toHaveBeenCalledWith(
					executionError,
					node,
					workflowData,
					workflow,
					mode,
				);
				expect(executeErrorWorkflowSpy).toHaveBeenCalledWith(executionError, workflowData, mode);
			});
		});
	});
});
