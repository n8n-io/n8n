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
});
//# sourceMappingURL=execution.service.test.js.map
