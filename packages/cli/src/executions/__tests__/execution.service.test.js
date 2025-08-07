'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const config_1 = __importDefault(require('@/config'));
const aborted_execution_retry_error_1 = require('@/errors/aborted-execution-retry.error');
const missing_execution_stop_error_1 = require('@/errors/missing-execution-stop.error');
const execution_service_1 = require('@/executions/execution.service');
const scaling_service_1 = require('@/scaling/scaling.service');
describe('ExecutionService', () => {
	const scalingService = (0, backend_test_utils_1.mockInstance)(scaling_service_1.ScalingService);
	const activeExecutions = (0, jest_mock_extended_1.mock)();
	const executionRepository = (0, jest_mock_extended_1.mock)();
	const waitTracker = (0, jest_mock_extended_1.mock)();
	const concurrencyControl = (0, jest_mock_extended_1.mock)();
	const executionService = new execution_service_1.ExecutionService(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		activeExecutions,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		executionRepository,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		waitTracker,
		(0, jest_mock_extended_1.mock)(),
		concurrencyControl,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	beforeEach(() => {
		config_1.default.set('executions.mode', 'regular');
		jest.clearAllMocks();
	});
	describe('retry', () => {
		it('should error on retrying a execution that was aborted before starting', async () => {
			executionRepository.findWithUnflattenedData.mockResolvedValue(
				(0, jest_mock_extended_1.mock)({ data: { executionData: undefined } }),
			);
			const req = (0, jest_mock_extended_1.mock)();
			const retry = executionService.retry(req, []);
			await expect(retry).rejects.toThrow(
				aborted_execution_retry_error_1.AbortedExecutionRetryError,
			);
		});
	});
	describe('stop', () => {
		it('should throw when stopping a missing execution', async () => {
			executionRepository.findWithUnflattenedData.mockResolvedValue(undefined);
			const req = (0, jest_mock_extended_1.mock)({ params: { id: '1234' } });
			const stop = executionService.stop(req.params.id, []);
			await expect(stop).rejects.toThrowError(
				missing_execution_stop_error_1.MissingExecutionStopError,
			);
		});
		it('should throw when stopping a not-in-progress execution', async () => {
			const execution = (0, jest_mock_extended_1.mock)({ id: '123', status: 'success' });
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
			const stop = executionService.stop(req.params.id, [execution.id]);
			await expect(stop).rejects.toThrowError(n8n_workflow_1.WorkflowOperationError);
		});
		describe('regular mode', () => {
			it('should stop a `running` execution in regular mode', async () => {
				const execution = (0, jest_mock_extended_1.mock)({ id: '123', status: 'running' });
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopDuringRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
				const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
				await executionService.stop(req.params.id, [execution.id]);
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(waitTracker.stopExecution).not.toHaveBeenCalled();
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});
			it('should stop a `waiting` execution in regular mode', async () => {
				const execution = (0, jest_mock_extended_1.mock)({ id: '123', status: 'waiting' });
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(false);
				activeExecutions.has.mockReturnValue(true);
				waitTracker.has.mockReturnValue(true);
				executionRepository.stopDuringRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
				const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
				await executionService.stop(req.params.id, [execution.id]);
				expect(concurrencyControl.remove).not.toHaveBeenCalled();
				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
				expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
			});
			it('should stop a concurrency-controlled `new` execution in regular mode', async () => {
				const execution = (0, jest_mock_extended_1.mock)({
					id: '123',
					status: 'new',
					mode: 'trigger',
				});
				executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
				concurrencyControl.has.mockReturnValue(true);
				activeExecutions.has.mockReturnValue(false);
				waitTracker.has.mockReturnValue(false);
				executionRepository.stopBeforeRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
				const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
				await executionService.stop(req.params.id, [execution.id]);
				expect(concurrencyControl.remove).toHaveBeenCalledWith({
					mode: execution.mode,
					executionId: execution.id,
				});
				expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
				expect(waitTracker.stopExecution).not.toHaveBeenCalled();
				expect(executionRepository.stopDuringRun).not.toHaveBeenCalled();
			});
		});
		describe('scaling mode', () => {
			describe('manual execution', () => {
				it('should stop a `running` execution in scaling mode', async () => {
					config_1.default.set('executions.mode', 'queue');
					const execution = (0, jest_mock_extended_1.mock)({
						id: '123',
						mode: 'manual',
						status: 'running',
					});
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					concurrencyControl.has.mockReturnValue(false);
					activeExecutions.has.mockReturnValue(true);
					waitTracker.has.mockReturnValue(false);
					const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
					const job = (0, jest_mock_extended_1.mock)({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
					const stopInRegularModeSpy = jest.spyOn(executionService, 'stopInRegularMode');
					await executionService.stop(req.params.id, [execution.id]);
					expect(stopInRegularModeSpy).not.toHaveBeenCalled();
					expect(activeExecutions.stopExecution).toHaveBeenCalledWith(execution.id);
					expect(executionRepository.stopDuringRun).toHaveBeenCalledWith(execution);
					expect(concurrencyControl.remove).not.toHaveBeenCalled();
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
				});
			});
			describe('production execution', () => {
				it('should stop a `running` execution in scaling mode', async () => {
					config_1.default.set('executions.mode', 'queue');
					const execution = (0, jest_mock_extended_1.mock)({ id: '123', status: 'running' });
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(false);
					const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
					const job = (0, jest_mock_extended_1.mock)({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
					await executionService.stop(req.params.id, [execution.id]);
					expect(waitTracker.stopExecution).not.toHaveBeenCalled();
					expect(activeExecutions.stopExecution).toHaveBeenCalled();
					expect(scalingService.findJobsByStatus).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});
				it('should stop a `waiting` execution in scaling mode', async () => {
					config_1.default.set('executions.mode', 'queue');
					const execution = (0, jest_mock_extended_1.mock)({ id: '123', status: 'waiting' });
					executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
					waitTracker.has.mockReturnValue(true);
					const req = (0, jest_mock_extended_1.mock)({ params: { id: execution.id } });
					const job = (0, jest_mock_extended_1.mock)({ data: { executionId: execution.id } });
					scalingService.findJobsByStatus.mockResolvedValue([job]);
					executionRepository.stopDuringRun.mockResolvedValue((0, jest_mock_extended_1.mock)());
					await executionService.stop(req.params.id, [execution.id]);
					expect(waitTracker.stopExecution).toHaveBeenCalledWith(execution.id);
					expect(scalingService.findJobsByStatus).not.toHaveBeenCalled();
					expect(scalingService.stopJob).not.toHaveBeenCalled();
					expect(executionRepository.stopDuringRun).toHaveBeenCalled();
				});
			});
		});
	});
	describe('pause', () => {
		it('should pause a running execution successfully', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'running',
				finished: false,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canPause.mockReturnValue(true);
			activeExecutions.pauseExecution.mockReturnValue(true);
			activeExecutions.getExecutionStatus.mockReturnValue({
				status: 'waiting',
				currentNode: 'testNode',
			});
			const result = await executionService.pause('123', ['123']);
			expect(activeExecutions.pauseExecution).toHaveBeenCalledWith('123');
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'waiting',
			});
			expect(result.paused).toBe(true);
			expect(result.currentNodeName).toBe('testNode');
		});
		it('should throw error when execution is already finished', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'success',
				finished: true,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			await expect(executionService.pause('123', ['123'])).rejects.toThrow(
				n8n_workflow_1.WorkflowOperationError,
			);
		});
	});
	describe('resume', () => {
		it('should resume a paused execution successfully', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'waiting',
				finished: false,
				data: {
					resultData: {
						lastNodeExecuted: 'testNode',
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canResume.mockReturnValue(true);
			activeExecutions.resumeExecution.mockReturnValue(true);
			activeExecutions.getExecutionStatus.mockReturnValue({
				status: 'running',
				currentNode: 'testNode',
			});
			const result = await executionService.resume('123', ['123']);
			expect(activeExecutions.resumeExecution).toHaveBeenCalledWith('123');
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'running',
			});
			expect(result.resumed).toBe(true);
			expect(result.fromNodeName).toBe('testNode');
		});
		it('should throw error when execution is already finished', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'success',
				finished: true,
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			await expect(executionService.resume('123', ['123'])).rejects.toThrow(
				n8n_workflow_1.WorkflowOperationError,
			);
		});
	});
	describe('step', () => {
		it('should step through execution successfully', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'running',
				finished: false,
				workflowData: {
					nodes: [
						{ name: 'node1', type: 'test' },
						{ name: 'node2', type: 'test' },
					],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canStep.mockReturnValue(true);
			activeExecutions.stepExecution.mockReturnValue({
				stepsExecuted: 2,
				currentNode: 'node1',
				nextNodes: ['node2'],
			});
			const options = { steps: 2 };
			const result = await executionService.step('123', ['123'], options);
			expect(activeExecutions.stepExecution).toHaveBeenCalledWith('123', 2, undefined);
			expect(executionRepository.updateExistingExecution).toHaveBeenCalledWith('123', {
				status: 'running',
			});
			expect(result.stepsExecuted).toBe(2);
			expect(result.currentNodeName).toBe('node1');
			expect(result.nextNodeNames).toEqual(['node2']);
		});
		it('should step with specific node names', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'running',
				finished: false,
				workflowData: {
					nodes: [
						{ name: 'node1', type: 'test' },
						{ name: 'node2', type: 'test' },
					],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.canStep.mockReturnValue(true);
			activeExecutions.stepExecution.mockReturnValue({
				stepsExecuted: 1,
				currentNode: 'node1',
				nextNodes: ['node2'],
			});
			const options = { steps: 1, nodeNames: ['node2'] };
			const result = await executionService.step('123', ['123'], options);
			expect(activeExecutions.stepExecution).toHaveBeenCalledWith('123', 1, ['node2']);
			expect(result.nextNodeNames).toEqual(['node2']);
		});
	});
	describe('retryNode', () => {
		it('should retry node in active execution successfully', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'running',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test', parameters: { param1: 'value1' } }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.retryNodeExecution.mockReturnValue(true);
			const options = {
				modifiedParameters: { param1: 'newValue' },
				resetState: true,
			};
			const result = await executionService.retryNode('123', 'testNode', ['123'], options);
			expect(activeExecutions.retryNodeExecution).toHaveBeenCalledWith(
				'123',
				'testNode',
				{ param1: 'newValue' },
				true,
			);
			expect(result.retried).toBe(true);
			expect(result.nodeName).toBe('testNode');
		});
		it('should retry node in inactive execution', async () => {
			const node = { name: 'testNode', type: 'test', parameters: { param1: 'value1' } };
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'error',
				workflowData: {
					nodes: [node],
					connections: {},
				},
				data: {
					resultData: {
						runData: {
							testNode: [{ error: 'some error' }],
						},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);
			const options = {
				modifiedParameters: { param1: 'newValue' },
				resetState: true,
			};
			const result = await executionService.retryNode('123', 'testNode', ['123'], options);
			expect(node.parameters).toEqual({ param1: 'newValue' });
			expect(execution.data.resultData.runData.testNode).toBeUndefined();
			expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
			expect(result.retried).toBe(true);
		});
		it('should throw error when node not found', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				workflowData: {
					nodes: [{ name: 'otherNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			await expect(
				executionService.retryNode('123', 'nonExistentNode', ['123'], {}),
			).rejects.toThrow(n8n_workflow_1.WorkflowOperationError);
		});
	});
	describe('skipNode', () => {
		it('should skip node in active execution successfully', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'running',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.skipNodeExecution.mockReturnValue(true);
			const options = {
				mockOutputData: { result: 'mocked' },
				reason: 'Testing skip functionality',
			};
			const result = await executionService.skipNode('123', 'testNode', ['123'], options);
			expect(activeExecutions.skipNodeExecution).toHaveBeenCalledWith('123', 'testNode', {
				result: 'mocked',
			});
			expect(result.skipped).toBe(true);
			expect(result.nodeName).toBe('testNode');
		});
		it('should skip node in inactive execution', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				status: 'error',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);
			const options = {
				mockOutputData: { result: 'mocked' },
			};
			const result = await executionService.skipNode('123', 'testNode', ['123'], options);
			expect(execution.data.resultData.runData.testNode).toBeDefined();
			expect(execution.data.resultData.runData.testNode[0].data.main[0][0].json).toEqual({
				result: 'mocked',
			});
			expect(executionRepository.updateExistingExecution).toHaveBeenCalled();
			expect(result.skipped).toBe(true);
		});
	});
	describe('getNodeStatus', () => {
		it('should get node status from active execution', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				workflowData: {
					nodes: [{ name: 'testNode', type: 'test' }],
					connections: {},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(true);
			activeExecutions.getNodeExecutionStatus.mockReturnValue({
				status: 'success',
				executionTime: 150,
			});
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);
			expect(activeExecutions.getNodeExecutionStatus).toHaveBeenCalledWith('123', 'testNode');
			expect(result.status).toBe('success');
			expect(result.executionTime).toBe(150);
		});
		it('should get node status from database for inactive execution', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				data: {
					resultData: {
						runData: {
							testNode: [
								{
									executionTime: 200,
									error: undefined,
								},
							],
						},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);
			expect(result.status).toBe('completed');
			expect(result.executionTime).toBe(200);
		});
		it('should return pending status for unexecuted node', async () => {
			const execution = (0, jest_mock_extended_1.mock)({
				id: '123',
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			executionRepository.findWithUnflattenedData.mockResolvedValue(execution);
			activeExecutions.has.mockReturnValue(false);
			const result = await executionService.getNodeStatus('123', 'testNode', ['123']);
			expect(result.status).toBe('pending');
		});
	});
});
//# sourceMappingURL=execution.service.test.js.map
