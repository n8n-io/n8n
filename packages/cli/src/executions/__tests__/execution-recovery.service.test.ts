import Container from 'typedi';
import { stringify } from 'flatted';

import { mockInstance } from '@test/mocking';
import { randomInteger } from '@test-integration/random';
import { createWorkflow } from '@test-integration/db/workflows';
import { createExecution } from '@test-integration/db/executions';
import * as testDb from '@test-integration/testDb';

import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';

import { InternalHooks } from '@/InternalHooks';
import { Push } from '@/push';
import { ARTIFICIAL_TASK_DATA } from '@/constants';
import { NodeCrashedError } from '@/errors/node-crashed.error';
import { WorkflowCrashedError } from '@/errors/workflow-crashed.error';
import { EventMessageNode } from '@/eventbus/EventMessageClasses/EventMessageNode';
import { EventMessageWorkflow } from '@/eventbus/EventMessageClasses/EventMessageWorkflow';
import type { EventMessageTypes as EventMessage } from '@/eventbus/EventMessageClasses';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { NodeConnectionType } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

/**
 * Workflow producing an execution whose data will be truncated by an instance crash.
 */
export const OOM_WORKFLOW: Partial<WorkflowEntity> = {
	nodes: [
		{
			parameters: {},
			id: '48ce17fe-9651-42ae-910c-48602a00f0bb',
			name: 'When clicking "Test workflow"',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [640, 260],
		},
		{
			parameters: {
				category: 'oom',
				memorySizeValue: 1000,
			},
			id: '07a48151-96d3-45eb-961c-1daf85fbe052',
			name: 'DebugHelper',
			type: 'n8n-nodes-base.debugHelper',
			typeVersion: 1,
			position: [840, 260],
		},
	],
	connections: {
		'When clicking "Test workflow"': {
			main: [
				[
					{
						node: 'DebugHelper',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	},
	pinData: {},
};

/**
 * Snapshot of an execution that will be truncated by an instance crash.
 */
export const IN_PROGRESS_EXECUTION_DATA = {
	startData: {},
	resultData: {
		runData: {
			'When clicking "Test workflow"': [
				{
					hints: [],
					startTime: 1716138610153,
					executionTime: 1,
					source: [],
					executionStatus: 'success',
					data: {
						main: [
							[
								{
									json: {},
									pairedItem: {
										item: 0,
									},
								},
							],
						],
					},
				},
			],
		},
		lastNodeExecuted: 'When clicking "Test workflow"',
	},
	executionData: {
		contextData: {},
		nodeExecutionStack: [
			{
				node: {
					parameters: {
						category: 'oom',
						memorySizeValue: 1000,
					},
					id: '07a48151-96d3-45eb-961c-1daf85fbe052',
					name: 'DebugHelper',
					type: 'n8n-nodes-base.debugHelper',
					typeVersion: 1,
					position: [840, 260],
				},
				data: {
					main: [
						[
							{
								json: {},
								pairedItem: {
									item: 0,
								},
							},
						],
					],
				},
				source: {
					main: [
						{
							previousNode: 'When clicking "Test workflow"',
						},
					],
				},
			},
		],
		metadata: {},
		waitingExecution: {},
		waitingExecutionSource: {},
	},
};

export const setupMessages = (executionId: string, workflowName: string): EventMessage[] => {
	return [
		new EventMessageWorkflow({
			eventName: 'n8n.workflow.started',
			payload: { executionId },
		}),
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Test workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				workflowName,
				nodeName: 'When clicking "Test workflow"',
				nodeType: 'n8n-nodes-base.manualTrigger',
			},
		}),
		new EventMessageNode({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				workflowName,
				nodeName: 'DebugHelper',
				nodeType: 'n8n-nodes-base.debugHelper',
			},
		}),
	];
};

describe('ExecutionRecoveryService', () => {
	let executionRecoveryService: ExecutionRecoveryService;
	let push: Push;
	let executionRepository: ExecutionRepository;
	let logger: Logger;

	beforeAll(async () => {
		await testDb.init();

		mockInstance(InternalHooks);
		push = mockInstance(Push);
		executionRepository = Container.get(ExecutionRepository);
		logger = mock<Logger>();
		executionRecoveryService = new ExecutionRecoveryService(push, executionRepository, logger);
	});

	afterEach(async () => {
		await testDb.truncate(['Execution', 'ExecutionData', 'Workflow']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('recoverFromLogs', () => {
		describe('if no messages', () => {
			test('should return `null` if no execution found', async () => {
				/**
				 * Arrange
				 */
				const inexistentExecutionId = randomInteger(100).toString();
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

		describe('if messages', () => {
			test('should return `null` if no execution found', async () => {
				/**
				 * Arrange
				 */
				const inexistentExecutionId = randomInteger(100).toString();
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

				expect(manualTriggerTaskData?.executionStatus).toBe('success');
				expect(manualTriggerTaskData?.error).toBeUndefined();
				expect(manualTriggerTaskData?.startTime).not.toBe(ARTIFICIAL_TASK_DATA);

				expect(debugHelperTaskData?.executionStatus).toBe('crashed');
				expect(debugHelperTaskData?.error).toBeInstanceOf(NodeCrashedError);
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
