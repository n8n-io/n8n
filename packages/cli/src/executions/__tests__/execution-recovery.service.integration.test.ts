import {
	createActiveWorkflow,
	createWorkflow,
	testDb,
	mockInstance,
	getWorkflowById,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { InstanceSettings } from 'n8n-core';
import { randomInt } from 'n8n-workflow';
import assert from 'node:assert';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ARTIFICIAL_TASK_DATA } from '@/constants';
import { NodeCrashedError } from '@/errors/node-crashed.error';
import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';
import type { EventMessageTypes as EventMessage } from '@/eventbus/event-message-classes';
import { EventMessageNode } from '@/eventbus/event-message-classes/event-message-node';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';
import { WorkflowPushNotifier } from '@/workflows/workflow-push-notifier.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { createExecution } from '@test-integration/db/executions';

import { IN_PROGRESS_EXECUTION_DATA, OOM_WORKFLOW } from './constants';
import { setupMessages } from './utils';

describe('ExecutionRecoveryService', () => {
	const push = mockInstance(Push);
	const instanceSettings = Container.get(InstanceSettings);
	const ownershipService = mockInstance(OwnershipService);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const externalHooks = mockInstance(ExternalHooks);
	const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
	const workflowSharingService = mockInstance(WorkflowSharingService);
	const workflowPushNotifier = new WorkflowPushNotifier(push, workflowSharingService);
	mockInstance(WorkflowPublicationNotifier);

	let executionRecoveryService: ExecutionRecoveryService;
	let executionRepository: ExecutionRepository;
	let executionPersistence: ExecutionPersistence;
	let workflowRepository: WorkflowRepository;
	let globalConfig: GlobalConfig;

	beforeAll(async () => {
		await testDb.init();
		executionRepository = Container.get(ExecutionRepository);
		executionPersistence = Container.get(ExecutionPersistence);
		workflowRepository = Container.get(WorkflowRepository);
		globalConfig = Container.get(GlobalConfig);

		executionRecoveryService = new ExecutionRecoveryService(
			mock(),
			instanceSettings,
			push,
			executionRepository,
			executionPersistence,
			globalConfig.executions,
			workflowRepository,
			mock(),
			ownershipService,
			projectRelationRepository,
			workflowPushNotifier,
			new ExecutionCrashService(executionRepository, mock()),
		);
	});

	beforeEach(() => {
		instanceSettings.markAsLeader();
		workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue([]);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		globalConfig.executions.recovery.workflowDeactivationEnabled = false;
		globalConfig.workflows.useWorkflowPublicationService = false;
		await testDb.truncate([
			'ExecutionEntity',
			'ExecutionData',
			'WorkflowEntity',
			'WorkflowHistory',
			'WorkflowPublishHistory',
			'WorkflowPublicationOutbox',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createCrashedActiveWorkflow() {
		const workflow = await createActiveWorkflow({ ...OOM_WORKFLOW });
		expect(workflow.activeVersionId).not.toBeNull();
		await createExecution({ status: 'crashed' }, workflow);
		await createExecution({ status: 'crashed' }, workflow);
		await createExecution({ status: 'crashed' }, workflow);
		return workflow;
	}

	function mockOwnershipForDeactivation() {
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: uuid(), type: 'personal' }),
		);
		ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: uuid() }));
		projectRelationRepository.find.mockResolvedValue([]);
	}

	describe('recoverFromLogs', () => {
		describe('if follower', () => {
			test('should do nothing', async () => {
				/**
				 * Arrange
				 */
				instanceSettings.markAsFollower();
				// @ts-expect-error Private method
				const amendSpy = vi.spyOn(executionRecoveryService, 'amend');
				const messages = setupMessages('123', 'Some workflow');

				/**
				 * Act
				 */
				await executionRecoveryService.recoverFromLogs('123', messages);

				/**
				 * Assert
				 */
				expect(amendSpy).not.toHaveBeenCalled();
			});
		});

		describe('if leader, with 0 messages', () => {
			test('should return `null` if no execution found', async () => {
				/**
				 * Arrange
				 */
				const inexistentExecutionId = randomInt(100).toString();
				const noMessages: EventMessage[] = [];

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					inexistentExecutionId,
					noMessages,
				);

				/**
				 * Assert
				 */
				expect(amendedExecution).toBeNull();
			});

			test('should update `status` and `stoppedAt`', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow(OOM_WORKFLOW);
				const execution = await createExecution(
					{
						status: 'running',
						data: stringify(IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(execution.id, []);

				/**
				 * Assert
				 */
				if (!amendedExecution) expect.fail('Expected `amendedExecution` to exist');

				expect(amendedExecution.status).toBe('crashed');
				expect(amendedExecution.stoppedAt).not.toBe(execution.stoppedAt);
			});

			test('pushes `executionRecovered` only to users with workflow access, once a client connects', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow(OOM_WORKFLOW);
				const execution = await createExecution(
					{
						status: 'running',
						data: stringify(IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);
				workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue(['user-1']);
				let editorUiConnectedCallback: (() => Promise<void>) | undefined;
				push.once.mockImplementation((event: string, callback: () => Promise<void>) => {
					if (event === 'editorUiConnected') editorUiConnectedCallback = callback;
					return push;
				});

				/**
				 * Act
				 */
				await executionRecoveryService.recoverFromLogs(execution.id, []);
				expect(editorUiConnectedCallback).toBeDefined();
				await editorUiConnectedCallback?.();

				/**
				 * Assert
				 */
				expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
					workflow.id,
				);
				expect(push.sendToUsers).toHaveBeenCalledWith(
					{ type: 'executionRecovered', data: { executionId: execution.id } },
					['user-1'],
				);
			});
		});

		describe('if leader, with 1+ messages', () => {
			test('for successful dataful execution, should return `null`', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow();
				const execution = await createExecution(
					{ status: 'success', data: stringify({ runData: { foo: 'bar' } }) },
					workflow,
				);
				const messages = setupMessages(execution.id, 'Some workflow');

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				expect(amendedExecution).toBeNull();
			});

			test('for errored dataful execution, should return `null`', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow();
				const execution = await createExecution(
					{ status: 'error', data: stringify({ runData: { foo: 'bar' } }) },
					workflow,
				);
				const messages = setupMessages(execution.id, 'Some workflow');

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				expect(amendedExecution).toBeNull();
			});

			test('for canceled executions with data, should return `null`', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow();
				const execution = await createExecution(
					{ status: 'canceled', data: stringify({ runData: {} }) },
					workflow,
				);
				const messages = setupMessages(execution.id, 'Some workflow');

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				expect(amendedExecution).toBeNull();
			});

			test('should return `null` if no execution found', async () => {
				/**
				 * Arrange
				 */
				const inexistentExecutionId = randomInt(100).toString();
				const messages = setupMessages(inexistentExecutionId, 'Some workflow');

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					inexistentExecutionId,
					messages,
				);

				/**
				 * Assert
				 */
				expect(amendedExecution).toBeNull();
			});

			test('for successful dataless execution, should update `status`, `stoppedAt` and `data`', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow();
				const execution = await createExecution(
					{
						status: 'success',
						data: stringify(undefined), // saved execution but likely crashed while saving high-volume data
					},
					workflow,
				);
				const messages = setupMessages(execution.id, 'Some workflow');

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				assert(amendedExecution);
				expect(amendedExecution.stoppedAt).not.toBe(execution.stoppedAt);
				expect(amendedExecution.data).toEqual({ version: 1, resultData: { runData: {} } });
				expect(amendedExecution.status).toBe('crashed');
			});

			test('for running execution without `runData`, should reconstruct missing node data', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow(OOM_WORKFLOW);
				const executionDataWithoutRunData = structuredClone(IN_PROGRESS_EXECUTION_DATA);
				// @ts-expect-error CAT-752
				delete executionDataWithoutRunData.resultData.runData;

				const execution = await createExecution(
					{
						status: 'running',
						data: stringify(executionDataWithoutRunData),
					},
					workflow,
				);

				const messages = setupMessages(execution.id, workflow.name);

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				const resultData = amendedExecution?.data.resultData;

				if (!resultData) expect.fail('Expected `resultData` to be defined');

				expect(resultData.error).toBeInstanceOf(WorkflowCrashedError);
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');

				const runData = resultData.runData;

				if (!runData) expect.fail('Expected `runData` to be defined');

				expect(runData['When clicking "Execute workflow"']?.at(0)?.executionStatus).toBe('success');
				expect(runData.DebugHelper?.at(0)?.executionStatus).toBe('crashed');
			});

			test('for running execution, should update `status`, `stoppedAt` and `data` if last node did not finish', async () => {
				/**
				 * Arrange
				 */

				const workflow = await createWorkflow(OOM_WORKFLOW);

				const execution = await createExecution(
					{
						status: 'running',
						data: stringify(IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);

				const messages = setupMessages(execution.id, workflow.name);

				/**
				 * Act
				 */

				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */

				const startOfLastNodeRun = messages
					.find((m) => m.eventName === 'n8n.node.started' && m.payload.nodeName === 'DebugHelper')
					?.ts.toJSDate();

				expect(amendedExecution).toEqual(
					expect.objectContaining({
						status: 'crashed',
						stoppedAt: startOfLastNodeRun,
					}),
				);

				const resultData = amendedExecution?.data.resultData;

				if (!resultData) expect.fail('Expected `resultData` to be defined');

				expect(resultData.error).toBeInstanceOf(WorkflowCrashedError);
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');

				const runData = resultData.runData;

				if (!runData) expect.fail('Expected `runData` to be defined');

				const manualTriggerTaskData = runData['When clicking "Execute workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);

				if (!manualTriggerTaskData)
					expect.fail("Expected manual trigger's `taskData` to be defined");
				if (!debugHelperTaskData) expect.fail("Expected debug helper's `taskData` to be defined");

				const originalManualTriggerTaskData =
					IN_PROGRESS_EXECUTION_DATA.resultData.runData['When clicking "Execute workflow"'].at(
						0,
					)?.data;

				expect(manualTriggerTaskData.executionStatus).toBe('success');
				expect(manualTriggerTaskData.error).toBeUndefined();
				expect(manualTriggerTaskData.data).toStrictEqual(originalManualTriggerTaskData); // unchanged

				expect(debugHelperTaskData.executionStatus).toBe('crashed');
				expect(debugHelperTaskData.error).toBeInstanceOf(NodeCrashedError);
			});

			test('should update `status`, `stoppedAt` and `data` if last node finished', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow(OOM_WORKFLOW);

				const execution = await createExecution(
					{
						status: 'running',
						data: stringify(IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);

				const messages = setupMessages(execution.id, workflow.name);
				messages.push(
					new EventMessageNode({
						eventName: 'n8n.node.finished',
						payload: {
							executionId: execution.id,
							workflowName: workflow.name,
							nodeName: 'DebugHelper',
							nodeType: 'n8n-nodes-base.debugHelper',
							nodeId: '123',
						},
					}),
				);

				/**
				 * Act
				 */
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);

				/**
				 * Assert
				 */
				const endOfLastNoderun = messages
					.find((m) => m.eventName === 'n8n.node.finished' && m.payload.nodeName === 'DebugHelper')
					?.ts.toJSDate();

				expect(amendedExecution).toEqual(
					expect.objectContaining({
						status: 'crashed',
						stoppedAt: endOfLastNoderun,
					}),
				);

				const resultData = amendedExecution?.data.resultData;

				if (!resultData) expect.fail('Expected `resultData` to be defined');

				expect(resultData.error).toBeUndefined();
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');

				const runData = resultData.runData;

				if (!runData) expect.fail('Expected `runData` to be defined');

				const manualTriggerTaskData = runData['When clicking "Execute workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);

				expect(manualTriggerTaskData?.executionStatus).toBe('success');
				expect(manualTriggerTaskData?.error).toBeUndefined();

				expect(debugHelperTaskData?.executionStatus).toBe('success');
				expect(debugHelperTaskData?.error).toBeUndefined();
				expect(debugHelperTaskData?.data).toEqual(ARTIFICIAL_TASK_DATA);
			});

			test('should deactivate workflow if all last executions are crashed', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.recovery.workflowDeactivationEnabled = true;

				const workflow = await createCrashedActiveWorkflow();
				mockOwnershipForDeactivation();

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));

				/**
				 * Assert
				 */
				const updatedWorkflow = await getWorkflowById(workflow.id);
				if (!updatedWorkflow) expect.fail('Expected `updatedWorkflow` to be defined');
				expect(updatedWorkflow.activeVersionId).toBeNull();
			});

			test('pushes `workflowAutoDeactivated` only to users with workflow access, once a client connects', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.recovery.workflowDeactivationEnabled = true;

				const workflow = await createCrashedActiveWorkflow();
				mockOwnershipForDeactivation();
				workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue(['user-1']);
				let editorUiConnectedCallback: (() => Promise<void>) | undefined;
				push.once.mockImplementation((event: string, callback: () => Promise<void>) => {
					if (event === 'editorUiConnected') editorUiConnectedCallback = callback;
					return push;
				});

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));
				expect(editorUiConnectedCallback).toBeDefined();
				await editorUiConnectedCallback?.();

				/**
				 * Assert
				 */
				expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith(
					workflow.id,
				);
				expect(push.sendToUsers).toHaveBeenCalledWith(
					{ type: 'workflowAutoDeactivated', data: { workflowId: workflow.id } },
					['user-1'],
				);
			});

			test('should unpublish via outbox and record publish history on auto-deactivation', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.recovery.workflowDeactivationEnabled = true;
				globalConfig.workflows.useWorkflowPublicationService = true;

				const workflow = await createCrashedActiveWorkflow();
				mockOwnershipForDeactivation();

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));

				/**
				 * Assert
				 */
				// Trigger/webhook teardown happens via the publication outbox: without an
				// unpublish record the applier never deregisters webhooks, so the
				// workflow keeps executing after "deactivation".
				const outboxRecord = await Container.get(
					WorkflowPublicationOutboxRepository,
				).findInFlightByWorkflowId(workflow.id);
				expect(outboxRecord).not.toBeNull();

				// The publish timeline reads from publish history: without a
				// 'deactivated' record the UI keeps showing the version as published.
				const deactivationRecords = await Container.get(WorkflowPublishHistoryRepository).findBy({
					workflowId: workflow.id,
					event: 'deactivated',
				});
				expect(deactivationRecords).toHaveLength(1);
				// System-initiated: no user attribution
				expect(deactivationRecords[0].userId).toBeNull();

				expect(externalHooks.run).toHaveBeenCalledWith('workflow.deactivate', [
					expect.objectContaining({ id: workflow.id }),
					expect.anything(), // workflow hook context service
				]);
			});

			test('should tear down triggers and record publish history on auto-deactivation (legacy mode)', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.recovery.workflowDeactivationEnabled = true;

				const workflow = await createCrashedActiveWorkflow();
				mockOwnershipForDeactivation();

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));

				/**
				 * Assert
				 */
				// Legacy mode tears down webhooks/triggers via the active workflow manager
				expect(activeWorkflowManager.remove).toHaveBeenCalledWith(workflow.id);

				const updatedWorkflow = await getWorkflowById(workflow.id);
				expect(updatedWorkflow?.activeVersionId).toBeNull();

				const deactivationRecords = await Container.get(WorkflowPublishHistoryRepository).findBy({
					workflowId: workflow.id,
					event: 'deactivated',
				});
				expect(deactivationRecords).toHaveLength(1);
				expect(deactivationRecords[0].userId).toBeNull();

				const outboxRecord = await Container.get(
					WorkflowPublicationOutboxRepository,
				).findInFlightByWorkflowId(workflow.id);
				expect(outboxRecord).toBeNull();
			});

			test('should mark executions crashed and process remaining workflows when a deactivation fails', async () => {
				/**
				 * Arrange
				 */
				globalConfig.executions.recovery.workflowDeactivationEnabled = true;

				const failing = await createActiveWorkflow({ ...OOM_WORKFLOW });
				const succeeding = await createActiveWorkflow({ ...OOM_WORKFLOW });
				for (const workflow of [failing, succeeding]) {
					await createExecution({ status: 'crashed' }, workflow);
					await createExecution({ status: 'crashed' }, workflow);
					await createExecution({ status: 'crashed' }, workflow);
				}
				// older than the crashed ones so it stays outside the last-N window
				const running = await createExecution(
					{ status: 'running', startedAt: new Date(Date.now() - 60_000) },
					failing,
				);

				ownershipService.getWorkflowProjectCached.mockResolvedValue(
					mock<Project>({ id: uuid(), type: 'personal' }),
				);
				ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: uuid() }));
				projectRelationRepository.find.mockResolvedValue([]);

				const { WorkflowService } = await import('@/workflows/workflow.service.js');
				vi.spyOn(WorkflowService.prototype, 'deactivateWorkflowAsSystem').mockRejectedValueOnce(
					new Error('deactivation failed'),
				);

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(
					new Set([failing.id, succeeding.id]),
				);

				/**
				 * Assert
				 */
				// the failing workflow's executions are still marked as crashed
				const executions = await executionRepository.findMultipleExecutions({
					select: ['id', 'status'],
					where: { id: running.id },
				});
				expect(executions).toHaveLength(1);
				expect(executions[0].status).toBe('crashed');

				// the remaining workflow is still deactivated
				const updatedSucceeding = await getWorkflowById(succeeding.id);
				expect(updatedSucceeding?.activeVersionId).toBeNull();
			});
		});
	});
});
