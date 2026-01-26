import {
	createActiveWorkflow,
	createWorkflow,
	testDb,
	mockInstance,
	getWorkflowById,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository, ProjectRelationRepository } from '@n8n/db';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import { randomInt } from 'n8n-workflow';
import assert from 'node:assert';
import { v4 as uuid } from 'uuid';

import { ARTIFICIAL_TASK_DATA } from '@/constants';
import { NodeCrashedError } from '@/errors/node-crashed.error';
import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';
import type { EventMessageTypes as EventMessage } from '@/eventbus/event-message-classes';
import { EventMessageNode } from '@/eventbus/event-message-classes/event-message-node';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { Push } from '@/push';
import { OwnershipService } from '@/services/ownership.service';
import { createExecution } from '@test-integration/db/executions';

import { IN_PROGRESS_EXECUTION_DATA, OOM_WORKFLOW } from './constants';
import { setupMessages } from './utils';

describe('ExecutionRecoveryService', () => {
	const push = mockInstance(Push);
	const instanceSettings = Container.get(InstanceSettings);
	const ownershipService = mockInstance(OwnershipService);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);

	let executionRecoveryService: ExecutionRecoveryService;
	let executionRepository: ExecutionRepository;
	let workflowRepository: WorkflowRepository;
	let globalConfig: GlobalConfig;

	beforeAll(async () => {
		await testDb.init();
		executionRepository = Container.get(ExecutionRepository);
		workflowRepository = Container.get(WorkflowRepository);
		globalConfig = Container.get(GlobalConfig);

		executionRecoveryService = new ExecutionRecoveryService(
			mock(),
			instanceSettings,
			push,
			executionRepository,
			globalConfig.executions,
			workflowRepository,
			mock(),
			ownershipService,
			projectRelationRepository,
		);
	});

	beforeEach(() => {
		instanceSettings.markAsLeader();
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		globalConfig.executions.recovery.workflowDeactivationEnabled = false;
		await testDb.truncate([
			'ExecutionEntity',
			'ExecutionData',
			'WorkflowEntity',
			'WorkflowHistory',
			'WorkflowPublishHistory',
		]);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('recoverFromLogs', () => {
		describe('if follower', () => {
			test('should do nothing', async () => {
				/**
				 * Arrange
				 */
				instanceSettings.markAsFollower();
				// @ts-expect-error Private method
				const amendSpy = jest.spyOn(executionRecoveryService, 'amend');
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
				if (!amendedExecution) fail('Expected `amendedExecution` to exist');

				expect(amendedExecution.status).toBe('crashed');
				expect(amendedExecution.stoppedAt).not.toBe(execution.stoppedAt);
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
				expect(amendedExecution.data).toEqual({ resultData: { runData: {} } });
				expect(amendedExecution.status).toBe('crashed');
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

				if (!resultData) fail('Expected `resultData` to be defined');

				expect(resultData.error).toBeInstanceOf(WorkflowCrashedError);
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');

				const runData = resultData.runData;

				if (!runData) fail('Expected `runData` to be defined');

				const manualTriggerTaskData = runData['When clicking "Execute workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);

				if (!manualTriggerTaskData) fail("Expected manual trigger's `taskData` to be defined");
				if (!debugHelperTaskData) fail("Expected debug helper's `taskData` to be defined");

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

				if (!resultData) fail('Expected `resultData` to be defined');

				expect(resultData.error).toBeUndefined();
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');

				const runData = resultData.runData;

				if (!runData) fail('Expected `runData` to be defined');

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

				const workflow = await createActiveWorkflow({
					...OOM_WORKFLOW,
				});
				expect(workflow.activeVersionId).not.toBeNull();
				await createExecution({ status: 'crashed' }, workflow);
				await createExecution({ status: 'crashed' }, workflow);
				await createExecution({ status: 'crashed' }, workflow);

				ownershipService.getWorkflowProjectCached.mockResolvedValue(
					mock<Project>({ id: uuid(), type: 'personal' }),
				);
				ownershipService.getInstanceOwner.mockResolvedValue(mock<User>({ id: uuid() }));
				projectRelationRepository.find.mockResolvedValue([]);

				/**
				 * Act
				 */
				await executionRecoveryService.autoDeactivateWorkflowsIfNeeded(new Set([workflow.id]));

				/**
				 * Assert
				 */
				const updatedWorkflow = await getWorkflowById(workflow.id);
				if (!updatedWorkflow) fail('Expected `updatedWorkflow` to be defined');
				expect(updatedWorkflow.activeVersionId).toBeNull();
			});
		});
	});
});
