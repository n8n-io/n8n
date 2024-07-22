import Container from 'typedi';
import { stringify } from 'flatted';
import { randomInt } from 'n8n-workflow';

import { mockInstance } from '@test/mocking';
import { createWorkflow } from '@test-integration/db/workflows';
import { createExecution } from '@test-integration/db/executions';
import * as testDb from '@test-integration/testDb';

import { mock } from 'jest-mock-extended';
import { OrchestrationService } from '@/services/orchestration.service';
import config from '@/config';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { InternalHooks } from '@/InternalHooks';
import { Push } from '@/push';
import { ARTIFICIAL_TASK_DATA } from '@/constants';
import { NodeCrashedError } from '@/errors/node-crashed.error';
import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';
import { EventMessageNode } from '@/eventbus/EventMessageClasses/EventMessageNode';
import { IN_PROGRESS_EXECUTION_DATA, OOM_WORKFLOW } from './constants';
import { setupMessages } from './utils';

import type { EventService } from '@/eventbus/event.service';
import type { EventMessageTypes as EventMessage } from '@/eventbus/EventMessageClasses';
import type { Logger } from '@/Logger';

describe('ExecutionRecoveryService', () => {
	let push: Push;
	let executionRecoveryService: ExecutionRecoveryService;
	let orchestrationService: OrchestrationService;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		push = mockInstance(Push);
		executionRepository = Container.get(ExecutionRepository);
		orchestrationService = Container.get(OrchestrationService);

		mockInstance(InternalHooks);
		executionRecoveryService = new ExecutionRecoveryService(
			mock<Logger>(),
			push,
			executionRepository,
			orchestrationService,
			mock<EventService>(),
		);
	});

	beforeEach(() => {
		config.set('multiMainSetup.instanceType', 'leader');
	});

	afterEach(async () => {
		config.load(config.default);
		jest.restoreAllMocks();
		await testDb.truncate(['Execution', 'ExecutionData', 'Workflow']);
		executionRecoveryService.shutdown();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('scheduleQueueRecovery', () => {
		describe('queue mode', () => {
			it('if leader, should schedule queue recovery', () => {
				/**
				 * Arrange
				 */
				config.set('executions.mode', 'queue');
				jest.spyOn(orchestrationService, 'isLeader', 'get').mockReturnValue(true);
				const scheduleSpy = jest.spyOn(executionRecoveryService, 'scheduleQueueRecovery');

				/**
				 * Act
				 */
				executionRecoveryService.init();

				/**
				 * Assert
				 */
				expect(scheduleSpy).toHaveBeenCalled();
			});

			it('if follower, should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.mode', 'queue');
				jest.spyOn(orchestrationService, 'isLeader', 'get').mockReturnValue(false);
				const scheduleSpy = jest.spyOn(executionRecoveryService, 'scheduleQueueRecovery');

				/**
				 * Act
				 */
				executionRecoveryService.init();

				/**
				 * Assert
				 */
				expect(scheduleSpy).not.toHaveBeenCalled();
			});
		});

		describe('regular mode', () => {
			it('should do nothing', () => {
				/**
				 * Arrange
				 */
				config.set('executions.mode', 'regular');
				const scheduleSpy = jest.spyOn(executionRecoveryService, 'scheduleQueueRecovery');

				/**
				 * Act
				 */
				executionRecoveryService.init();

				/**
				 * Assert
				 */
				expect(scheduleSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('recoverFromLogs', () => {
		describe('if follower', () => {
			test('should do nothing', async () => {
				/**
				 * Arrange
				 */
				config.set('multiMainSetup.instanceType', 'follower');
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
			test('should return `null` if execution succeeded', async () => {
				/**
				 * Arrange
				 */
				const workflow = await createWorkflow();
				const execution = await createExecution({ status: 'success' }, workflow);
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

			test('should update `status`, `stoppedAt` and `data` if last node did not finish', async () => {
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

				const manualTriggerTaskData = runData['When clicking "Test workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);

				if (!manualTriggerTaskData) fail("Expected manual trigger's `taskData` to be defined");
				if (!debugHelperTaskData) fail("Expected debug helper's `taskData` to be defined");

				const originalManualTriggerTaskData =
					IN_PROGRESS_EXECUTION_DATA.resultData.runData['When clicking "Test workflow"'].at(
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

				const manualTriggerTaskData = runData['When clicking "Test workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);

				expect(manualTriggerTaskData?.executionStatus).toBe('success');
				expect(manualTriggerTaskData?.error).toBeUndefined();

				expect(debugHelperTaskData?.executionStatus).toBe('success');
				expect(debugHelperTaskData?.error).toBeUndefined();
				expect(debugHelperTaskData?.data).toEqual(ARTIFICIAL_TASK_DATA);
			});
		});
	});
});
