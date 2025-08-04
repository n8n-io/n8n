'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const wait_tracker_1 = require('@/wait-tracker');
jest.useFakeTimers({ advanceTimers: true });
describe('WaitTracker', () => {
	const activeExecutions = (0, jest_mock_extended_1.mock)();
	const ownershipService = (0, jest_mock_extended_1.mock)();
	const workflowRunner = (0, jest_mock_extended_1.mock)();
	const executionRepository = (0, jest_mock_extended_1.mock)();
	const multiMainSetup = (0, jest_mock_extended_1.mock)();
	const instanceSettings = (0, jest_mock_extended_1.mock)({ isLeader: true, isMultiMain: false });
	const project = (0, jest_mock_extended_1.mock)({ id: 'projectId' });
	const execution = (0, jest_mock_extended_1.mock)({
		id: '123',
		finished: false,
		waitTill: new Date(Date.now() + 1000),
		mode: 'manual',
		data: (0, jest_mock_extended_1.mock)({
			pushRef: 'push_ref',
			parentExecution: undefined,
		}),
		startedAt: undefined,
	});
	execution.workflowData = (0, jest_mock_extended_1.mock)({ id: 'abcd' });
	let waitTracker;
	beforeEach(() => {
		waitTracker = new wait_tracker_1.WaitTracker(
			(0, backend_test_utils_1.mockLogger)(),
			executionRepository,
			ownershipService,
			activeExecutions,
			workflowRunner,
			instanceSettings,
		);
		multiMainSetup.on.mockReturnThis();
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('init()', () => {
		it('should query DB for waiting executions if leader', async () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
			waitTracker.init();
			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
		it('if follower, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});
		it('if no executions to start, should do nothing', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			expect(executionRepository.findSingleExecution).not.toHaveBeenCalled();
		});
		describe('if execution to start', () => {
			let startExecutionSpy;
			beforeEach(() => {
				executionRepository.findSingleExecution
					.calledWith(execution.id)
					.mockResolvedValue(execution);
				executionRepository.getWaitingExecutions.mockResolvedValue([execution]);
				ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
				startExecutionSpy = jest
					.spyOn(waitTracker, 'startExecution')
					.mockImplementation(async () => {});
				waitTracker.init();
			});
			it('if not enough time passed, should not start execution', async () => {
				await waitTracker.getWaitingExecutions();
				jest.advanceTimersByTime(100);
				expect(startExecutionSpy).not.toHaveBeenCalled();
			});
			it('if enough time passed, should start execution', async () => {
				await waitTracker.getWaitingExecutions();
				jest.advanceTimersByTime(2_000);
				expect(startExecutionSpy).toHaveBeenCalledWith(execution.id);
			});
		});
	});
	describe('startExecution()', () => {
		beforeEach(() => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			executionRepository.findSingleExecution.calledWith(execution.id).mockResolvedValue(execution);
			ownershipService.getWorkflowProjectCached.mockResolvedValue(project);
			execution.data.parentExecution = undefined;
		});
		it('should query for execution to start', async () => {
			await waitTracker.startExecution(execution.id);
			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith(execution.id, {
				includeData: true,
				unflattenData: true,
			});
			expect(workflowRunner.run).toHaveBeenCalledWith(
				{
					executionMode: execution.mode,
					executionData: execution.data,
					workflowData: execution.workflowData,
					projectId: project.id,
					pushRef: execution.data.pushRef,
				},
				false,
				false,
				execution.id,
			);
		});
		it('should also resume parent execution once sub-workflow finishes', async () => {
			const parentExecution = (0, jest_mock_extended_1.mock)({
				id: 'parent_execution_id',
				finished: false,
			});
			parentExecution.workflowData = (0, jest_mock_extended_1.mock)({ id: 'parent_workflow_id' });
			execution.data.parentExecution = {
				executionId: parentExecution.id,
				workflowId: parentExecution.workflowData.id,
			};
			executionRepository.findSingleExecution
				.calledWith(parentExecution.id)
				.mockResolvedValue(parentExecution);
			const postExecutePromise = (0, n8n_workflow_1.createDeferredPromise)();
			activeExecutions.getPostExecutePromise
				.calledWith(execution.id)
				.mockReturnValue(postExecutePromise.promise);
			await waitTracker.startExecution(execution.id);
			expect(executionRepository.findSingleExecution).toHaveBeenNthCalledWith(1, execution.id, {
				includeData: true,
				unflattenData: true,
			});
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			expect(workflowRunner.run).toHaveBeenNthCalledWith(
				1,
				{
					executionMode: execution.mode,
					executionData: execution.data,
					workflowData: execution.workflowData,
					projectId: project.id,
					pushRef: execution.data.pushRef,
				},
				false,
				false,
				execution.id,
			);
			postExecutePromise.resolve((0, jest_mock_extended_1.mock)());
			await jest.advanceTimersByTimeAsync(100);
			expect(workflowRunner.run).toHaveBeenCalledTimes(2);
			expect(workflowRunner.run).toHaveBeenNthCalledWith(
				2,
				{
					executionMode: parentExecution.mode,
					executionData: parentExecution.data,
					workflowData: parentExecution.workflowData,
					projectId: project.id,
					pushRef: parentExecution.data.pushRef,
					startedAt: parentExecution.startedAt,
				},
				false,
				false,
				parentExecution.id,
			);
		});
	});
	describe('single-main setup', () => {
		it('should start tracking', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
	});
	describe('multi-main setup', () => {
		it('should start tracking if leader', () => {
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			expect(executionRepository.getWaitingExecutions).toHaveBeenCalledTimes(1);
		});
		it('should not start tracking if follower', () => {
			const waitTracker = new wait_tracker_1.WaitTracker(
				(0, backend_test_utils_1.mockLogger)(),
				executionRepository,
				ownershipService,
				activeExecutions,
				workflowRunner,
				(0, jest_mock_extended_1.mock)({ isLeader: false, isMultiMain: false }),
			);
			executionRepository.getWaitingExecutions.mockResolvedValue([]);
			waitTracker.init();
			expect(executionRepository.getWaitingExecutions).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=wait-tracker.test.js.map
