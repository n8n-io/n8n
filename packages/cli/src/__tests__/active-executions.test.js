'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const p_cancelable_1 = __importDefault(require('p-cancelable'));
const uuid_1 = require('uuid');
const active_executions_1 = require('@/active-executions');
const concurrency_control_service_1 = require('@/concurrency/concurrency-control.service');
const config_1 = __importDefault(require('@/config'));
jest.mock('n8n-workflow', () => {
	return {
		...jest.requireActual('n8n-workflow'),
		sleep: jest.fn(),
	};
});
const FAKE_EXECUTION_ID = '15';
const FAKE_SECOND_EXECUTION_ID = '20';
const executionRepository = (0, jest_mock_extended_1.mock)();
const concurrencyControl = (0, backend_test_utils_1.mockInstance)(
	concurrency_control_service_1.ConcurrencyControlService,
	{
		isEnabled: false,
	},
);
describe('ActiveExecutions', () => {
	let activeExecutions;
	let responsePromise;
	let workflowExecution;
	let postExecutePromise;
	const fullRunData = {
		data: {
			resultData: {
				runData: {},
			},
		},
		mode: 'manual',
		startedAt: new Date(),
		status: 'new',
	};
	const executionData = {
		executionMode: 'manual',
		workflowData: {
			id: '123',
			name: 'Test workflow 1',
			active: false,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: [],
			connections: {},
		},
		userId: (0, uuid_1.v4)(),
	};
	beforeEach(() => {
		activeExecutions = new active_executions_1.ActiveExecutions(
			(0, jest_mock_extended_1.mock)(),
			executionRepository,
			concurrencyControl,
		);
		executionRepository.createNewExecution.mockResolvedValue(FAKE_EXECUTION_ID);
		workflowExecution = new p_cancelable_1.default((resolve) => resolve());
		workflowExecution.cancel = jest.fn();
		responsePromise = (0, jest_mock_extended_1.mock)();
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	test('Should initialize activeExecutions with empty list', () => {
		expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
	});
	test('Should add execution to active execution list', async () => {
		const executionId = await activeExecutions.add(executionData);
		expect(executionId).toBe(FAKE_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
		expect(executionRepository.createNewExecution).toHaveBeenCalledTimes(1);
		expect(executionRepository.updateExistingExecution).toHaveBeenCalledTimes(0);
	});
	test('Should update execution if add is called with execution ID', async () => {
		const executionId = await activeExecutions.add(executionData, FAKE_SECOND_EXECUTION_ID);
		expect(executionId).toBe(FAKE_SECOND_EXECUTION_ID);
		expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
		expect(executionRepository.createNewExecution).toHaveBeenCalledTimes(0);
		expect(executionRepository.updateExistingExecution).toHaveBeenCalledTimes(1);
	});
	describe('attachWorkflowExecution', () => {
		test('Should fail attaching execution to invalid executionId', () => {
			expect(() => {
				activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, workflowExecution);
			}).toThrow();
		});
		test('Should successfully attach execution to valid executionId', async () => {
			await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
			expect(() =>
				activeExecutions.attachWorkflowExecution(FAKE_EXECUTION_ID, workflowExecution),
			).not.toThrow();
		});
	});
	test('Should attach and resolve response promise to existing execution', async () => {
		await activeExecutions.add(executionData, FAKE_EXECUTION_ID);
		activeExecutions.attachResponsePromise(FAKE_EXECUTION_ID, responsePromise);
		const fakeResponse = { data: { resultData: { runData: {} } } };
		activeExecutions.resolveResponsePromise(FAKE_EXECUTION_ID, fakeResponse);
		expect(responsePromise.resolve).toHaveBeenCalledWith(fakeResponse);
	});
	test('Should copy over startedAt and responsePromise when resuming a waiting execution', async () => {
		const executionId = await activeExecutions.add(executionData);
		activeExecutions.setStatus(executionId, 'waiting');
		activeExecutions.attachResponsePromise(executionId, responsePromise);
		const waitingExecution = activeExecutions.getExecutionOrFail(executionId);
		expect(waitingExecution.responsePromise).toBeDefined();
		await activeExecutions.add(executionData, executionId);
		const resumedExecution = activeExecutions.getExecutionOrFail(executionId);
		expect(resumedExecution.startedAt).toBe(waitingExecution.startedAt);
		expect(resumedExecution.responsePromise).toBe(responsePromise);
	});
	describe('finalizeExecution', () => {
		test('Should not remove a waiting execution', async () => {
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.setStatus(executionId, 'waiting');
			activeExecutions.finalizeExecution(executionId);
			await new Promise(setImmediate);
			expect(activeExecutions.getActiveExecutions()).toHaveLength(1);
			expect(activeExecutions.getStatus(executionId)).toBe('waiting');
		});
		test('Should remove an existing execution', async () => {
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.finalizeExecution(executionId);
			await new Promise(setImmediate);
			expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
		});
		test('Should not try to resolve a post-execute promise for an inactive execution', () => {
			const getExecutionSpy = jest.spyOn(activeExecutions, 'getExecutionOrFail');
			activeExecutions.finalizeExecution('inactive-execution-id', fullRunData);
			expect(getExecutionSpy).not.toHaveBeenCalled();
		});
		test('Should resolve post execute promise on removal', async () => {
			const executionId = await activeExecutions.add(executionData);
			const postExecutePromise = activeExecutions.getPostExecutePromise(executionId);
			await new Promise(setImmediate);
			activeExecutions.finalizeExecution(executionId, fullRunData);
			await expect(postExecutePromise).resolves.toEqual(fullRunData);
		});
		test('Should close response if it exists', async () => {
			executionData.httpResponse = (0, jest_mock_extended_1.mock)();
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.finalizeExecution(executionId, fullRunData);
			expect(executionData.httpResponse.end).toHaveBeenCalled();
		});
		test('Should handle error when closing response', async () => {
			const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
			activeExecutions = new active_executions_1.ActiveExecutions(
				logger,
				executionRepository,
				concurrencyControl,
			);
			executionData.httpResponse = (0, jest_mock_extended_1.mock)();
			jest.mocked(executionData.httpResponse.end).mockImplementation(() => {
				throw new Error('Connection closed');
			});
			const executionId = await activeExecutions.add(executionData);
			activeExecutions.finalizeExecution(executionId, fullRunData);
			expect(logger.error).toHaveBeenCalledWith('Error closing streaming response', {
				executionId,
				error: 'Connection closed',
			});
		});
	});
	describe('getPostExecutePromise', () => {
		test('Should throw error when trying to create a promise with invalid execution', async () => {
			await expect(activeExecutions.getPostExecutePromise(FAKE_EXECUTION_ID)).rejects.toThrow();
		});
	});
	describe('sendChunk', () => {
		test('should send chunk to response', async () => {
			executionData.httpResponse = (0, jest_mock_extended_1.mock)();
			const executionId = await activeExecutions.add(executionData);
			const testChunk = {
				content: 'test chunk',
				type: 'item',
				metadata: {
					nodeName: 'testNode',
					nodeId: (0, uuid_1.v4)(),
					runIndex: 0,
					itemIndex: 0,
					timestamp: Date.now(),
				},
			};
			activeExecutions.sendChunk(executionId, testChunk);
			expect(executionData.httpResponse.write).toHaveBeenCalledWith(
				JSON.stringify(testChunk) + '\n',
			);
		});
		test('should skip sending chunk to response if response is not set', async () => {
			const executionId = await activeExecutions.add(executionData);
			const testChunk = {
				content: 'test chunk',
				type: 'item',
				metadata: {
					nodeName: 'testNode',
					nodeId: (0, uuid_1.v4)(),
					runIndex: 0,
					itemIndex: 0,
					timestamp: Date.now(),
				},
			};
			expect(() => activeExecutions.sendChunk(executionId, testChunk)).not.toThrow();
		});
	});
	describe('stopExecution', () => {
		let executionId;
		beforeEach(async () => {
			executionId = await activeExecutions.add(executionData);
			postExecutePromise = activeExecutions.getPostExecutePromise(executionId);
			activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
			activeExecutions.attachResponsePromise(executionId, responsePromise);
		});
		test('Should cancel ongoing executions', async () => {
			activeExecutions.stopExecution(executionId);
			expect(responsePromise.reject).toHaveBeenCalledWith(
				expect.any(n8n_workflow_1.ExecutionCancelledError),
			);
			expect(workflowExecution.cancel).toHaveBeenCalledTimes(1);
			await expect(postExecutePromise).rejects.toThrow(n8n_workflow_1.ExecutionCancelledError);
		});
		test('Should cancel waiting executions', () => {
			activeExecutions.setStatus(executionId, 'waiting');
			activeExecutions.stopExecution(executionId);
			expect(responsePromise.reject).toHaveBeenCalledWith(
				expect.any(n8n_workflow_1.ExecutionCancelledError),
			);
			expect(workflowExecution.cancel).not.toHaveBeenCalled();
		});
	});
	describe('shutdown', () => {
		let newExecutionId1, newExecutionId2;
		let waitingExecutionId1, waitingExecutionId2;
		beforeEach(async () => {
			config_1.default.set('executions.mode', 'regular');
			executionRepository.createNewExecution.mockResolvedValue(
				(0, n8n_workflow_1.randomInt)(1000, 2000).toString(),
			);
			n8n_workflow_1.sleep.mockImplementation(() => {
				activeExecutions.activeExecutions = {};
			});
			newExecutionId1 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(newExecutionId1, 'new');
			activeExecutions.attachResponsePromise(newExecutionId1, responsePromise);
			newExecutionId2 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(newExecutionId2, 'new');
			waitingExecutionId1 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(waitingExecutionId1, 'waiting');
			activeExecutions.attachResponsePromise(waitingExecutionId1, responsePromise);
			waitingExecutionId2 = await activeExecutions.add(executionData);
			activeExecutions.setStatus(waitingExecutionId2, 'waiting');
		});
		test('Should cancel only executions with response-promises by default', async () => {
			const stopExecutionSpy = jest.spyOn(activeExecutions, 'stopExecution');
			expect(activeExecutions.getActiveExecutions()).toHaveLength(4);
			await activeExecutions.shutdown();
			expect(concurrencyControl.disable).toHaveBeenCalled();
			const removeAllCaptor = (0, jest_mock_extended_1.captor)();
			expect(concurrencyControl.removeAll).toHaveBeenCalledWith(removeAllCaptor);
			expect(removeAllCaptor.value.sort()).toEqual([newExecutionId1, waitingExecutionId1].sort());
			expect(stopExecutionSpy).toHaveBeenCalledTimes(2);
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId1);
			expect(stopExecutionSpy).not.toHaveBeenCalledWith(newExecutionId2);
			expect(stopExecutionSpy).not.toHaveBeenCalledWith(waitingExecutionId2);
			await new Promise(setImmediate);
			expect(activeExecutions.getActiveExecutions()).toHaveLength(0);
		});
		test('Should cancel all executions when cancelAll is true', async () => {
			const stopExecutionSpy = jest.spyOn(activeExecutions, 'stopExecution');
			expect(activeExecutions.getActiveExecutions()).toHaveLength(4);
			await activeExecutions.shutdown(true);
			expect(concurrencyControl.disable).toHaveBeenCalled();
			const removeAllCaptor = (0, jest_mock_extended_1.captor)();
			expect(concurrencyControl.removeAll).toHaveBeenCalledWith(removeAllCaptor);
			expect(removeAllCaptor.value.sort()).toEqual(
				[newExecutionId1, newExecutionId2, waitingExecutionId1, waitingExecutionId2].sort(),
			);
			expect(stopExecutionSpy).toHaveBeenCalledTimes(4);
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId1);
			expect(stopExecutionSpy).toHaveBeenCalledWith(newExecutionId2);
			expect(stopExecutionSpy).toHaveBeenCalledWith(waitingExecutionId2);
		});
	});
});
//# sourceMappingURL=active-executions.test.js.map
