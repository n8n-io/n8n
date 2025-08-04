'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const flatted_1 = require('flatted');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = __importDefault(require('node:assert'));
const constants_1 = require('@/constants');
const node_crashed_error_1 = require('@/errors/node-crashed.error');
const workflow_crashed_error_1 = require('@/errors/workflow-crashed.error');
const event_message_node_1 = require('@/eventbus/event-message-classes/event-message-node');
const execution_recovery_service_1 = require('@/executions/execution-recovery.service');
const push_1 = require('@/push');
const executions_1 = require('@test-integration/db/executions');
const constants_2 = require('./constants');
const utils_1 = require('./utils');
describe('ExecutionRecoveryService', () => {
	const push = (0, backend_test_utils_1.mockInstance)(push_1.Push);
	const instanceSettings = di_1.Container.get(n8n_core_1.InstanceSettings);
	let executionRecoveryService;
	let executionRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		executionRepository = di_1.Container.get(db_1.ExecutionRepository);
		executionRecoveryService = new execution_recovery_service_1.ExecutionRecoveryService(
			(0, jest_mock_extended_1.mock)(),
			instanceSettings,
			push,
			executionRepository,
		);
	});
	beforeEach(() => {
		instanceSettings.markAsLeader();
	});
	afterEach(async () => {
		jest.restoreAllMocks();
		await backend_test_utils_1.testDb.truncate([
			'ExecutionEntity',
			'ExecutionData',
			'WorkflowEntity',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('recoverFromLogs', () => {
		describe('if follower', () => {
			test('should do nothing', async () => {
				instanceSettings.markAsFollower();
				const amendSpy = jest.spyOn(executionRecoveryService, 'amend');
				const messages = (0, utils_1.setupMessages)('123', 'Some workflow');
				await executionRecoveryService.recoverFromLogs('123', messages);
				expect(amendSpy).not.toHaveBeenCalled();
			});
		});
		describe('if leader, with 0 messages', () => {
			test('should return `null` if no execution found', async () => {
				const inexistentExecutionId = (0, n8n_workflow_1.randomInt)(100).toString();
				const noMessages = [];
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					inexistentExecutionId,
					noMessages,
				);
				expect(amendedExecution).toBeNull();
			});
			test('should update `status` and `stoppedAt`', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)(constants_2.OOM_WORKFLOW);
				const execution = await (0, executions_1.createExecution)(
					{
						status: 'running',
						data: (0, flatted_1.stringify)(constants_2.IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);
				const amendedExecution = await executionRecoveryService.recoverFromLogs(execution.id, []);
				if (!amendedExecution) fail('Expected `amendedExecution` to exist');
				expect(amendedExecution.status).toBe('crashed');
				expect(amendedExecution.stoppedAt).not.toBe(execution.stoppedAt);
			});
		});
		describe('if leader, with 1+ messages', () => {
			test('for successful dataful execution, should return `null`', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				const execution = await (0, executions_1.createExecution)(
					{ status: 'success', data: (0, flatted_1.stringify)({ runData: { foo: 'bar' } }) },
					workflow,
				);
				const messages = (0, utils_1.setupMessages)(execution.id, 'Some workflow');
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);
				expect(amendedExecution).toBeNull();
			});
			test('for errored dataful execution, should return `null`', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				const execution = await (0, executions_1.createExecution)(
					{ status: 'error', data: (0, flatted_1.stringify)({ runData: { foo: 'bar' } }) },
					workflow,
				);
				const messages = (0, utils_1.setupMessages)(execution.id, 'Some workflow');
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);
				expect(amendedExecution).toBeNull();
			});
			test('should return `null` if no execution found', async () => {
				const inexistentExecutionId = (0, n8n_workflow_1.randomInt)(100).toString();
				const messages = (0, utils_1.setupMessages)(inexistentExecutionId, 'Some workflow');
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					inexistentExecutionId,
					messages,
				);
				expect(amendedExecution).toBeNull();
			});
			test('for successful dataless execution, should update `status`, `stoppedAt` and `data`', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)();
				const execution = await (0, executions_1.createExecution)(
					{
						status: 'success',
						data: (0, flatted_1.stringify)(undefined),
					},
					workflow,
				);
				const messages = (0, utils_1.setupMessages)(execution.id, 'Some workflow');
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);
				(0, node_assert_1.default)(amendedExecution);
				expect(amendedExecution.stoppedAt).not.toBe(execution.stoppedAt);
				expect(amendedExecution.data).toEqual({ resultData: { runData: {} } });
				expect(amendedExecution.status).toBe('crashed');
			});
			test('for running execution, should update `status`, `stoppedAt` and `data` if last node did not finish', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)(constants_2.OOM_WORKFLOW);
				const execution = await (0, executions_1.createExecution)(
					{
						status: 'running',
						data: (0, flatted_1.stringify)(constants_2.IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);
				const messages = (0, utils_1.setupMessages)(execution.id, workflow.name);
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);
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
				expect(resultData.error).toBeInstanceOf(workflow_crashed_error_1.WorkflowCrashedError);
				expect(resultData.lastNodeExecuted).toBe('DebugHelper');
				const runData = resultData.runData;
				if (!runData) fail('Expected `runData` to be defined');
				const manualTriggerTaskData = runData['When clicking "Execute workflow"'].at(0);
				const debugHelperTaskData = runData.DebugHelper.at(0);
				if (!manualTriggerTaskData) fail("Expected manual trigger's `taskData` to be defined");
				if (!debugHelperTaskData) fail("Expected debug helper's `taskData` to be defined");
				const originalResultData = constants_2.IN_PROGRESS_EXECUTION_DATA.resultData;
				const runDataArray = originalResultData.runData['when_clicking_execute_workflow'];
				const originalManualTriggerTaskData = runDataArray.at(0)?.data;
				expect(manualTriggerTaskData.executionStatus).toBe('success');
				expect(manualTriggerTaskData.error).toBeUndefined();
				expect(manualTriggerTaskData.data).toStrictEqual(originalManualTriggerTaskData);
				expect(debugHelperTaskData.executionStatus).toBe('crashed');
				expect(debugHelperTaskData.error).toBeInstanceOf(node_crashed_error_1.NodeCrashedError);
			});
			test('should update `status`, `stoppedAt` and `data` if last node finished', async () => {
				const workflow = await (0, backend_test_utils_1.createWorkflow)(constants_2.OOM_WORKFLOW);
				const execution = await (0, executions_1.createExecution)(
					{
						status: 'running',
						data: (0, flatted_1.stringify)(constants_2.IN_PROGRESS_EXECUTION_DATA),
					},
					workflow,
				);
				const messages = (0, utils_1.setupMessages)(execution.id, workflow.name);
				messages.push(
					new event_message_node_1.EventMessageNode({
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
				const amendedExecution = await executionRecoveryService.recoverFromLogs(
					execution.id,
					messages,
				);
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
				expect(debugHelperTaskData?.data).toEqual(constants_1.ARTIFICIAL_TASK_DATA);
			});
		});
	});
});
//# sourceMappingURL=execution-recovery.service.test.js.map
